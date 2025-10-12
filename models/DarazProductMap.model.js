// /models/DarazProductMap.js
import mongoose from "mongoose";

const DarazProductMapSchema = new mongoose.Schema(
  {
    // Daraz identifiers (store as much as you can)
    seller_sku:   { type: String, index: true, unique: true, sparse: true }, // preferred handle
    daraz_sku_id: { type: Number, index: true, sparse: true },               // SkuId
    daraz_item_id:{ type: String, index: true, sparse: true },               // item_id (string)
    daraz_status: { type: String }, // Active/Pending/Rejected/etc (optional mirror)

    // Your site linkage (REQUIRED: product; optional: variant)
    product_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    variant_id:   { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", index: true },

    // Mirrors for quick UI (optional)
    product_name: String,
    variant_name: String,

    // Admin info
    notes: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

DarazProductMapSchema.index({ daraz_item_id: 1, daraz_sku_id: 1 }, { sparse: true });

export default mongoose.models.DarazProductMap ||
  mongoose.model("DarazProductMap", DarazProductMapSchema, "DarazProductMap");
