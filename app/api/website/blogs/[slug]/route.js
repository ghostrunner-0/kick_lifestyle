// app/api/website/blogs/[slug]/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import BlogPost from "@/models/Blog.model";
import { cache as redisCache } from "@/lib/redis"; // read-through helper

/** Normalize Mongoose doc to plain JSON */
const pick = (obj, keys) => {
  const out = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
};
const serialize = (doc) => {
  if (!doc) return null;
  const base = pick(doc, [
    "_id",
    "title",
    "slug",
    "excerpt",
    "contentHtml",
    "contentRaw",
    "status",
    "publishedAt",
    "readingTimeMinutes",
    "showOnWebsite",
    "seo",
    "tags",
    "locale",
    "createdAt",
    "updatedAt",
  ]);
  base._id = String(doc._id);
  base.featuredImage = doc.featuredImage
    ? {
        _id: String(doc.featuredImage._id),
        path: doc.featuredImage.path,
        alt: doc.featuredImage.alt || "",
      }
    : null;

  if (doc.category) {
    base.category = {
      _id: String(doc.category._id),
      name: doc.category.name,
      slug: doc.category.slug,
    };
  }
  return base;
};

export async function GET(req, { params }) {
  try {
    const url = new URL(req.url);
    const preview = url.searchParams.get("preview") === "1";
    const noCache = url.searchParams.get("noCache") === "1";

    const param = await params;
    const slug = decodeURIComponent(param.slug || "").trim();
    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Missing slug" },
        { status: 400 }
      );
    }

    // Cache key & TTL (shorter for preview)
    const CACHE_KEY = `blog:slug:v1:${slug}:${preview ? "preview" : "live"}`;
    const TTL_SECONDS = preview ? 20 : 300;

    const compute = async () => {
      const { connectDB } = await import("@/lib/DB");
      await connectDB();

      const query = {
        slug,
        deletedAt: null,
        showOnWebsite: true,
        ...(preview ? {} : { status: "published" }),
      };

      const doc = await BlogPost.findOne(query)
        .populate("category", "name slug")
        .lean();

      return serialize(doc); // may be null (cache negative too)
    };

    const data = noCache
      ? await compute()
      : await redisCache.with(CACHE_KEY, TTL_SECONDS, compute);

    if (!data) {
      return NextResponse.json(
        { success: false, message: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("GET /api/website/blogs/[slug] error:", err);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
