// app/api/admin/student-discount/image/file/[filename]/route.js
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
    // allow both admin and sales (viewer/approver roles)
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "admin not authenticated" },
        { status: 401 }
      );
    }

    const param = await params;
    const raw = param?.filename || "";
    if (!raw) {
      return NextResponse.json(
        { success: false, message: "Bad request" },
        { status: 400 }
      );
    }

    // decode + normalize slashes + strip any leading folder prefix
    let cleaned = decodeURIComponent(raw).replace(/\\/g, "/");
    cleaned = cleaned
      .replace(/^student-id-cards\//i, "")
      .replace(/^uploads\/student-discounts\//i, ""); // legacy prefix

    // take only the basename to prevent traversal
    const base = path.posix.basename(cleaned);
    if (!base || base.includes("..")) {
      return NextResponse.json(
        { success: false, message: "Bad filename" },
        { status: 400 }
      );
    }

    // primary store: /student-id-cards/<file>
    const abs = path.join(process.cwd(), "student-id-cards", base);

    try {
      const buf = await fs.readFile(abs);
      const headers = new Headers({
        "Content-Type": guessContentType(base),
        "Cache-Control": "private, max-age=0, no-store",
        "Content-Disposition": `inline; filename="${base}"`,
      });
      return new NextResponse(buf, { status: 200, headers });
    } catch {
      // optional legacy fallback: /public/uploads/student-discounts/<file>
      const legacy = path.join(
        process.cwd(),
        "public",
        "uploads",
        "student-discounts",
        base
      );
      try {
        const buf2 = await fs.readFile(legacy);
        const headers = new Headers({
          "Content-Type": guessContentType(base),
          "Cache-Control": "private, max-age=0, no-store",
          "Content-Disposition": `inline; filename="${base}"`,
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
    console.error("GET /api/admin/student-discount/image/file error:", e);
    return NextResponse.json(
      { success: false, message: "Failed to load image" },
      { status: 500 }
    );
  }
}
