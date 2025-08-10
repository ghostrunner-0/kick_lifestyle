import path from "path";
import fs from "fs/promises";
import mime from "mime";
import { NextResponse } from "next/server";

const STORAGE_ROOT =
  process.env.UPLOAD_ROOT || path.join(process.cwd(), "shared");

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    // Get requested file path segments (catch all route)
    const param = await params;
    const requestedPath = param.path || [];
    if (requestedPath.length === 0) {
      return NextResponse.json(
        { error: "File path required" },
        { status: 400 }
      );
    }

    // Prevent directory traversal attack by sanitizing path
    const safePath = path.join(...requestedPath.map((p) => path.basename(p)));

    const filePath = path.join(STORAGE_ROOT, safePath);

    // Check if file exists
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
    console.error("Error serving file:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
