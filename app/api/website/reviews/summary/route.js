// app/api/website/reviews/summary/route.js
import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import Review from "@/models/Review.model";
import Product from "@/models/Product.model";

export const dynamic = "force-dynamic";

/**
 * GET /api/website/reviews/summary?productId=...
 * Only counts status=approved.
 */
export async function GET(req) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");
    if (!productId) return response(false, 400, "Missing productId");

    const exists = await Product.findOne({ _id: productId, deletedAt: null }).select("_id").lean();
    if (!exists) return response(false, 404, "Product not found");

    const pipeline = [
      { $match: { product: exists._id, status: "approved", deletedAt: null } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
          // we can also accumulate for average
        },
      },
    ];

    const rows = await Review.aggregate(pipeline);
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let sum = 0;

    for (const r of rows) {
      const star = r._id;
      breakdown[star] = r.count;
      total += r.count;
      sum += star * r.count;
    }

    const average = total ? sum / total : 0;
    return response(true, 200, "Summary", { average, total, breakdown });
  } catch (err) {
    return catchError(err, "Failed to compute summary");
  }
}
