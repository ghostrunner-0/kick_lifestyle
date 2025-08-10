// app/files/[filename]/route.js
import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import mime from "mime";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const STORAGE_ROOT =
    process.env.UPLOAD_ROOT || path.join(process.cwd(), "storage", "uploads");
  const filePath = path.join(STORAGE_ROOT, params.filename);

  try {
    const s = await stat(filePath);
    const data = await readFile(filePath);
    const type = mime.getType(filePath) || "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(s.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
}
