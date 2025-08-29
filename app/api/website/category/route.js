// app/api/website/category/route.js
import { NextResponse } from "next/server";
import Category from "@/models/Category.model";
import { cache as redisCache } from "@/lib/redis"; // read-through helper

export const revalidate = 0;            // always dynamic from Next's POV
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Single key for active website categories
const CACHE_KEY = "categories:active:v1";
// Long TTL since this feeds layout (12 hours)
const TTL_SECONDS = 60 * 60 * 12;

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const noCache = url.searchParams.get("noCache") === "1";

    const compute = async () => {
      // lazy-load DB only on cache miss
      const { connectDB } = await import("@/lib/DB");
      await connectDB();

      const categories = await Category.find(
        { showOnWebsite: true, deletedAt: null }
        // optional projection: "name slug order icon"
      )
        .sort({ order: 1, name: 1 })
        .lean()
        .exec();

      return categories ?? [];
    };

    const data = noCache
      ? await compute()
      : await redisCache.with(CACHE_KEY, TTL_SECONDS, compute);

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    // If Redis or anything else fails, fall back to DB
    console.error("Error fetching categories (cache path):", error);
    try {
      const { connectDB } = await import("@/lib/DB");
      await connectDB();

      const categories = await Category.find({ showOnWebsite: true, deletedAt: null })
        .sort({ order: 1, name: 1 })
        .lean()
        .exec();

      return NextResponse.json({ success: true, data: categories ?? [] }, { status: 200 });
    } catch (dbErr) {
      console.error("Error fetching categories (db fallback):", dbErr);
      return NextResponse.json(
        { success: false, message: "Failed to fetch categories" },
        { status: 500 }
      );
    }
  }
}
