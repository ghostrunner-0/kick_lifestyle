import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import Review from "@/models/Review.model";
import mongoose, { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/website/reviews/summary?productId=...
 * Public
 */
export async function GET(req) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");
    if (!productId || !isValidObjectId(productId)) {
      return response(false, 400, "Invalid productId");
    }

    const [row] = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), status: "approved", deletedAt: null } },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          total: { $sum: 1 },
          s1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          s2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          s3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          s4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          s5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
        },
      },
    ]);

    const data = row
      ? {
          average: Number(row.average) || 0,
          total: row.total || 0,
          breakdown: { 1: row.s1 || 0, 2: row.s2 || 0, 3: row.s3 || 0, 4: row.s4 || 0, 5: row.s5 || 0 },
        }
      : { average: 0, total: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

    return response(true, 200, "Summary fetched", data);
  } catch (err) {
    return catchError(err, "Failed to fetch summary");
  }
}
