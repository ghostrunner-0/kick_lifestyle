// app/api/admin/service/hisab/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import ServiceHisab from "@/models/ServiceHisab.model";

const ok  = (data, status = 200) => NextResponse.json({ success: true, data }, { status });
const bad = (msg,  status = 400) => NextResponse.json({ success: false, message: msg }, { status });

/** GET /api/admin/service/hisab
 *  Query:
 *   - docModel=ServiceRequestOnline|ServiceRequestOffline
 *   - doc=<id>
 *   - kind=expense|settlement
 *   - expenseType=shipping|repair
 *   - from=YYYY-MM-DD
 *   - to=YYYY-MM-DD
 *   - page, limit
 */
export async function GET(req) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return bad("admin not authenticated", 401);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = {};
    const docModel = searchParams.get("docModel");
    const doc = searchParams.get("doc");
    const kind = searchParams.get("kind");
    const expenseType = searchParams.get("expenseType");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));

    if (docModel) q.docModel = docModel;
    if (doc && mongoose.isValidObjectId(doc)) q.doc = new mongoose.Types.ObjectId(doc);
    if (kind) q.kind = kind;
    if (expenseType) q.expenseType = expenseType;
    if (from || to) {
      q.when = {};
      if (from) q.when.$gte = new Date(from);
      if (to) q.when.$lte = new Date(to);
    }

    const total = await ServiceHisab.countDocuments(q);
    const items = await ServiceHisab.find(q)
      .sort({ when: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return ok({ items, total, page, limit });
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}

/** POST /api/admin/service/hisab
 *  Body:
 *  {
 *    docModel: "ServiceRequestOnline" | "ServiceRequestOffline",
 *    doc: "<serviceRequestId>",
 *    kind: "expense" | "settlement",
 *    expenseType?: "shipping" | "repair",   // required if kind="expense"
 *    amount: number,
 *    when?: ISO date,
 *    note?: string
 *  }
 */
export async function POST(req) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return bad("admin not authenticated", 401);
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { docModel, doc, kind, expenseType, amount, when, note } = body || {};

    if (!docModel || !doc) return bad("docModel & doc are required");
    if (!mongoose.isValidObjectId(doc)) return bad("Invalid doc id");
    if (!kind) return bad("kind required");
    if (!(Number(amount) > 0)) return bad("amount must be > 0");

    // For expense, expenseType must be provided (shipping|repair)
    if (kind === "expense" && !expenseType) return bad("expenseType required for expense");

    const created = await ServiceHisab.create({
      docModel,
      doc,
      kind,
      expenseType: kind === "expense" ? expenseType : null,
      amount: Number(amount),
      when: when ? new Date(when) : new Date(),
      note: note || "",
      createdBy: admin?._id || admin?.id,
    });

    return ok(created, 201);
  } catch (e) {
    return bad(e?.message || "Server error", 500);
  }
}
