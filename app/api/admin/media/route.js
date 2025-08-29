// app/api/admin/media/route.js
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { connectDB } from "@/lib/DB";

// Ensure Tag registered before Media (for populate safety)
import "@/models/Tag.model";
import Media from "@/models/Media.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_BASE = (process.env.UPLOAD_PUBLIC_BASE || "/shared").replace(/\/$/, "");
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(process.cwd(), "public", "shared");

const isUnderPublicBase = (p) => typeof p === "string" && p.startsWith(`${PUBLIC_BASE}/`);

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const tagId = searchParams.get("tag");
    const search = (searchParams.get("search") || "").trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);
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
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing media ID" }, { status: 400 });

    const media = await Media.findById(id);
    if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });

    const p = media.path || "";

    // Delete local file only if it’s ours (under /shared)
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
