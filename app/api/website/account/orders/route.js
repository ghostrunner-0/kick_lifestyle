// app/api/account/orders/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/DB";
import User from "@/models/User.model";
import Order from "@/models/Orders.model";
import { response, catchError } from "@/lib/helperFunctions";

// ✅ Redis helpers (from /lib/redis)
import { cache as redisCache } from "@/lib/redis";

export const dynamic = "force-dynamic";

// reasonable freshness window for account orders list
const TTL_SECONDS = 60;

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
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "10", 10), 1),
      50
    );
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    // per-user cache key (avoid leakage)
    const cacheKey = `acc:orders:v1:user=${me._id}:p=${page}:l=${limit}`;

    // map function kept outside query to reuse for DB/Cache
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

    // build query once
    const q = {
      $or: [
        { userRef: me._id },
        { userId: String(me._id) },
        { "user.email": me.email },
      ],
    };

    // 🔴 read-through cache: if miss, run DB queries then store
    let payload;
    try {
      payload = await redisCache.with(cacheKey, TTL_SECONDS, async () => {
        const [items, total] = await Promise.all([
          Order.find(q)
            .select(
              // narrow fields to reduce payload stored in Redis
              "_id display_order_id createdAt status items amounts"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Order.countDocuments(q),
        ]);

        return {
          page,
          limit,
          total,
          items: items.map(mapOrder),
        };
      });
    } catch {
      // if Redis is down, just hit DB (no crash)
      const [items, total] = await Promise.all([
        Order.find(q)
          .select("_id display_order_id createdAt status items amounts")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(q),
      ]);

      payload = {
        page,
        limit,
        total,
        items: items.map(mapOrder),
      };
    }

    return response(true, 200, "Orders fetched", payload);
  } catch (err) {
    return catchError(err, "Failed to fetch orders");
  }
}
