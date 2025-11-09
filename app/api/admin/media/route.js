// app/api/admin/media/route.js
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { connectDB } from "@/lib/DB";

// Ensure Tag registered before Media (for populate safety)
import "@/models/Tag.model";
import Media from "@/models/Media.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public URL base for uploaded files (what you store in `Media.path`)
const PUBLIC_BASE = (process.env.UPLOAD_PUBLIC_BASE || "/shared").replace(
  /\/$/,
  ""
);

// Actual filesystem directory where files are written
const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT || path.join(process.cwd(), "public", "shared");

// Max file size per upload (default 20MB, override via env if needed)
const MAX_FILE_SIZE =
  parseInt(process.env.UPLOAD_MAX_FILE_SIZE || "", 10) || 20 * 1024 * 1024;

const isUnderPublicBase = (p) =>
  typeof p === "string" && p.startsWith(`${PUBLIC_BASE}/`);

/* -------------------------------- GET MEDIA -------------------------------- */
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const tagId = searchParams.get("tag");
    const search = (searchParams.get("search") || "").trim();
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      100
    );
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));

    const query = {};
    if (tagId && tagId !== "all") query.tags = tagId;
    if (search) query.alt = { $regex: search, $options: "i" };

    const files = await Media.find(query)
      .populate("tags", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Media.countDocuments(query);

    return NextResponse.json({ files, total, publicBase: PUBLIC_BASE });
  } catch (err) {
    console.error("GET /api/admin/media error:", err);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}

/* ------------------------------- UPLOAD MEDIA ------------------------------- */
/**
 * Accepts multipart/form-data:
 *  - files: one or many File objects
 *  - tags: tagId (single)
 *
 * Returns:
 *  { success: true, files: [MediaDoc, ...] }
 */
export async function POST(req) {
  try {
    await connectDB();

    const formData = await req.formData();
    const tagId = formData.get("tags");
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files received." },
        { status: 400 }
      );
    }

    if (!tagId) {
      return NextResponse.json(
        { success: false, error: "Tag is required." },
        { status: 400 }
      );
    }

    await fs.mkdir(UPLOAD_ROOT, { recursive: true });

    const saved = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `File "${file.name}" exceeds ${Math.round(
              MAX_FILE_SIZE / (1024 * 1024)
            )}MB limit.`,
          },
          { status: 413 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const originalName = file.name || "upload";
      const extFromName = path.extname(originalName);
      const safeExt = extFromName && extFromName.length <= 8 ? extFromName : "";

      const unique = crypto.randomBytes(8).toString("hex");
      const filename = `${Date.now()}-${unique}${safeExt}`;
      const relPath = `${PUBLIC_BASE}/${filename}`;
      const absPath = path.join(UPLOAD_ROOT, filename);

      await fs.writeFile(absPath, buffer);

      const doc = await Media.create({
        path: relPath,
        alt: originalName,
        tags: [tagId],
      });

      saved.push(doc);
    }

    return NextResponse.json({ success: true, files: saved });
  } catch (err) {
    console.error("POST /api/admin/media error:", err);
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}

/* ------------------------------- DELETE MEDIA ------------------------------- */
export async function DELETE(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing media ID" }, { status: 400 });
    }

    const media = await Media.findById(id);
    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const p = media.path || "";

    // Delete local file only if it’s ours (under PUBLIC_BASE)
    if (isUnderPublicBase(p)) {
      const filename = p.slice(PUBLIC_BASE.length + 1); // remove "/shared/"
      const abs = path.join(UPLOAD_ROOT, filename);
      try {
        await fs.unlink(abs);
      } catch (e) {
        if (e.code !== "ENOENT") {
          console.warn("File delete warning:", e.message);
        }
      }
    }

    await Media.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Media deleted" });
  } catch (err) {
    console.error("DELETE /api/admin/media error:", err);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
