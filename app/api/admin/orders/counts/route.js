// app/api/admin/orders/counts/route.js
export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import Order from "@/models/Orders.model";

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

export async function GET() {
  try {
    // ✅ allow both admin and sales to view order counts
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) return response(false, 401, "admin not authenticated");

    await connectDB();

    // one round-trip to DB, then normalize to include zeroes
    const agg = await Order.aggregate([
      { $match: { status: { $in: ALLOWED_STATUSES } } },
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]);

    const counts = Object.fromEntries(ALLOWED_STATUSES.map((s) => [s, 0]));
    for (const row of agg) counts[row._id] = row.n ?? 0;

    return response(true, 200, { counts });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
