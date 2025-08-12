import { connectDB } from "@/lib/DB";
import Review from "@/models/Review.model";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    await connectDB();

    // Use your given user and product IDs here:
    const dummyReview = {
      user: new mongoose.Types.ObjectId("6898e45f56e35fe387a384e6"),
      product: new mongoose.Types.ObjectId("689793bd99307eef7e23a30a"),
      rating: 4,
      title: "Dummy Review Title",
      review: "This is a dummy review created for testing.",
      status: "approved",
    };

    const review = new Review(dummyReview);
    await review.save();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Dummy review created",
        data: review,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
