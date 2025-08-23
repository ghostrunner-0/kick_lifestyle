import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const digits10 = (s) => (String(s || "").match(/\d+/g) || []).join("").slice(-10);

const LineItemSchema = new Schema(
  {
    productId:   { type: Types.ObjectId, ref: "Product", default: null },
    variantId:   { type: Types.ObjectId, ref: "ProductVariant", default: null },
    productName: { type: String, required: true, trim: true },
    quantity:    { type: Number, required: true, min: 1 },
    targetPrice: { type: Number, default: null }, // per unit if provided
    note:        { type: String, default: "" },
  },
  { _id: false }
);

const CorporateOrderSchema = new Schema(
  {
    companyName:   { type: String, required: true, trim: true, index: true },
    contactName:   { type: String, required: true, trim: true },
    email:         { type: String, required: true, trim: true, lowercase: true, index: true },
    phone:         { type: String, required: true, set: (v) => digits10(v), index: true },

    preferredContact: { type: String, enum: ["email", "phone", "whatsapp"], default: "email", index: true },

    address:       { type: String, default: "" },
    message:       { type: String, default: "" },

    items: {
      type: [LineItemSchema],
      default: [],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },

    budgetTotal:   { type: Number, default: null },

    // admin workflow
    status: { type: String, enum: ["new", "in_progress", "quoted", "won", "lost"], default: "new", index: true },
    source: { type: String, default: "website", index: true },

    // audit
    meta: {
      ip:        { type: String, default: "" },
      userAgent: { type: String, default: "" },
      referer:   { type: String, default: "" },
    },
  },
  { timestamps: true }
);

CorporateOrderSchema.index({ createdAt: -1 });

const MODEL = "CorporateOrder";
try { mongoose.deleteModel(MODEL); } catch (_) {}
export default mongoose.model(MODEL, CorporateOrderSchema);
