import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import UserModel from "@/models/User.model";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

// ✅ List users with filters, sorting, pagination
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

    // ---------- Build preMatch ----------
    const preMatch = {};

    // Deleted or active filter
    if (deleType === "PD") preMatch.deletedAt = { $ne: null };
    else preMatch.deletedAt = null;

    // Column-specific filters
    for (const f of filters) {
      if (!f?.id) continue;
      const val = f.value;
      if (val == null || val === "") continue;

      // Boolean filters
      if (f.id === "isEmailVerified") {
        const v = String(val).toLowerCase();
        if (v === "true") preMatch.isEmailVerified = true;
        else if (v === "false") preMatch.isEmailVerified = false;
        continue;
      }

      // Default regex string filter
      preMatch[f.id] = { $regex: String(val), $options: "i" };
    }

    // ---------- Build postMatch (global search) ----------
    const postMatch = {};

    if (globalFilter) {
      const rx = { $regex: globalFilter, $options: "i" };
      postMatch.$or = [
        { name: rx },
        { email: rx },
        { phone: rx },
        { address: rx }
      ];
    }

    // ---------- Sorting ----------
    const sortStage =
      sorting && sorting.length
        ? sorting.reduce((acc, s) => {
            acc[s.id] = s.desc ? -1 : 1;
            return acc;
          }, {})
        : { createdAt: -1 };

    // ---------- Pipeline ----------
    const basePipeline = [{ $match: preMatch }];

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
          email: 1,
          phone: 1,
          address: 1,
          role: 1,
          isEmailVerified: 1,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: 1
        },
      },
    ];

    const countPipeline = [...basePipeline, { $count: "count" }];

    const [rows, countArr] = await Promise.all([
      UserModel.aggregate(dataPipeline),
      UserModel.aggregate(countPipeline),
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

// 🔹 Safe JSON parse
function safeJSON(str) {
  try {
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}
