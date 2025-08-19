// app/api/admin/orders/bulk-status/route.js
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import Order from "@/models/Orders.model";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = [
  "processing",
  "pending payment",
  "payment Not Verified",
  "Invalid Payment",
  "cancelled",
  "completed",
  "ready to pack",
  "ready to ship",
];

export async function POST(req) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return response(false, 401, "admin not authenticated");

    await connectDB();

    const body = await req.json();
    let { ids, status } = body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return response(false, 400, "No ids provided");
    }
    if (!ALLOWED_STATUSES.includes(status)) {
      return response(false, 400, "Invalid status");
    }

    // validate ids
    ids = ids.filter((x) => mongoose.Types.ObjectId.isValid(String(x)));
    if (ids.length === 0) return response(false, 400, "No valid ids");

    const res = await Order.updateMany(
      { _id: { $in: ids } },
      { $set: { status } }
    );

    return NextResponse.json({
      success: true,
      data: { matched: res.matchedCount || res.n, modified: res.modifiedCount || res.nModified },
    });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
