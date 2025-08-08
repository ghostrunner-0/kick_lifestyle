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

    const { searchParams } = new URL(req.url);

    const start = Math.max(parseInt(searchParams.get("start") || "0", 10), 0);
    const size = Math.min(
      Math.max(parseInt(searchParams.get("size") || "25", 10), 1),
      200
    );

    const filters = safeJSON(searchParams.get("filters")) || [];
    const globalFilter = (searchParams.get("globalFilter") || "").trim();
    const sorting = safeJSON(searchParams.get("sorting")) || [];
    const deleType = searchParams.get("deleType"); // "SD" | "PD" | undefined

    // ---------- Build base match (pre-lookup) ----------
    const preMatch = {};

    // Default to non-deleted if not specified
    if (deleType === "PD") preMatch.deletedAt = { $ne: null };
    else preMatch.deletedAt = null;

    // Column filters on direct fields
    for (const f of filters) {
      if (!f?.id) continue;
      const val = f.value;

      if (val == null || val === "") continue;

      // Boolean filter
      if (f.id === "showInWebsite") {
        const v = String(val).toLowerCase();
        if (v === "true") preMatch.showInWebsite = true;
        else if (v === "false") preMatch.showInWebsite = false;
        continue;
      }

      // Numeric fields
      if (["mrp", "specialPrice", "warrantyMonths"].includes(f.id)) {
        const num = Number(val);
        if (!Number.isNaN(num)) preMatch[f.id] = num;
        continue;
      }

      // Category by ObjectId
      if (f.id === "category") {
        const v = String(val).trim();
        if (/^[a-f\d]{24}$/i.test(v)) {
          preMatch.category = new mongoose.Types.ObjectId(v);
        }
        continue;
      }

      // Default regex string filter
      preMatch[f.id] = { $regex: String(val), $options: "i" };
    }

    // ---------- Build post-lookup match (category name/global search) ----------
    const postMatch = {};

    if (globalFilter) {
      const rx = { $regex: globalFilter, $options: "i" };
      postMatch.$or = [
        { name: rx },
        { slug: rx },
        { shortDesc: rx },
        { "categoryDoc.name": rx },
      ];
    }

    // Optional explicit filter by category name
    const catNameFilter = filters.find((f) => f.id === "categoryName" && f.value);
    if (catNameFilter) {
      postMatch["categoryDoc.name"] = {
        $regex: String(catNameFilter.value),
        $options: "i",
      };
    }

    // ---------- Sorting ----------
    const sortStage =
      sorting && sorting.length
        ? sorting.reduce((acc, s) => {
            // Allow sorting by category name via "categoryName"
            if (s.id === "categoryName") {
              acc["categoryDoc.name"] = s.desc ? -1 : 1;
            } else {
              acc[s.id] = s.desc ? -1 : 1;
            }
            return acc;
          }, {})
        : { createdAt: -1 };

    // ---------- Aggregation pipeline ----------
    const basePipeline = [
      { $match: preMatch },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDoc",
        },
      },
      { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
    ];

    // Apply post-lookup matches (global/category name)
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
          warrantyMonths: 1,     // ✅ include warranty
          showInWebsite: 1,
          createdAt: 1,
          updatedAt: 1,
          category: 1,
          categoryName: "$categoryDoc.name",
          heroImage: {
            _id: "$heroImage._id",
            path: "$heroImage.path",
            alt: "$heroImage.alt",
          },
        },
      },
    ];

    const countPipeline = [...basePipeline, { $count: "count" }];

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

// Small helper to avoid JSON.parse explosions
function safeJSON(str) {
  try {
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}
