// app/api/upload/route.js
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

import { connectDB } from "@/lib/DB";
// Ensure Tag is registered before Media (for populate safety)
import "@/models/Tag.model";
import Media from "@/models/Media.model";
import Tag from "@/models/Tag.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Local FS config (VPS):
 * Files live in ./public/shared so Next serves them at /shared/*
 */
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(process.cwd(), "public", "shared");
const PUBLIC_BASE = (process.env.UPLOAD_PUBLIC_BASE || "/shared").replace(/\/$/, "");

/** Allowed mimetypes */
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
]);

const EXT_FROM_MIME = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

export async function POST(req) {
  try {
    await connectDB();

    const form = await req.formData();

    // accept "files" (multi) or "file" (single)
    let files = form.getAll("files");
    if (!files?.length) {
      const single = form.get("file");
      if (single) files = [single];
    }

    const tagIdsRaw = form.get("tags"); // comma separated optional
    const tagIds = (tagIdsRaw ? String(tagIdsRaw) : "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!files?.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Optional: verify tags exist (skip if no tags provided)
    if (tagIds.length > 0) {
      const existing = await Tag.find({ _id: { $in: tagIds } }).select("_id");
      if (existing.length !== tagIds.length) {
        return NextResponse.json({ error: "Some tags not found." }, { status: 400 });
      }
    }

    // Ensure destination exists
    await fs.mkdir(UPLOAD_ROOT, { recursive: true });

    const outDocs = [];

    for (const file of files) {
      if (!file || typeof file.arrayBuffer !== "function") continue;

      const mime = file.type || "application/octet-stream";
      if (ALLOWED.size && !ALLOWED.has(mime)) {
        return NextResponse.json({ error: `Unsupported file type: ${mime}` }, { status: 415 });
      }

      const origName = file.name || "upload";
      const extFromName = path.extname(origName);
      const ext = extFromName || EXT_FROM_MIME[mime] || ".bin";
      const basename = `${uuidv4()}${ext}`;

      const abs = path.join(UPLOAD_ROOT, basename);
      const buf = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(abs, buf);

      const publicPath = `${PUBLIC_BASE}/${basename}`.replace(/\/{2,}/g, "/");

      const doc = await Media.create({
        filename: origName,
        path: publicPath,       // e.g. /shared/uuid.png
        mimeType: mime,
        size: buf.length,
        alt: origName,
        tags: tagIds,
      });

      outDocs.push(doc);
    }

    return NextResponse.json({ success: true, media: outDocs });
  } catch (err) {
    console.error("Upload Error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
