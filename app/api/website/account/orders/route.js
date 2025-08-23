// app/api/account/orders/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/DB";
import User from "@/models/User.model";
import Order from "@/models/Orders.model";
import { response, catchError } from "@/lib/helperFunctions";

export const dynamic = "force-dynamic";

/**
 * GET /api/account/orders?limit=10&page=1
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return response(false, 401, "Unauthorized");
    }

    await connectDB();

    const me = await User.findOne({
      email: session.user.email,
      deletedAt: null,
    })
      .select("_id email name role phone")
      .lean();

    if (!me) return response(false, 401, "Unauthorized");

    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "10", 10), 1), 50);
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    // Orders linked by userRef, or by stored string userId, or fallback on email snapshot
    const q = {
      $or: [
        { userRef: me._id },
        { userId: String(me._id) },
        { "user.email": me.email },
      ],
    };

    const [items, total] = await Promise.all([
      Order.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(q),
    ]);

    const mapOrder = (o) => {
      const itemsCount = Array.isArray(o.items)
        ? o.items.reduce((n, it) => n + (Number(it.qty) || 0), 0)
        : 0;

      const firstName = o.items?.[0]?.name || "";
      const more = Math.max(0, (o.items?.length || 0) - 1);
      const summary =
        firstName && more > 0
          ? `${firstName} +${more} more`
          : firstName || `${itemsCount} item${itemsCount === 1 ? "" : "s"}`;

      return {
        _id: String(o._id),
        displayOrderId: o.display_order_id,
        createdAt: o.createdAt,
        status: o.status,
        itemsCount,
        summary,
        total: o.amounts?.total ?? null,
        currency: o.amounts?.currency ?? "NPR",
      };
    };

    return response(true, 200, "Orders fetched", {
      page,
      limit,
      total,
      items: items.map(mapOrder),
    });
  } catch (err) {
    return catchError(err, "Failed to fetch orders");
  }
}
