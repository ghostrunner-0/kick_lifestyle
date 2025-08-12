import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Product", // matches Product model name exactly
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // matches User model name exactly
    },
    rating: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    review: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["approved", "unapproved", "spam"],
      default: "unapproved",
      required: true,
    },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);


const Review =
  mongoose.models.Review || mongoose.model("Review", ReviewSchema, "reviews");

export default Review;
