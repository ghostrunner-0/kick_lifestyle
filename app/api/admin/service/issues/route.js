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

const parseSort = (s) => {
  // supports "updatedAt:desc" or "issueName:asc"
  const out = {};
  const val = String(s || "").trim();
  if (!val) return { updatedAt: -1 };
  const [field, dir] = val.split(":");
  if (!field) return { updatedAt: -1 };
  out[field] = String(dir || "desc").toLowerCase() === "asc" ? 1 : -1;
  return out;
};

export async function GET(req) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return json(false, 401, "admin not authenticated");

    await connectDB();

    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const q = trim(searchParams.get("q") || "");
    const sortQ = parseSort(searchParams.get("sort") || "updatedAt:desc");

    const activeParam = searchParams.get("active"); // "true" | "false" | null
    const filter = {};
    if (activeParam === "true") filter.active = true;
    else if (activeParam === "false") filter.active = false;

    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ categoryName: rx }, { issueName: rx }];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ServiceIssue.find(filter).sort(sortQ).skip(skip).limit(limit).lean(),
      ServiceIssue.countDocuments(filter),
    ]);

    return json(true, 200, { items, total, page, limit });
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}

export async function POST(req) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return json(false, 401, "admin not authenticated");

    await connectDB();

    const body = await req.json().catch(() => ({}));

    const categoryId = body?.categoryId && mongoose.isValidObjectId(body.categoryId)
      ? new mongoose.Types.ObjectId(body.categoryId)
      : null;

    const categoryName = trim(body?.categoryName);
    const issueName = trim(body?.issueName);
    const active = body?.active === false ? false : true;

    if (!categoryName) return json(false, 400, "categoryName is required");
    if (!issueName) return json(false, 400, "issueName is required");

    try {
      const created = await ServiceIssue.create({
        categoryId,
        categoryName,
        issueName,
        active,
      });
      return json(true, 201, created.toObject());
    } catch (err) {
      // unique index on {categoryName, issueName}
      if (err?.code === 11000) return json(false, 409, "Issue already exists for this category");
      throw err;
    }
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}
