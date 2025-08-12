import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Review from "@/models/Review.model";
import { NextResponse } from "next/server";

// Safe JSON parse helper
function safeJSON(str) {
  try {
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}

// GET handler for fetching reviews list with user and product info populated
export async function GET(req) {
  try {
    // Auth check for admin
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

    // Build filter conditions
    const preMatch = {};

    if (deleType === "PD") preMatch.deletedAt = { $ne: null };
    else preMatch.deletedAt = null;

    for (const f of filters) {
      if (!f?.id) continue;
      const val = f.value;
      if (val == null || val === "") continue;

      if (f.id === "status") {
        preMatch.status = val;
        continue;
      }

      if (f.id === "rating") {
        if (typeof val === "object" && val.min != null && val.max != null) {
          preMatch.rating = { $gte: Number(val.min), $lte: Number(val.max) };
        } else {
          preMatch.rating = Number(val);
        }
        continue;
      }

      preMatch[f.id] = { $regex: String(val), $options: "i" };
    }

    // Global search filter
    const postMatch = {};
    if (globalFilter) {
      const rx = { $regex: globalFilter, $options: "i" };
      postMatch.$or = [
        { title: rx },
        { review: rx },
        // You could add user or product name regex here with lookups, if needed
      ];
    }

    // Sorting stage
    const sortStage =
      sorting.length > 0
        ? sorting.reduce((acc, s) => {
            acc[s.id] = s.desc ? -1 : 1;
            return acc;
          }, {})
        : { createdAt: -1 };

    // Build aggregation pipeline
    const basePipeline = [{ $match: preMatch }];
    if (Object.keys(postMatch).length) {
      basePipeline.push({ $match: postMatch });
    }

    basePipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "Products", // <-- FIX: Match exact collection name case
          localField: "product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } }
    );

    const dataPipeline = [
      ...basePipeline,
      { $sort: sortStage },
      { $skip: start },
      { $limit: size },
      {
        $project: {
          _id: 1,
          product: 1,
          user: 1,
          rating: 1,
          title: 1,
          review: 1,
          status: 1,
          deletedAt: 1,
          createdAt: 1,
          updatedAt: 1,

          "userInfo.name": 1,
          "userInfo.email": 1,
          "productInfo.name": 1,
          "productInfo.slug": 1,
          "productInfo.heroImage": 1,
        },
      },
    ];

    const countPipeline = [...basePipeline, { $count: "count" }];

    const [rows, countArr] = await Promise.all([
      Review.aggregate(dataPipeline),
      Review.aggregate(countPipeline),
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
