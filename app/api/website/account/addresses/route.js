// app/api/account/addresses/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/DB";
import User from "@/models/User.model";
import Order from "@/models/Orders.model";
import { response, catchError } from "@/lib/helperFunctions";

export const dynamic = "force-dynamic";

/**
 * GET /api/account/addresses
 * Builds a deduped list of addresses from:
 *  - User profile (pathao* + address string) as "Default"
 *  - Recent order snapshots
 */
export async function GET() {
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
      .select(
        "_id email name phone address pathaoCityId pathaoCityLabel pathaoZoneId pathaoZoneLabel pathaoAreaId pathaoAreaLabel"
      )
      .lean();

    if (!me) return response(false, 401, "Unauthorized");

    const out = [];

    // Helper to normalize to a UI-friendly card
    const makeCard = (a, label = "Address") => {
      const line1Parts = [];
      if (a?.areaLabel) line1Parts.push(a.areaLabel);
      if (a?.landmark) line1Parts.push(a.landmark);

      return {
        id: a.id || `${a.cityId || ""}-${a.zoneId || ""}-${a.areaId || ""}-${a.landmark || ""}` || crypto.randomUUID(),
        label,
        line1: line1Parts.length ? line1Parts.join(", ") : null,
        line2: null,
        city: a?.cityLabel || null,
        state: a?.zoneLabel || null,
        zip: null,
      };
    };

    // 1) Default/profile address (if present)
    const hasProfileAddr =
      me.pathaoCityLabel || me.pathaoZoneLabel || me.pathaoAreaLabel || me.address;
    if (hasProfileAddr) {
      out.push(
        makeCard(
          {
            id: "default",
            cityId: me.pathaoCityId?.toString() || "",
            cityLabel: me.pathaoCityLabel || null,
            zoneId: me.pathaoZoneId?.toString() || "",
            zoneLabel: me.pathaoZoneLabel || null,
            areaId: me.pathaoAreaId?.toString() || "",
            areaLabel: me.pathaoAreaLabel || null,
            landmark: me.address || null,
          },
          "Default"
        )
      );
    }

    // 2) Recent order addresses
    const q = {
      $or: [{ userRef: me._id }, { userId: String(me._id) }, { "user.email": me.email }],
    };

    const recentOrders = await Order.find(q)
      .sort({ createdAt: -1 })
      .limit(30)
      .select("address createdAt")
      .lean();

    const seen = new Set(out.map((a) => a.id));
    for (const o of recentOrders) {
      const a = o.address || {};
      // Skip empty
      if (!a.cityLabel && !a.zoneLabel && !a.areaLabel && !a.landmark) continue;

      const card = makeCard(a, a.areaLabel ? `Home (${a.areaLabel})` : "Order Address");
      if (!seen.has(card.id)) {
        out.push(card);
        seen.add(card.id);
      }
    }

    return response(true, 200, "Addresses fetched", out);
  } catch (err) {
    return catchError(err, "Failed to fetch addresses");
  }
}
