import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Review from "@/models/Review.model";
import Product from "@/models/Product.model";
import User from "@/models/User.model";
import { isValidObjectId } from "mongoose";

export async function GET(req, { params }) {
  try {
    // Authenticate admin
    const auth = await isAuthenticated("admin");
    if (!auth) return response(false, 403, "Unauthorized");

    await connectDB();
    const param = await params;
    const { id } = param;

    if (!isValidObjectId(id)) {
      return response(false, 400, "Invalid review ID");
    }

    const review = await Review.findOne({ _id: id, deletedAt: null })
      .populate("product", "name heroImage")
      .populate("user", "name email")
      .lean();

    if (!review) {
      return response(false, 404, "Review not found");
    }

    return response(true, 200, "Review found", review);
  } catch (error) {
    return catchError(error);
  }
}

export async function PUT(req, { params }) {
  try {
    // Authenticate admin
    const auth = await isAuthenticated("admin");
    if (!auth) return response(false, 403, "Unauthorized");

    await connectDB();

    const { id } = params;

    if (!isValidObjectId(id)) {
      return response(false, 400, "Invalid review ID");
    }

    const body = await req.json();
    const { status } = body;

    if (!["approved", "unapproved", "spam"].includes(status)) {
      return response(false, 400, "Invalid status value");
    }

    const updatedReview = await Review.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { status },
      { new: true }
    )
      .populate("product", "name heroImage")
      .populate("user", "name email")
      .lean();

    if (!updatedReview) {
      return response(false, 404, "Review not found or already deleted");
    }

    return response(true, 200, "Review status updated", updatedReview);
  } catch (error) {
    return catchError(error);
  }
}
