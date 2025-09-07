import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import StudentDiscount from "@/models/StudentDiscount.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Map "student-id-cards/uuid.jpg" or "/student-id-cards/uuid.jpg" to absolute path
function absFromStored(storedPath) {
  if (!storedPath) return null;
  const normalized = String(storedPath).replace(/\\/g, "/");
  const base = "student-id-cards/";
  const base2 = "/student-id-cards/";
  let fname = normalized;
  if (normalized.startsWith(base)) fname = normalized.slice(base.length);
  else if (normalized.startsWith(base2)) fname = normalized.slice(base2.length);
  fname = fname.split("/").pop(); // keep only the file name
  if (!fname) return null;
  return path.join(process.cwd(), "student-id-cards", fname);
}

export async function POST(req, { params }) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    await connectDB();
    const param = await params;
    const id = param?.id;
    const body = await req.json();
    const action = String(body?.action || "").toLowerCase(); // "approve" | "reject"

    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    const doc = await StudentDiscount.findById(id);
    if (!doc) {
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );
    }
    if ((doc.status || "pending") !== "pending") {
      return NextResponse.json(
        { success: false, message: "Already decided" },
        { status: 409 }
      );
    }

    // --- delete the private image file (if exists) ---
    const stored = doc?.idCardPhoto?.path || "";
    if (stored) {
      try {
        const abs = absFromStored(stored);
        if (abs) await fs.unlink(abs).catch(() => {});
      } catch (e) {
        // non-fatal
        console.warn("Failed deleting ID image:", e);
      }
    }

    // --- update decision fields on the doc and save ---
    const adminId = admin?._id || admin?.id || null;

    doc.status = action === "approve" ? "approved" : "rejected";
    doc.decidedAt = new Date();
    doc.decidedBy = {
      user: adminId, // ObjectId or castable string
      email: admin?.email || null,
    };

    // Now that status != pending, we can unset the field safely
    doc.idCardPhoto = undefined;

    await doc.save();

    return NextResponse.json(
      { success: true, data: { id: doc._id, status: doc.status } },
      { status: 200 }
    );
  } catch (e) {
    console.error("POST /api/admin/student-discount/[id]/decision error:", e);
    return NextResponse.json(
      { success: false, message: "Failed to decide" },
      { status: 500 }
    );
  }
}
