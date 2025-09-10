// app/api/admin/student-discount/[id]/decision/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import StudentDiscount from "@/models/StudentDiscount.model";

// pull session user to record decidedBy
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import User from "@/models/User.model";

export const revalidate = 0;

// Map "student-id-cards/uuid.jpg" or "/student-id-cards/uuid.jpg" to absolute path
function absFromStored(storedPath) {
  if (!storedPath) return null;
  const normalized = String(storedPath).replace(/\\/g, "/");
  const base1 = "student-id-cards/";
  const base2 = "/student-id-cards/";
  let fname = normalized;
  if (normalized.startsWith(base1)) fname = normalized.slice(base1.length);
  else if (normalized.startsWith(base2)) fname = normalized.slice(base2.length);
  fname = fname.split("/").pop();
  if (!fname) return null;
  return path.join(process.cwd(), "student-id-cards", fname);
}

export async function POST(req, { params }) {
  try {
    // allow admin + sales
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "admin not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    // who is deciding? (best-effort)
    let decidedBy = { user: null, email: null };
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        const u = await User.findOne({ email: session.user.email, deletedAt: null })
          .select("_id email")
          .lean();
        if (u) decidedBy = { user: u._id, email: u.email };
      }
    } catch {
      // non-fatal; keep decidedBy as nulls
    }

    const id = (await params)?.id;
    const { action } = await req.json().catch(() => ({}));
    const act = String(action || "").toLowerCase(); // "approve" | "reject"

    if (!id || !["approve", "reject"].includes(act)) {
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

    // delete the private image file (if exists)
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

    // update decision fields
    doc.status = act === "approve" ? "approved" : "rejected";
    doc.decidedAt = new Date();
    doc.decidedBy = decidedBy; // { user: ObjectId|null, email: string|null }
    doc.idCardPhoto = undefined; // scrub original upload after decision

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
