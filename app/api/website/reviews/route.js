// app/api/website/reviews/route.js
import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import Review from "@/models/Review.model";
import Product from "@/models/Product.model";

export const dynamic = "force-dynamic";

/**
 * GET /api/website/reviews
 * Query:
 *   productId (required)
 *   page=1
 *   limit=10
 *   sort=newest | highest | lowest
 *   rating=1..5 (optional filter)
 */
export async function GET(req) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(30, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
    const sortParam = String(url.searchParams.get("sort") || "newest");
    const rating = url.searchParams.get("rating"); // optional

    if (!productId) return response(false, 400, "Missing productId");

    // Ensure product exists & is visible
    const exists = await Product.findOne({ _id: productId, deletedAt: null }).select("_id").lean();
    if (!exists) return response(false, 404, "Product not found");

    const query = { product: productId, status: "approved", deletedAt: null };
    if (rating && ["1", "2", "3", "4", "5"].includes(rating)) query.rating = Number(rating);

    const sortMap = {
      newest: { createdAt: -1 },
      highest: { rating: -1, createdAt: -1 },
      lowest: { rating: 1, createdAt: -1 },
    };
    const sort = sortMap[sortParam] || sortMap.newest;

    const [items, total] = await Promise.all([
      Review.find(query)
        .select("_id rating title review createdAt user") // add userName if you store it
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
    ]);

    // If you keep user names elsewhere, you can hydrate here. For now, return as-is.
    return response(true, 200, "Reviews fetched", {
      items,
      total,
      page,
      pageSize: limit,
    });
  } catch (err) {
    return catchError(err, "Failed to fetch reviews");
  }
}

/**
 * POST /api/website/reviews
 * Body: { product, rating (1..5), title, review }
 * Creates review with status=unapproved by default.
 */
export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const { product, rating, title, review } = body || {};

    if (!product) return response(false, 400, "Missing product id");
    if (!(rating >= 1 && rating <= 5)) return response(false, 400, "Rating must be between 1 and 5");
    if (!title || !String(title).trim()) return response(false, 400, "Title is required");
    if (!review || !String(review).trim()) return response(false, 400, "Review text is required");

    // Ensure product exists & is visible (or at least not deleted)
    const exists = await Product.findOne({ _id: product, deletedAt: null }).select("_id").lean();
    if (!exists) return response(false, 404, "Product not found");

    // TODO: Replace this with your real auth/user extraction
    // For now we accept an optional header "x-user-id" or set null
    const userId = req.headers.get("x-user-id") || null;

    const doc = await Review.create({
      product,
      user: userId,       // may be null; replace with actual user id from session
      rating,
      title: String(title).trim(),
      review: String(review).trim(),
      status: "unapproved", // moderation flow
      deletedAt: null,
    });

    return response(true, 201, "Review submitted for moderation", { _id: doc._id });
  } catch (err) {
    return catchError(err, "Failed to create review");
  }
}
