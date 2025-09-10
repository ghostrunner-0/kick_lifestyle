// app/api/admin/orders/[id]/status/route.js
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import Order from "@/models/Orders.model";

const ALLOWED_STATUSES = new Set([
  "processing",
  "pending payment",
  "payment Not Verified",
  "Invalid Payment",
  "cancelled",
  "completed",
  "ready to pack",
  "ready to ship",
]);

export async function POST(req, { params }) {
  try {
    // ✅ await + allow both admin and sales
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) return response(false, 401, "admin not authenticated");

    await connectDB();

    // ✅ no await on params; also validate ObjectId correctly
    const id = String(params?.id || "");
    if (!mongoose.isValidObjectId(id)) {
      return response(false, 400, "Invalid order id");
    }

    const body = await req.json().catch(() => ({}));
    const status = body?.status;

    if (typeof status !== "string" || !ALLOWED_STATUSES.has(status)) {
      return response(false, 400, "Invalid status");
    }

    const updated = await Order.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    ).lean();

    if (!updated) return response(false, 404, "Order not found");

    // ✅ keep the same shape as your other routes
    return response(true, 200, { order: updated });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
