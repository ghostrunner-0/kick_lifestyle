// app/api/upload/route.js
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

import { connectDB } from "@/lib/DB";
// ✅ register Tag before Media for safe populate
import "@/models/Tag.model";
import Media from "@/models/Media.model";
import Tag from "@/models/Tag.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Storage driver:
 * - Explicit via STORAGE_DRIVER=fs|s3|blob
 * - Else auto: blob if token, else s3 if bucket, else fs
 */
const STORAGE_DRIVER =
  process.env.STORAGE_DRIVER ||
  (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : (process.env.S3_BUCKET ? "s3" : "fs"));

/** FS config (self-host)
 * Use public/shared so files are served at /shared/...
 */
const FS_ROOT = process.env.UPLOAD_ROOT || path.join(process.cwd(), "public", "shared");
const PUBLIC_BASE = (process.env.UPLOAD_PUBLIC_BASE || "/shared").replace(/\/$/, "");

/** S3 / R2 / Spaces / MinIO */
const S3_BUCKET = process.env.S3_BUCKET || "";
const S3_REGION = process.env.S3_REGION || "auto";
const S3_ENDPOINT = process.env.S3_ENDPOINT || ""; // e.g. https://<account>.r2.cloudflarestorage.com
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || "";
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || "";
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === "1"; // MinIO=true
const S3_ACL = process.env.S3_ACL || ""; // e.g. public-read
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL || ""; // CDN/base URL, optional

/** Allowed types */
const ALLOWED = new Set([
  "image/png", "image/jpeg", "image/webp", "image/avif", "image/gif", "image/svg+xml",
]);

const ym = () => {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

async function putFS(file, key, mime) {
  const buf = Buffer.from(await file.arrayBuffer());
  const abs = path.join(FS_ROOT, key);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf);
  return { url: `${PUBLIC_BASE}/${key}`.replace(/\/{2,}/g, "/"), size: buf.length };
}
async function putS3(file, key, mime) {
  let S3Client, PutObjectCommand;
  try {
    const aws = await import("@aws-sdk/client-s3");
    S3Client = aws.S3Client;
    PutObjectCommand = aws.PutObjectCommand;
  } catch {
    throw new Error("Missing @aws-sdk/client-s3. Install it or set STORAGE_DRIVER=fs/blob.");
  }
  if (!S3_BUCKET) throw new Error("S3_BUCKET not set");

  const body = Buffer.from(await file.arrayBuffer());
  const client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT || undefined,
    forcePathStyle: S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  await client.send(new PutObjectCommand({
    Bucket: S3_BUCKET, Key: key, Body: body, ContentType: mime, ...(S3_ACL ? { ACL: S3_ACL } : {}),
  }));

  let url = "";
  if (S3_PUBLIC_BASE_URL) {
    url = `${S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  } else if ((S3_ENDPOINT || "").includes("amazonaws.com")) {
    url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
  } else if (S3_ENDPOINT) {
    const base = S3_ENDPOINT.replace(/\/$/, "");
    url = S3_FORCE_PATH_STYLE ? `${base}/${S3_BUCKET}/${key}` : `${base}/${key}`;
  } else {
    url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
  }
  return { url, size: body.length };
}
async function putBlob(file, key, mime) {
  let put;
  try {
    ({ put } = await import("@vercel/blob"));
  } catch {
    throw new Error("Missing @vercel/blob. Install it or set STORAGE_DRIVER=fs/s3.");
  }
  const blob = await put(key, file, { access: "public", contentType: mime, cacheControlMaxAge: 31536000 });
  return { url: blob.url, size: file.size ?? null };
}

export async function POST(req) {
  try {
    await connectDB();

    const form = await req.formData();
    const files = form.getAll("files");
    const tagIdsRaw = form.get("tags");

    if (!files?.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });
    if (!tagIdsRaw)   return NextResponse.json({ error: "Tag is required" }, { status: 400 });

    const tagIds = String(tagIdsRaw).split(",").map(s => s.trim()).filter(Boolean);
    const existing = await Tag.find({ _id: { $in: tagIds } }).select("_id");
    if (existing.length !== tagIds.length) {
      return NextResponse.json({ error: "Some tags not found." }, { status: 400 });
    }

    const baseDir = `uploads/${ym()}`;
    const outDocs = [];

    for (const file of files) {
      if (!file || typeof file.arrayBuffer !== "function") continue;

      const mime = file.type || "application/octet-stream";
      if (ALLOWED.size && !ALLOWED.has(mime)) {
        return NextResponse.json({ error: `Unsupported file type: ${mime}` }, { status: 415 });
      }

      const extFromName = path.extname(file.name || "");
      const ext = extFromName || ({
        "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp",
        "image/avif": ".avif", "image/gif": ".gif", "image/svg+xml": ".svg",
      }[mime] || ".bin");

      const key = `${baseDir}/${uuidv4()}${ext}`;
      let uploaded;

      if (STORAGE_DRIVER === "blob") uploaded = await putBlob(file, key, mime);
      else if (STORAGE_DRIVER === "s3") uploaded = await putS3(file, key, mime);
      else uploaded = await putFS(file, key, mime); // fs

      const doc = new Media({
        filename: file.name || `upload${ext}`,
        path: uploaded.url,  // public URL or /shared/... path
        mimeType: mime,
        size: uploaded.size,
        alt: file.name || "upload",
        tags: tagIds,
      });
      await doc.save();
      outDocs.push(doc);
    }

    return NextResponse.json({ success: true, media: outDocs });
  } catch (err) {
    console.error("Upload Error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
