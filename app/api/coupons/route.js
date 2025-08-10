// /app/api/coupon/route.js
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Coupon from "@/models/Coupon.model";
import { NextResponse } from "next/server";

// tiny helper so bad JSON in query doesn't 500 your API
function safeJSON(str) {
  try {
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}

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

    // ---------------- Match stage ----------------
    const matchQuery = {};

    // Soft-delete scope
    if (deleType === "PD") matchQuery.deletedAt = { $ne: null };
    else matchQuery.deletedAt = null; // default show non-deleted

    // Global search -> code
    if (globalFilter) {
      matchQuery.$or = [{ code: { $regex: globalFilter, $options: "i" } }];
    }

    // Column filters
    for (const f of filters) {
      if (!f?.id) continue;
      const val = f.value;
      if (val == null || val === "") continue;

      switch (f.id) {
        case "code":
          matchQuery.code = { $regex: String(val), $options: "i" };
          break;

        case "discountType": // "percentage" | "fixed"
          matchQuery.discountType = String(val);
          break;

        case "individualUse": // boolean
          if (String(val).toLowerCase() === "true") matchQuery.individualUse = true;
          else if (String(val).toLowerCase() === "false") matchQuery.individualUse = false;
          break;

        case "discountAmount":
        case "perUserLimit":
        case "totalLimit":
        case "redemptionsTotal":
        case "changeAfterUsage":
        case "newDiscountAmount": {
          const num = Number(val);
          if (!Number.isNaN(num)) matchQuery[f.id] = num;
          break;
        }

        case "newDiscountType": // "percentage" | "fixed" (or null)
          matchQuery.newDiscountType = String(val);
          break;

        // hasFreeItem: "true"/"false" to filter on freeItem.variant presence
        case "hasFreeItem": {
          const bool = String(val).toLowerCase() === "true";
          matchQuery["freeItem.variant"] = bool ? { $ne: null } : null;
          break;
        }

        default:
          // fallback regex on any string field (be conservative)
          matchQuery[f.id] = { $regex: String(val), $options: "i" };
      }
    }

    // ---------------- Sorting ----------------
    // also support sorting on computed counts
    const sortStage =
      sorting && sorting.length
        ? sorting.reduce((acc, s) => {
            // allow client to sort on computed aliases too
            if (s.id === "specificProductsCount") acc.specificProductsCount = s.desc ? -1 : 1;
            else if (s.id === "specificVariantsCount") acc.specificVariantsCount = s.desc ? -1 : 1;
            else if (s.id === "hasFreeItem") acc.hasFreeItem = s.desc ? -1 : 1;
            else acc[s.id] = s.desc ? -1 : 1;
            return acc;
          }, {})
        : { createdAt: -1 };

    // ---------------- Pipeline ----------------
    const basePipeline = [
      { $match: matchQuery },
      {
        $addFields: {
          specificProductsCount: { $size: { $ifNull: ["$specificProducts", []] } },
          specificVariantsCount: { $size: { $ifNull: ["$specificVariants", []] } },
          hasFreeItem: { $cond: [{ $ifNull: ["$freeItem.variant", false] }, true, false] },
        },
      },
    ];

    const dataPipeline = [
      ...basePipeline,
      { $sort: sortStage },
      { $skip: start },
      { $limit: size },
      {
        $project: {
          _id: 1,
          code: 1,
          discountType: 1,
          discountAmount: 1,
          individualUse: 1,
          perUserLimit: 1,
          totalLimit: 1,
          redemptionsTotal: 1,
          changeAfterUsage: 1,
          newDiscountType: 1,
          newDiscountAmount: 1,
          deletedAt: 1,
          createdAt: 1,
          updatedAt: 1,
          // compact projections for UI
          specificProductsCount: 1,
          specificVariantsCount: 1,
          hasFreeItem: 1,
          // (optional) expose ids if your UI wants them:
          // specificProducts: 1,
          // specificVariants: 1,
          // "freeItem.variant": 1,
          // "freeItem.qty": 1,
        },
      },
    ];

    // Count (match only)
    const [rows, totalArr] = await Promise.all([
      Coupon.aggregate(dataPipeline),
      Coupon.aggregate([...basePipeline, { $count: "count" }]),
    ]);

    const total = totalArr?.[0]?.count || 0;

    return NextResponse.json({
      data: rows,
      meta: { totalRowCount: total },
    });
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
