export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import ServiceIssue from "@/models/ServiceIssue.model";

const json = (ok, status, payload) =>
  NextResponse.json(
    ok ? { success: true, data: payload } : { success: false, message: payload },
    { status }
  );

const trim = (v) => (typeof v === "string" ? v.trim() : v);

export async function GET(_req, { params }) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return json(false, 401, "admin not authenticated");

    await connectDB();
    const id = String(params?.id || "");
    if (!mongoose.isValidObjectId(id)) return json(false, 400, "Invalid id");

    const doc = await ServiceIssue.findById(id).lean();
    if (!doc) return json(false, 404, "Issue not found");

    return json(true, 200, doc);
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}

export async function PUT(req, { params }) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return json(false, 401, "admin not authenticated");

    await connectDB();

    const id = String(params?.id || "");
    if (!mongoose.isValidObjectId(id)) return json(false, 400, "Invalid id");

    const body = await req.json().catch(() => ({}));

    const patch = {};
    if (body?.categoryId !== undefined) {
      patch.categoryId = body.categoryId && mongoose.isValidObjectId(body.categoryId)
        ? new mongoose.Types.ObjectId(body.categoryId)
        : null;
    }
    if (body?.categoryName !== undefined) patch.categoryName = trim(body.categoryName);
    if (body?.issueName !== undefined) patch.issueName = trim(body.issueName);
    if (body?.active !== undefined) patch.active = !!body.active;
    patch.updatedAt = new Date();

    if (Object.keys(patch).length <= 1) return json(false, 400, "Nothing to update");

    try {
      const updated = await ServiceIssue.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
      if (!updated) return json(false, 404, "Issue not found");
      return json(true, 200, updated);
    } catch (err) {
      if (err?.code === 11000) return json(false, 409, "Issue already exists for this category");
      throw err;
    }
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}

export async function DELETE(_req, { params }) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return json(false, 401, "admin not authenticated");

    await connectDB();

    const id = String(params?.id || "");
    if (!mongoose.isValidObjectId(id)) return json(false, 400, "Invalid id");

    const deleted = await ServiceIssue.findByIdAndDelete(id).lean();
    if (!deleted) return json(false, 404, "Issue not found");

    return json(true, 200, { _id: id });
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}
