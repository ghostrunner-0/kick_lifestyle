import path from "path";
import fs from "fs/promises";
import mime from "mime";
import { NextResponse } from "next/server";

const STORAGE_ROOT =
  process.env.PAYMENTS_DIR || path.join(process.cwd(), "payments");

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    // Catch-all segments from URL
    const param = await params;
    const requestedPath = param?.path || [];
    if (!Array.isArray(requestedPath) || requestedPath.length === 0) {
      return NextResponse.json({ error: "File path required" }, { status: 400 });
    }

    // Sanitize path segments (prevent traversal)
    const safePath = path.join(...requestedPath.map((p) => path.basename(String(p))));
    const filePath = path.join(STORAGE_ROOT, safePath);

    // Ensure file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(filePath);
    const contentType = mime.getType(filePath) || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Error serving payments file:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
