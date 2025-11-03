// app/api/admin/student-discount/[id]/decision/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import StudentDiscount from "@/models/StudentDiscount.model";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import User from "@/models/User.model";

import { sendMail } from "@/lib/sendMail.js";

export const revalidate = 0;

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
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "admin not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    // who decided (best-effort)
    let decidedBy = { user: null, email: null };
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        const u = await User.findOne({
          email: session.user.email,
          deletedAt: null,
        })
          .select("_id email")
          .lean();
        if (u) decidedBy = { user: u._id, email: u.email };
      }
    } catch {}

    const id = (await params)?.id;
    const body = await req.json().catch(() => ({}));
    const act = String(body?.action || "").toLowerCase(); // "approve" | "reject"
    const emailFromClient = String(body?.email || "")
      .trim()
      .toLowerCase(); // optional

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

    // delete private image after decision
    const stored = doc?.idCardPhoto?.path || "";
    if (stored) {
      try {
        const abs = absFromStored(stored);
        if (abs) await fs.unlink(abs).catch(() => {});
      } catch (e) {
        console.warn("Failed deleting ID image:", e);
      }
    }

    // update decision
    doc.status = act === "approve" ? "approved" : "rejected";
    doc.decidedAt = new Date();
    doc.decidedBy = decidedBy;
    doc.idCardPhoto = undefined;
    await doc.save();

    // ---------- EMAIL: approve only, try client email first, then DB -----------
    let mail = { attempted: false, ok: false, tried: [], message: null };

    async function attempt(toEmail) {
      if (!toEmail) return { ok: false, message: "Missing email" };
      const templateId =
        parseInt(process.env.BREVO_TEMPLATE_ID_STUDENT_APPROVED ?? "", 10) || 4;
      if (!templateId) return { ok: false, message: "Missing template id" };

      const name =
        doc.name || doc.fullName || doc.firstName || doc.studentName || "there";

      const res = await sendMail(
        "Student Discount Approved",
        toEmail,
        { name }, // {{ params.name }} in Brevo template
        { templateId, tags: ["student-discount-approved"] }
      );
      return { ok: !!res?.success, message: res?.message || null };
    }

    if (doc.status === "approved") {
      // Try email from client (if provided)
      if (emailFromClient) {
        mail.attempted = true;
        mail.tried.push(emailFromClient);
        const r1 = await attempt(emailFromClient);
        mail.ok = r1.ok;
        if (!r1.ok)
          mail.message = `Client email failed: ${r1.message || "unknown"}`;
      }

      // If not provided or failed, re-fetch from DB and try doc.email
      if (!mail.ok) {
        const fresh = await StudentDiscount.findById(id)
          .select("email name")
          .lean();
        const fallback = String(fresh?.email || doc.email || "").toLowerCase();
        if (fallback && !mail.tried.includes(fallback)) {
          mail.tried.push(fallback);
          const r2 = await attempt(fallback);
          // preserve earlier failure note, append if needed
          if (!r2.ok) {
            mail.message =
              (mail.message ? mail.message + " | " : "") +
              `DB email failed: ${r2.message || "unknown"}`;
          }
          mail.ok = r2.ok;
          mail.attempted = true;
        } else if (!fallback) {
          mail.message =
            (mail.message ? mail.message + " | " : "") + "No email in DB";
          mail.attempted = true;
        }
      }
    }
    // -------------------------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        data: { id: doc._id, status: doc.status },
        ...(mail.attempted ? { mail } : {}),
      },
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
