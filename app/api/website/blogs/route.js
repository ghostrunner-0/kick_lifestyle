// app/api/website/blogs/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import BlogPost from "@/models/Blog.model";
import Category from "@/models/Category.model";

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isObjectIdLike = (v) => !!v && /^[a-f\d]{24}$/i.test(String(v));

/**
 * Query params (all optional):
 * - page: number (default 1)
 * - limit: number (default 12, max 50)
 * - q: text search query (uses Mongo text index)
 * - category: category slug or ObjectId
 * - tag: single tag or comma-separated tags
 * - sort: 'recent' (default) or 'relevance' (when q is present)
 */
export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const rawLimit = Math.max(1, Number(url.searchParams.get("limit") || 12));
    const limit = Math.min(rawLimit, 50);

    const q = (url.searchParams.get("q") || "").trim();
    const categoryParam = (url.searchParams.get("category") || "").trim();
    const tagParam = (url.searchParams.get("tag") || "").trim();
    const sortParam = (url.searchParams.get("sort") || "recent")
      .trim()
      .toLowerCase();

    // Base filters: only published + visible + not deleted
    const match = {
      status: "published",
      showOnWebsite: true,
      deletedAt: null,
    };

    // Category filter: id or slug
    if (categoryParam) {
      if (isObjectIdLike(categoryParam)) {
        match.category = new mongoose.Types.ObjectId(categoryParam);
      } else {
        const cat = await Category.findOne({
          slug: categoryParam.toLowerCase(),
          deletedAt: null,
          showOnWebsite: true,
        })
          .select({ _id: 1 })
          .lean()
          .exec();
        if (cat?._id) match.category = cat._id;
        else {
          // No category match → empty result fast
          return NextResponse.json(
            {
              success: true,
              page,
              limit,
              total: 0,
              totalPages: 0,
              data: [],
            },
            { status: 200 }
          );
        }
      }
    }

    // Tag filter: support comma separated
    if (tagParam) {
      const tags = tagParam
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (tags.length) match.tags = { $in: tags };
    }

    // Search: use text index if q present
    const hasSearch = q.length > 0;
    const findQuery = hasSearch
      ? BlogPost.find({ ...match, $text: { $search: q } })
      : BlogPost.find(match);

    // Projection: compact listing fields (exclude heavy content)
    if (hasSearch) {
      // include textScore for sorting when searching
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

    // Sort
    if (hasSearch && sortParam === "relevance") {
      findQuery.sort({
        score: { $meta: "textScore" },
        publishedAt: -1,
        createdAt: -1,
      });
    } else {
      // default recent
      findQuery.sort({ publishedAt: -1, createdAt: -1 });
    }

    // Pagination
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      findQuery
        .populate({ path: "category", select: { _id: 1, name: 1, slug: 1 } })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      BlogPost.countDocuments(
        hasSearch ? { ...match, $text: { $search: q } } : match
      ),
    ]);

    return NextResponse.json(
      {
        success: true,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data: items || [],
      },
      { status: 200 }
    );
  } catch (error) {
    return catchError(error, "Failed to fetch blog posts");
  }
}
