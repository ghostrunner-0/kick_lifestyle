// app/api/banners/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import Banner from "@/models/Banner.model";

export async function GET(req) {
  try {
    // allow admin + editor
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");

    await connectDB();

    const { searchParams } = new URL(req.url);
    const activeParam = searchParams.get("active");

    const filter = { deletedAt: null };
    if (activeParam && activeParam !== "all") {
      filter.active = activeParam === "true";
    }

    const banners = await Banner.find(filter).sort({ order: 1 }).lean();

    return response(true, 200, "Banners fetched successfully", banners);
  } catch (err) {
    return catchError(err, "Failed to fetch banners");
  }
}
