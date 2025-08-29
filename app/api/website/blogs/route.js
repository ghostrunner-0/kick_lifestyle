// app/api/website/blogs/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import BlogPost from "@/models/Blog.model";
import Category from "@/models/Category.model";
import { cache as redisCache } from "@/lib/redis"; // read-through helper

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isObjectIdLike = (v) => !!v && /^[a-f\d]{24}$/i.test(String(v));

export async function GET(req) {
  const url = new URL(req.url);

  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const rawLimit = Math.max(1, Number(url.searchParams.get("limit") || 12));
  const limit = Math.min(rawLimit, 50);

  const q = (url.searchParams.get("q") || "").trim();
  const categoryParam = (url.searchParams.get("category") || "").trim();
  const tagParam = (url.searchParams.get("tag") || "").trim();
  const sortParam = (url.searchParams.get("sort") || "recent").trim().toLowerCase();
  const noCache = url.searchParams.get("noCache") === "1";

  // final-response cache key
  const cacheKey = `blogs:v1:${JSON.stringify({
    page,
    limit,
    q,
    categoryParam,
    tagParam,
    sortParam,
  })}`;

  // compute function used for cache miss (and fallback)
  const compute = async () => {
    // lazy-load DB only when needed
    const { connectDB } = await import("@/lib/DB");
    await connectDB();

    // base filter
    const match = {
      status: "published",
      showOnWebsite: true,
      deletedAt: null,
    };

    // category filter
    if (categoryParam) {
      if (isObjectIdLike(categoryParam)) {
        match.category = new mongoose.Types.ObjectId(categoryParam);
      } else {
        const slug = categoryParam.toLowerCase();
        const slugKey = `blogs:catSlug:v1:${slug}`;

        // slug -> id lookup (cached 10 min)
        const catId =
          noCache
            ? await Category.findOne({
                slug,
                deletedAt: null,
                showOnWebsite: true,
              })
                .select({ _id: 1 })
                .lean()
                .then((c) => (c?._id ? String(c._id) : null))
            : await redisCache.with(slugKey, 600, async () => {
                const cat = await Category.findOne({
                  slug,
                  deletedAt: null,
                  showOnWebsite: true,
                })
                  .select({ _id: 1 })
                  .lean();
                return cat?._id ? String(cat._id) : null; // null is cached too
              });

        if (!catId) {
          // no such category → empty list
          return {
            success: true,
            page,
            limit,
            total: 0,
            totalPages: 0,
            data: [],
          };
        }

        match.category = new mongoose.Types.ObjectId(catId);
      }
    }

    // tag filter
    if (tagParam) {
      const tags = tagParam
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (tags.length) match.tags = { $in: tags };
    }

    // query
    const hasSearch = q.length > 0;
    const findQuery = hasSearch
      ? BlogPost.find({ ...match, $text: { $search: q } })
      : BlogPost.find(match);

    // projection
    if (hasSearch) {
      findQuery.select({
        title: 1,
        slug: 1,
        excerpt: 1,
        featuredImage: 1,
        category: 1,
        tags: 1,
        readingTimeMinutes: 1,
        publishedAt: 1,
        "seo.metaTitle": 1,
        "seo.metaDescription": 1,
        score: { $meta: "textScore" },
      });
    } else {
      findQuery.select({
        title: 1,
        slug: 1,
        excerpt: 1,
        featuredImage: 1,
        category: 1,
        tags: 1,
        readingTimeMinutes: 1,
        publishedAt: 1,
        "seo.metaTitle": 1,
        "seo.metaDescription": 1,
      });
    }

    // sort
    if (hasSearch && sortParam === "relevance") {
      findQuery.sort({
        score: { $meta: "textScore" },
        publishedAt: -1,
        createdAt: -1,
      });
    } else {
      findQuery.sort({ publishedAt: -1, createdAt: -1 });
    }

    // pagination
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      findQuery
        .populate({ path: "category", select: { _id: 1, name: 1, slug: 1 } })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      BlogPost.countDocuments(hasSearch ? { ...match, $text: { $search: q } } : match),
    ]);

    return {
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: items || [],
    };
  };

  try {
    if (noCache) {
      const payload = await compute();
      return NextResponse.json(payload, { status: 200 });
    }

    const ttl = q ? 60 : 180; // shorter TTL for searches
    const payload = await redisCache.with(cacheKey, ttl, compute);
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    // if Redis or anything else blows up, fallback to direct DB
    try {
      const payload = await compute();
      return NextResponse.json(payload, { status: 200 });
    } catch (dbErr) {
      console.error("blogs route error:", dbErr);
      return NextResponse.json(
        { success: false, message: "Failed to fetch blog posts" },
        { status: 500 }
      );
    }
  }
}
