import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { isAuthenticated } from "@/lib/Authentication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function guessContentType(filename = "") {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

export async function GET(_req, { params }) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }
    const param = await params;
    const filename = param?.filename;
    if (!filename) {
      return NextResponse.json(
        { success: false, message: "Bad request" },
        { status: 400 }
      );
    }

    const abs = path.join(process.cwd(), "offline-registeration", filename);
    try {
      const buf = await fs.readFile(abs);
      const headers = new Headers({
        "Content-Type": guessContentType(filename),
        "Cache-Control": "private, max-age=0, no-store",
        "Content-Disposition": `inline; filename="${filename}"`,
      });
      return new NextResponse(buf, { status: 200, headers });
    } catch {
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );
    }
  } catch (e) {
    console.error("GET /api/admin/offline-registration/image/file error:", e);
    return NextResponse.json(
      { success: false, message: "Failed to load image" },
      { status: 500 }
    );
  }
}
