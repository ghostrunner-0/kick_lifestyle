import mongoose from "mongoose";

/**
 * Matches your MediaSelector shape:
 * {
 *   _id: string,         // media id from library
 *   alt: string,         // filename/alt
 *   path: string         // public path like "/shared/xxx.jpg"
 * }
 */
const mediaRefSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    alt: { type: String, default: "" },
    path: { type: String, required: true },
  },
  { _id: false }
);

/**
 * Singleton config to show on the frontend.
 * Keep exactly one document with _id = "active".
 */
const PaymentQRConfigSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "active" },       // <— string id avoids ObjectId cast issues
    displayName: { type: String, required: true },  // e.g., "Sunita"
    image: { type: mediaRefSchema, required: true } // MediaSelector payload
  },
  { timestamps: true }
);

// force singleton
PaymentQRConfigSchema.index({ _id: 1 }, { unique: true });

export default mongoose.models.PaymentQRConfig ||
  mongoose.model("PaymentQRConfig", PaymentQRConfigSchema, "payment_qr_config");
