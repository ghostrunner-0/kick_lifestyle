// app/api/account/address/route.js
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import User from "@/models/User.model";

function toNumOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export async function GET() {
  console.log("🟢 [address:GET] HIT");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.warn("❌ [address:GET] No session");
      return response(false, 401, "Unauthorized");
    }

    await connectDB();
    console.log("✅ [address:GET] DB connected");

    const email = String(session.user.email).toLowerCase();
    const user = await User.findOne({ email, deletedAt: null })
      .select(
        "address pathaoCityId pathaoCityLabel pathaoZoneId pathaoZoneLabel pathaoAreaId pathaoAreaLabel"
      )
      .lean();

    if (!user) {
      console.warn("❌ [address:GET] User not found:", email);
      return response(false, 404, "User not found");
    }

    console.log("✅ [address:GET] OK for", email);
    return response(true, 200, "Address fetched", {
      address: user.address ?? "",
      pathaoCityId: user.pathaoCityId,
      pathaoCityLabel: user.pathaoCityLabel ?? "",
      pathaoZoneId: user.pathaoZoneId,
      pathaoZoneLabel: user.pathaoZoneLabel ?? "",
      pathaoAreaId: user.pathaoAreaId,
      pathaoAreaLabel: user.pathaoAreaLabel ?? "",
    });
  } catch (err) {
    console.error("💥 [address:GET] Error:", err);
    return catchError(err);
  }
}

export async function PUT(req) {
  console.log("🟠 [address:PUT] HIT");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.warn("❌ [address:PUT] No session");
      return response(false, 401, "Unauthorized");
    }

    await connectDB();
    console.log("✅ [address:PUT] DB connected");

    const payload = await req.json().catch(() => ({}));
    console.log("📩 [address:PUT] Body:", payload);

    // Accepts either {cityId, zoneId, areaId, landmark} OR with label fields too
    const {
      cityId,
      zoneId,
      areaId,
      cityLabel,
      zoneLabel,
      areaLabel,
      landmark,
    } = payload || {};

    const cid = toNumOrNull(cityId);
    const zid = toNumOrNull(zoneId);
    const aid = toNumOrNull(areaId);
    const addr = typeof landmark === "string" ? landmark.trim() : "";

    if (!cid || !zid || !aid || !addr) {
      console.warn("⚠️ [address:PUT] Missing fields");
      return response(
        false,
        400,
        "City, zone, area and landmark are required."
      );
    }

    const email = String(session.user.email).toLowerCase();

    const update = {
      pathaoCityId: cid,
      pathaoZoneId: zid,
      pathaoAreaId: aid,
      address: addr,
    };

    // Optional: labels if provided
    if (typeof cityLabel === "string")
      update.pathaoCityLabel = cityLabel.trim();
    if (typeof zoneLabel === "string")
      update.pathaoZoneLabel = zoneLabel.trim();
    if (typeof areaLabel === "string")
      update.pathaoAreaLabel = areaLabel.trim();

    const user = await User.findOneAndUpdate(
      { email, deletedAt: null },
      { $set: update },
      {
        new: true,
        projection:
          "address pathaoCityId pathaoCityLabel pathaoZoneId pathaoZoneLabel pathaoAreaId pathaoAreaLabel",
      }
    ).lean();

    if (!user) {
      console.warn("❌ [address:PUT] User not found:", email);
      return response(false, 404, "User not found");
    }

    console.log("✅ [address:PUT] Saved for", email, "->", update);

    return response(true, 200, "Address updated", {
      address: user.address ?? "",
      pathaoCityId: user.pathaoCityId,
      pathaoCityLabel: user.pathaoCityLabel ?? "",
      pathaoZoneId: user.pathaoZoneId,
      pathaoZoneLabel: user.pathaoZoneLabel ?? "",
      pathaoAreaId: user.pathaoAreaId,
      pathaoAreaLabel: user.pathaoAreaLabel ?? "",
    });
  } catch (err) {
    console.error("💥 [address:PUT] Error:", err);
    return catchError(err);
  }
}
