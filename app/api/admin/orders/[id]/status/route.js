// app/api/admin/orders/[id]/status/route.js
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

export async function POST(req, { params }) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return response(false, 401, "admin not authenticated");

    await connectDB();

    const id = (await params)?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid order id");
    }

    const { status } = await req.json();
    if (!ALLOWED_STATUSES.includes(status)) {
      return response(false, 400, "Invalid status");
    }

    const updated = await Order.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    ).lean();

    if (!updated) return response(false, 404, "Order not found");

    return NextResponse.json({ success: true, data: { order: updated } });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
