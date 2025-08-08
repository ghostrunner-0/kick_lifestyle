import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Product from "@/models/Product.model";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const start = parseInt(searchParams.get("start") || 0, 10);
    const size = parseInt(searchParams.get("size") || 25, 10);
    const filters = JSON.parse(searchParams.get("filters") || "[]");
    const globalFilter = searchParams.get("globalFilter") || "";
    const sorting = JSON.parse(searchParams.get("sorting") || "[]");
    const deleType = searchParams.get("deleType"); // "SD" (soft/live) | "PD" (deleted) | undefined

    // ---------- Build base match (pre-lookup) ----------
    const preMatch = {};

    // Soft delete filter
    if (deleType === "SD") preMatch.deletedAt = null;
    else if (deleType === "PD") preMatch.deletedAt = { $ne: null };

    // Per-column filters on direct fields
    // (supports: name, slug, shortDesc, showInWebsite, etc.)
    for (const f of filters) {
      if (!f?.id || f.value == null || f.value === "") continue;

      // Special case boolean filter for showInWebsite if you pass true/false
      if (f.id === "showInWebsite") {
        if (String(f.value).toLowerCase() === "true") preMatch.showInWebsite = true;
        else if (String(f.value).toLowerCase() === "false") preMatch.showInWebsite = false;
        continue;
      }

      // Numeric columns (mrp/specialPrice)
      if (["mrp", "specialPrice"].includes(f.id)) {
        const num = Number(f.value);
        if (!Number.isNaN(num)) preMatch[f.id] = num;
        continue;
      }

      // Category by id (when filter id is "category")
      if (f.id === "category") {
        const v = String(f.value).trim();
        if (/^[a-f\d]{24}$/i.test(v)) {
          preMatch.category = new mongoose.Types.ObjectId(v);
        }
        continue;
      }

      // Default: regex on string field
      preMatch[f.id] = { $regex: String(f.value), $options: "i" };
    }

    // ---------- Build post-lookup match (category name/global search) ----------
    const postMatch = {};

    // Global search across name/slug/shortDesc + category name
    if (globalFilter) {
      const rx = { $regex: globalFilter, $options: "i" };
      postMatch.$or = [
        { name: rx },
        { slug: rx },
        { shortDesc: rx },
        { "categoryDoc.name": rx },
      ];
    }

    // Allow explicit filter by category name if a filter id "categoryName" is used
    const categoryNameFilter = filters.find((f) => f.id === "categoryName" && f.value);
    if (categoryNameFilter) {
      postMatch["categoryDoc.name"] = {
        $regex: String(categoryNameFilter.value),
        $options: "i",
      };
    }

    // ---------- Sorting ----------
    // Fallback sort: newest first
    const sortStage =
      sorting && sorting.length
        ? sorting.reduce((acc, s) => {
            acc[s.id] = s.desc ? -1 : 1;
            return acc;
          }, {})
        : { createdAt: -1 };

    // ---------- Aggregation pipeline ----------
    const basePipeline = [
      { $match: preMatch },
      {
        $lookup: {
          from: "categories", // collection name for Category
          localField: "category",
          foreignField: "_id",
          as: "categoryDoc",
        },
      },
      { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
    ];

    if (Object.keys(postMatch).length) {
      basePipeline.push({ $match: postMatch });
    }

    const dataPipeline = [
      ...basePipeline,
      { $sort: sortStage },
      { $skip: start },
      { $limit: size },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          shortDesc: 1,
          mrp: 1,
          specialPrice: 1,
          showInWebsite: 1,
          createdAt: 1,
          updatedAt: 1,
          // useful for list view
          category: 1,
          "categoryName": "$categoryDoc.name",
          "heroImage": {
            _id: "$heroImage._id",
            path: "$heroImage.path",
            alt: "$heroImage.alt",
          },
        },
      },
    ];

    const countPipeline = [
      ...basePipeline,
      { $count: "count" },
    ];

    const [rows, countArr] = await Promise.all([
      Product.aggregate(dataPipeline),
      Product.aggregate(countPipeline),
    ]);

    const total = countArr?.[0]?.count || 0;

    return NextResponse.json({
      data: rows,
      meta: { totalRowCount: total },
    });
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
