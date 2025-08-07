import { connectDB } from "@/lib/DB";
import Media from "@/models/Media.model";
import path from "path";
import fs from "fs";
import fsp from "fs/promises"; // for async file deletion
import { NextResponse } from "next/server";

// Ensure upload directory exists
const uploadDir = path.resolve("./public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ========== GET /api/admin/media ==========
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const tagId = searchParams.get("tag");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = parseInt(searchParams.get("skip")) || 0;

    const query = {};

    if (tagId && tagId !== "all") {
      query.tags = tagId;
    }

    if (search && search.trim() !== "") {
      query.alt = { $regex: search.trim(), $options: "i" };
    }

    const files = await Media.find(query)
      .populate("tags", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Media.countDocuments(query);

    return NextResponse.json({ files, total });
  } catch (err) {
    console.error("GET /api/admin/media error:", err);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    );
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

    const fullPath = path.join(process.cwd(), "public", media.path);
    await fsp.unlink(fullPath).catch(() => {
      console.warn("File not found:", fullPath);
    });

    await Media.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Media deleted" });
  } catch (err) {
    console.error("DELETE /api/admin/media error:", err);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
