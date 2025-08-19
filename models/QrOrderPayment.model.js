// models/QROrderPayment.model.js
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    path: { type: String, required: true },
    mime: { type: String },
    size: { type: Number },
    url: { type: String },
  },
  { _id: false }
);

/**
 * A QR payment submission tied to an ORDER (ObjectId),
 * not the display id. Admin will approve/reject.
 */
const QROrderPaymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    displayOrderId: { type: String },  // optional, helpful for file naming / UI

    amount: { type: Number, required: true }, // store in NPR (or use paisa if you prefer)

    proof: { type: fileSchema, required: true }, // screenshot

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true },
  },
  { timestamps: true }
);

QROrderPaymentSchema.index({ createdAt: -1 });

export default mongoose.models.QROrderPayment ||
  mongoose.model("QROrderPayment", QROrderPaymentSchema, "qr_order_payments");
