// app/api/banners/route.js  (or your current path)
// Uses Redis read-through caching for active banners

import { NextResponse } from "next/server";
import Banner from "@/models/Banner.model";
import { cache as redisCache } from "@/lib/redis"; // <-- our Redis helper

export const dynamic = "force-dynamic";

const CACHE_KEY = "banners:active:v1";
const TTL_SECONDS = 300; // 5 minutes; bump to 900 if you want

export async function GET() {
  try {
    // Read-through cache: on miss, query Mongo, then cache result
    const banners = await redisCache.with(CACHE_KEY, TTL_SECONDS, async () => {
      // lazy-load DB only when needed (inside the cache miss handler)
      const { connectDB } = await import("@/lib/DB");
      await connectDB();

      return Banner.find({ active: true, deletedAt: null })
        .sort({ order: 1 })
        .lean();
    });

    return NextResponse.json({ success: true, data: banners });
  } catch (error) {
    // If Redis is down or anything else fails, fall back to DB
    console.error("Error fetching banners (cache path):", error);
    try {
      const { connectDB } = await import("@/lib/DB");
      await connectDB();

      const banners = await Banner.find({ active: true, deletedAt: null })
        .sort({ order: 1 })
        .lean();

      return NextResponse.json({ success: true, data: banners });
    } catch (dbErr) {
      console.error("Error fetching banners (db fallback):", dbErr);
      return NextResponse.json(
        { success: false, message: "Failed to fetch banners" },
        { status: 500 }
      );
    }
  }
}
