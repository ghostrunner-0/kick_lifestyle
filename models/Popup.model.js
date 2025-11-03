// models/Popup.model.js
import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    alt: { type: String, default: "" },
    path: { type: String, required: true },
  },
  { _id: false }
);

const PopupSchema = new mongoose.Schema(
  {
    variant: {
      type: String,
      enum: ["simple", "coupon", "launch"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String },

    couponCode: { type: String },
    image: { type: imageSchema, default: null },
    ctaLabel: { type: String },
    ctaHref: { type: String },

    enabled: { type: Boolean, default: true },
    startAt: { type: Date, default: Date.now },
    endAt: { type: Date },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Popup || mongoose.model("Popup", PopupSchema);