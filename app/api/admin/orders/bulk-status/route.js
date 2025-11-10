// app/api/admin/orders/bulk-status/route.js
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import Order from "@/models/Orders.model";
import { ORDER_STATUSES } from "@/lib/constants/orderStatus";

// Use a Set for O(1) validation
const ALLOWED_STATUSES = new Set(ORDER_STATUSES);

export async function POST(req) {
  try {
    // allow admin & sales
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff) {
      return response(false, 401, "admin not authenticated");
    }

    await connectDB();

    const body = (await req.json().catch(() => null)) || {};
    let { ids, status } = body;

    // validate status
    const nextStatus = typeof status === "string" ? status.trim() : "";
    if (!nextStatus || !ALLOWED_STATUSES.has(nextStatus)) {
      return response(false, 400, "Invalid status");
    }

    // validate & normalize ids
    const validIds = Array.isArray(ids)
      ? [...new Set(ids.map(String))].filter((x) => mongoose.isValidObjectId(x))
      : [];

    if (!validIds.length) {
      return response(false, 400, "No valid ids");
    }

    // bulk update
    const result = await Order.updateMany(
      { _id: { $in: validIds } },
      {
        $set: {
          status: nextStatus,
        },
      }
    );

    const matched =
      typeof result.matchedCount === "number"
        ? result.matchedCount
        : result.n || 0;

    const modified =
      typeof result.modifiedCount === "number"
        ? result.modifiedCount
        : result.nModified || 0;

    return response(true, 200, {
      matched,
      modified,
      status: nextStatus,
    });
  } catch (e) {
    console.error("POST /api/admin/orders/bulk-status error:", e);
    return response(false, 500, e?.message || "Server error");
  }
}
