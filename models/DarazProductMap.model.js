// /models/DarazProductMap.model.js
import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const norm = (s) => (s == null ? "" : String(s)).trim();
const normSku = (s) => norm(s).toUpperCase();

const DarazProductMapSchema = new Schema(
  {
    /* ------------ Daraz side ------------ */
    seller_sku: { type: String, default: "" },
    seller_sku_norm: { type: String, default: "", index: true },

    shop_sku: { type: String, default: "" },
    shop_sku_norm: { type: String, default: "", index: true },

    daraz_sku_id: { type: String, default: "", index: true },
    daraz_item_id: { type: String, default: "", index: true },
    sku_id: { type: String, default: "", index: true },

    // Store Daraz product title + status so mapping list is self-contained
    daraz_name: { type: String, default: "" },
    daraz_status: { type: String, default: "" },

    /* ------------ Website side ------------ */
    // Always map to at least a Product
    product_id: {
      type: Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // Optional: specific variant. Null = product-level mapping (all variants / generic).
    variant_id: {
      type: Types.ObjectId,
      ref: "ProductVariant",
      default: null,
      index: true,
    },

    // Cached labels so UI doesn't need extra populate
    product_name: { type: String, default: "" },
    variant_name: { type: String, default: "" },

    /* ------------ Extra ------------ */
    warranty_months: { type: Number, default: null },
    notes: { type: String, default: "" },

    created_by: { type: Types.ObjectId, ref: "User", default: null },
    updated_by: { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

/* ------------ Hooks ------------ */

DarazProductMapSchema.pre("save", function (next) {
  this.seller_sku_norm = normSku(this.seller_sku);
  this.shop_sku_norm = normSku(this.shop_sku);
  next();
});

DarazProductMapSchema.pre("findOneAndUpdate", function (next) {
  const u = this.getUpdate() || {};

  const applyNorm = (obj) => {
    if (!obj) return;
    if ("seller_sku" in obj) obj.seller_sku_norm = normSku(obj.seller_sku);
    if ("shop_sku" in obj) obj.shop_sku_norm = normSku(obj.shop_sku);
  };

  if (u.$set) {
    applyNorm(u.$set);
  } else {
    applyNorm(u);
  }

  next();
});

/* ------------ Indexes ------------ */
// flexible but safe
DarazProductMapSchema.index({ seller_sku_norm: 1 });
DarazProductMapSchema.index({ shop_sku_norm: 1 });
DarazProductMapSchema.index({ product_id: 1, variant_id: 1 });
DarazProductMapSchema.index({ daraz_item_id: 1 });
DarazProductMapSchema.index({ daraz_sku_id: 1 });
DarazProductMapSchema.index({ sku_id: 1 });

const MODEL = "DarazProductMap";
try {
  mongoose.deleteModel(MODEL);
} catch {}
export default mongoose.model(MODEL, DarazProductMapSchema);
