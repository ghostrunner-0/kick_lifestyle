import mongoose from "mongoose";

const shippingSchema = new mongoose.Schema(
  {
    carrier: {
      type: String,
      default: "pathao",
      trim: true,
    },
    consignmentId: {
      type: String,
      required: true,
      unique: true, // Automatically indexed
      trim: true,
    },
    order_display_id: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes only for non-unique fields
shippingSchema.index({ phoneNumber: 1 });
shippingSchema.index({ order_display_id: 1 });

// ✅ Prevent OverwriteModelError
const Shipping =
  mongoose.models.Shipping || mongoose.model("Shipping", shippingSchema);

export default Shipping;
