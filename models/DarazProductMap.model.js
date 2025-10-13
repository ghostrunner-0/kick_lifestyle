// /models/DarazProductMap.model.js
import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const norm = (s) => (s == null ? "" : String(s)).trim();
const normSku = (s) => norm(s).toUpperCase();

const DarazProductMapSchema = new Schema(
  {
    // Daraz-side keys
    seller_sku:     { type: String, default: "" },
    seller_sku_norm:{ type: String, default: "", index: true }, // auto-filled uppercased
    shop_sku:       { type: String, default: "" },
    shop_sku_norm:  { type: String, default: "", index: true }, // auto-filled uppercased
    daraz_sku_id:   { type: String, default: "", index: true }, // SkuId / order_item_id (string)
    sku_id:         { type: String, default: "", index: true }, // optional alias if you stored it this way

    // Website-side targets
    product_id:     { type: Types.ObjectId, ref: "Product", required: true, index: true },
    variant_id:     { type: Types.ObjectId, ref: "ProductVariant", default: null, index: true },

    // Optional override
    warranty_months:{ type: Number, default: null }, // if set, used as fallback when Product doc lacks it

    notes:          { type: String, default: "" },
  },
  { timestamps: true }
);

// Normalize keys on save/update
DarazProductMapSchema.pre("save", function(next) {
  this.seller_sku_norm = normSku(this.seller_sku);
  this.shop_sku_norm   = normSku(this.shop_sku);
  next();
});
DarazProductMapSchema.pre("findOneAndUpdate", function(next) {
  const u = this.getUpdate() || {};
  if (u.$set) {
    if ("seller_sku" in u.$set) u.$set.seller_sku_norm = normSku(u.$set.seller_sku);
    if ("shop_sku"   in u.$set) u.$set.shop_sku_norm   = normSku(u.$set.shop_sku);
  } else {
    if ("seller_sku" in u) u.seller_sku_norm = normSku(u.seller_sku);
    if ("shop_sku"   in u) u.shop_sku_norm   = normSku(u.shop_sku);
  }
  next();
});

// Helpful indexes
DarazProductMapSchema.index({ seller_sku_norm: 1, variant_id: 1 });
DarazProductMapSchema.index({ shop_sku_norm: 1, variant_id: 1 });
DarazProductMapSchema.index({ daraz_sku_id: 1 });
DarazProductMapSchema.index({ sku_id: 1 });

const MODEL = "DarazProductMap";
try { mongoose.deleteModel(MODEL); } catch {}
export default mongoose.model(MODEL, DarazProductMapSchema);
