// app/api/upload/route.js
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

import { connectDB } from "@/lib/DB";

// ✅ Ensure Tag is registered before Media (prevents MissingSchemaError on populate)
import "@/models/Tag.model";
import Media from "@/models/Media.model";
import Tag from "@/models/Tag.model";

// ⬇ install in your project:  npm i @vercel/blob
import { put as blobPut } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IS_PROD = !!process.env.VERCEL;

const DEV_STORAGE_ROOT =
  process.env.UPLOAD_ROOT || path.join(process.cwd(), "shared");
const PUBLIC_BASE = (process.env.UPLOAD_PUBLIC_BASE || "/shared").replace(
  /\/$/,
  ""
);

// optional: restrict to images if you want
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
]);

const nowYM = () => {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export async function POST(req) {
  try {
    await connectDB();

    const formData = await req.formData();
    const files = formData.getAll("files");
    const tagIdsRaw = formData.get("tags");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (!tagIdsRaw) {
      return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    const tagIds = String(tagIdsRaw)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    // verify tags exist
    const existingTags = await Tag.find({ _id: { $in: tagIds } }).select("_id");
    if (existingTags.length !== tagIds.length) {
      return NextResponse.json(
        { error: "Some tags not found." },
        { status: 400 }
      );
    }

    const ym = nowYM();
    const uploadedMedia = [];

    for (const file of files) {
      if (!file || typeof file.arrayBuffer !== "function") continue;

      const type = file.type || "application/octet-stream";
      if (ALLOWED.size && !ALLOWED.has(type)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${type}` },
          { status: 415 }
        );
      }

      const origName = file.name || "upload";
      const extFromName = path.extname(origName); // includes dot if present
      const ext =
        extFromName ||
        ({
          "image/png": ".png",
          "image/jpeg": ".jpg",
          "image/webp": ".webp",
          "image/avif": ".avif",
          "image/gif": ".gif",
          "image/svg+xml": ".svg",
        }[type] || ".bin");

      const base = uuidv4();
      const filename = `${base}${ext}`;

      let storedPath; // what we'll store in DB (public URL or /shared/... path)
      let sizeNum = file.size ?? null;

      if (IS_PROD) {
        // ✅ PRODUCTION: persist to Vercel Blob (public)
        // Requires env var: BLOB_READ_WRITE_TOKEN in Vercel
        const key = `uploads/${ym}/${filename}`;
        const blob = await blobPut(key, file, {
          access: "public",
          contentType: type,
          cacheControlMaxAge: 31536000, // 1y
        });
        storedPath = blob.url; // public URL
        // blob.size may not be set; rely on file.size if available
      } else {
        // 🛠 DEV: save to local ./shared
        const buf = Buffer.from(await file.arrayBuffer());
        sizeNum = buf.length;

        const destDir = path.join(DEV_STORAGE_ROOT, ym);
        await fs.mkdir(destDir, { recursive: true });

        const absPath = path.join(destDir, filename);
        await fs.writeFile(absPath, buf);

        // public path that your app serves locally
        storedPath = `${PUBLIC_BASE}/${ym}/${filename}`;
      }

      const doc = new Media({
        filename: origName,
        path: storedPath,
        mimeType: type,
        size: sizeNum,
        alt: origName,
        tags: tagIds,
      });

      await doc.save();
      uploadedMedia.push(doc);
    }

    return NextResponse.json({ success: true, media: uploadedMedia });
  } catch (err) {
    console.error("Upload Error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
