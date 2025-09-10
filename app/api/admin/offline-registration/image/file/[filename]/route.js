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
  if (ext === ".jpeg" || ext === ".jpg") return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(_req, { params }) {
  try {
    // ✅ allow admin + sales
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "admin not authenticated" },
        { status: 401 }
      );
    }

    const { filename } = params || {};
    if (!filename) {
      return NextResponse.json(
        { success: false, message: "Bad request" },
        { status: 400 }
      );
    }

    // 🔒 sanitize to prevent path traversal
    const safe = path.basename(String(filename));

    // Prefer the correctly spelled folder; fall back to legacy typo if needed
    const basePrimary = path.join(process.cwd(), "offline-registration");
    const baseLegacy  = path.join(process.cwd(), "offline-registeration"); // legacy

    let abs = path.join(basePrimary, safe);
    try {
      const buf = await fs.readFile(abs);
      const headers = new Headers({
        "Content-Type": guessContentType(safe),
        "Cache-Control": "private, max-age=0, no-store",
        "Content-Disposition": `inline; filename="${safe}"`,
      });
      return new NextResponse(buf, { status: 200, headers });
    } catch (e) {
      // try legacy folder
      try {
        abs = path.join(baseLegacy, safe);
        const buf2 = await fs.readFile(abs);
        const headers = new Headers({
          "Content-Type": guessContentType(safe),
          "Cache-Control": "private, max-age=0, no-store",
          "Content-Disposition": `inline; filename="${safe}"`,
        });
        return new NextResponse(buf2, { status: 200, headers });
      } catch {
        return NextResponse.json(
          { success: false, message: "Not found" },
          { status: 404 }
        );
      }
    }
  } catch (e) {
    console.error("GET /api/admin/offline-registration/image/file error:", e);
    return NextResponse.json(
      { success: false, message: "Failed to load image" },
      { status: 500 }
    );
  }
}
