// /models/DarazProductMap.model.js
import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const norm = (s) => (s == null ? "" : String(s)).trim();
const normSku = (s) => norm(s).toUpperCase();

const DarazProductMapSchema = new Schema(
  {
    /* ------------ Daraz side ------------ */

    // Core keys
    seller_sku: { type: String, default: "" },
    seller_sku_norm: { type: String, default: "", index: true },

    shop_sku: { type: String, default: "" },
    shop_sku_norm: { type: String, default: "", index: true },

    // IDs from /products/get → skus[]
    daraz_sku_id: { type: String, default: "", index: true }, // SkuId
    daraz_item_id: { type: String, default: "", index: true }, // item_id
    sku_id: { type: String, default: "", index: true }, // kept if you already used it

    // Human labels
    // attributes.name from Daraz = product title
    daraz_product_name: { type: String, default: "" },
    // Built from sku attributes / options (e.g. "Black / 128GB") in your /api/daraz/skus layer
    daraz_variant_name: { type: String, default: "" },

    daraz_status: { type: String, default: "" },

    /* ------------ Website side ------------ */

    // Always mapped to at least a Product
    product_id: {
      type: Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // Optional variant: null = product-level mapping
    variant_id: {
      type: Types.ObjectId,
      ref: "ProductVariant",
      default: null,
      index: true,
    },

    // Cached for fast UI (no need to populate every time)
    product_name: { type: String, default: "" },
    variant_name: { type: String, default: "" },

    /* ------------ Extras ------------ */
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
