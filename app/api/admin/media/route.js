import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import { connectDB } from "@/lib/DB";
import Media from "@/models/Media.model";

// Serve dynamically (disable static caching)
export const dynamic = "force-dynamic";

// Root folder for storing files (default to ./shared at project root)
const STORAGE_ROOT = process.env.UPLOAD_ROOT || path.join(process.cwd(), "shared");

// Public URL base for serving uploaded files
const PUBLIC_BASE = process.env.UPLOAD_PUBLIC_BASE || "/shared";

// Ensure storage directory exists (sync at startup)
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

// ========== GET /api/admin/media ==========
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const tagId = searchParams.get("tag");
    const search = (searchParams.get("search") || "").trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 100);
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

    // Normalize stored paths to use PUBLIC_BASE prefix
    const mapped = files.map((file) => {
      let p = file.path || "";
      if (p.startsWith("/uploads") || p.startsWith("/files")) {
        p = p.replace(/^\/(uploads|files)/, PUBLIC_BASE);
      }
      return { ...file, path: p };
    });

    return NextResponse.json({ files: mapped, total, publicBase: PUBLIC_BASE });
  } catch (err) {
    console.error("GET /api/admin/media error:", err);
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}

// ========== DELETE /api/admin/media?id=xxx ==========
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

    // Safely extract filename from media.path and build absolute path
    const filename = path.basename(media.path || "");
    const absPath = path.join(STORAGE_ROOT, filename);

    try {
      await fsp.unlink(absPath);
    } catch (e) {
      if (e.code !== "ENOENT") {
        console.warn(`Failed to delete file: ${absPath}`, e);
      } else {
        console.warn(`File not found (already deleted?): ${absPath}`);
      }
    }

    await Media.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Media deleted" });
  } catch (err) {
    console.error("DELETE /api/admin/media error:", err);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
