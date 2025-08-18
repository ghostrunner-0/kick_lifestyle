import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import User from "@/models/User.model";
import Review from "@/models/Review.model";
import Product from "@/models/Product.model";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/website/reviews?productId=...&page=1&limit=10&sort=newest|highest|lowest&rating=1..5
 * Public: returns only approved reviews
 */
export async function GET(req) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");
    if (!productId || !isValidObjectId(productId)) {
      return response(false, 400, "Invalid productId");
    }

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(30, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
    const sortParam = String(url.searchParams.get("sort") || "newest").toLowerCase();
    const rating = url.searchParams.get("rating"); // optional

    // Ensure product exists
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

    const [rawItems, total] = await Promise.all([
      Review.find(query)
        .select("_id rating title review createdAt user")
        .populate({ path: "user", select: "name" })
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
    ]);

    const items = (rawItems || []).map((r) => ({
      _id: r._id,
      rating: r.rating,
      title: r.title,
      review: r.review,
      createdAt: r.createdAt,
      userName: r?.user?.name || "Verified buyer",
    }));

    return response(true, 200, "Reviews fetched", { items, total, page, pageSize: limit });
  } catch (err) {
    return catchError(err, "Failed to fetch reviews");
  }
}

/**
 * POST /api/website/reviews
 * Body: { product, rating (1..5), title, review }
 * Auth required. Server injects `user` from session.
 */
export async function POST(req) {
  try {
    // first, ensure the session is authenticated (lib/Authentication returns true)
    const auth = await isAuthenticated("user");
    if (!auth) return response(false, 401, "Please login to write a review");

    // get the server session and resolve the actual user id from DB
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!email) return response(false, 401, "Please login to write a review");

    await connectDB();
    const sessionUser = await User.findOne({ email, deletedAt: null }).select("_id").lean();
    if (!sessionUser) return response(false, 401, "Please login to write a review");
    const body = await req.json().catch(() => ({}));
    const { product, rating, title, review } = body || {};

    if (!product || !isValidObjectId(product)) return response(false, 400, "Invalid product");
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) return response(false, 400, "Rating must be between 1 and 5");
    if (!title || !String(title).trim()) return response(false, 400, "Title is required");
    if (!review || !String(review).trim()) return response(false, 400, "Review text is required");

    const exists = await Product.findOne({ _id: product, deletedAt: null }).select("_id").lean();
    if (!exists) return response(false, 404, "Product not found");

    const doc = await Review.create({
      product,
      user: sessionUser._id, // stamp from session
      rating: r,
      title: String(title).trim(),
      review: String(review).trim(),
      status: "unapproved", // moderation
      deletedAt: null,
    });

    return response(true, 201, "Review submitted. It will appear after moderation.", { _id: doc._id });
  } catch (err) {
    return catchError(err, "Failed to create review");
  }
}
