// /api/product-variant/route.js
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import ProductVariant from "@/models/ProductVariant.model";
import "@/models/Product.model"; // ensure Product is registered for lookup
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const { searchParams } = new URL(req.url);
    const start = Math.max(parseInt(searchParams.get("start") || "0", 10), 0);
    const size = Math.min(Math.max(parseInt(searchParams.get("size") || "25", 10), 1), 200);
    const deleType = searchParams.get("deleType"); // "SD" | "PD" | undefined

    // filters / sorting optional (keep simple here)
    const preMatch = {};
    if (deleType === "PD") preMatch.deletedAt = { $ne: null };
    else preMatch.deletedAt = null;

    const pipeline = [
      { $match: preMatch },
      {
        $lookup: {
          from: "Products",              // <-- Product model uses "Products"
          localField: "product",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          variantName: 1,
          sku: 1,
          mrp: 1,
          specialPrice: 1,
          productGallery: 1,
          swatchImage: {
            _id: "$swatchImage._id",
            path: "$swatchImage.path",
            alt: "$swatchImage.alt",
          },
          createdAt: 1,
          // what your table reads for the parent name:
          productName: "$productDoc.name",
          // if you ever want the whole product doc, keep this (table code already tolerates either):
          // product: { _id: "$productDoc._id", name: "$productDoc.name" },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: start },
      { $limit: size },
    ];

    const countPipeline = [{ $match: preMatch }, { $count: "count" }];

    const [rows, countArr] = await Promise.all([
      ProductVariant.aggregate(pipeline),
      ProductVariant.aggregate(countPipeline),
    ]);

    const total = countArr?.[0]?.count || 0;

    return NextResponse.json({ data: rows, meta: { totalRowCount: total } });
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
