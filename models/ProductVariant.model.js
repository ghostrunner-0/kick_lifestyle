import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  { _id: { type: String, required: true }, alt: { type: String, default: "" }, path: { type: String, required: true } },
  { _id: false }
);

const ProductVariantSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },

    variantName: { type: String, required: true, trim: true, maxlength: 100 },

    mrp: { type: Number, required: true },
    specialPrice: { type: Number },

    // ✅ Per-variant stock
    stock: {
      type: Number,
      default: 0,
      min: 0,
      validate: { validator: Number.isInteger, message: "Stock must be an integer" },
      index: true,
    },

    productGallery: {
      type: [imageSchema],
      validate: [{ validator: (arr) => Array.isArray(arr) && arr.length > 0, message: "At least one gallery image is required." }],
      required: true,
      default: [],
    },
    swatchImage: { type: imageSchema, required: false },

    sku: { type: String, required: true, trim: true, unique: true, uppercase: true },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

ProductVariantSchema.index({ product: 1, deletedAt: 1 });

// ---- Recalc helper: sum all non-deleted variant stocks for a product
async function recalcProductStock(productId) {
  if (!productId) return;

  const rows = await mongoose.model("ProductVariant").aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), deletedAt: null } },
    { $group: { _id: "$product", total: { $sum: { $ifNull: ["$stock", 0] } }, count: { $sum: 1 } } },
  ]);

  const row = rows[0];

  if (row && row.count > 0) {
    // Product has variants -> set sum and hasVariants=true
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      $set: { stock: row.total, hasVariants: true },
    });
  } else {
    // No variants -> keep existing product.stock; just flip hasVariants=false
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      $set: { hasVariants: false },
      // ❌ do NOT touch stock here
    });
  }
}

// Trigger after create/update/soft-delete/remove
ProductVariantSchema.post("save", async function () {
  try { await recalcProductStock(this.product); } catch (e) { console.error(e); }
});

ProductVariantSchema.post("findOneAndUpdate", async function (doc) {
  try {
    const pid = doc?.product || this.getQuery()?.product || this.getUpdate()?.product;
    await recalcProductStock(pid);
  } catch (e) { console.error(e); }
});

ProductVariantSchema.post("deleteOne", { document: false, query: true }, async function () {
  try {
    const doc = await this.model.findOne(this.getQuery()).select("product").lean();
    await recalcProductStock(doc?.product);
  } catch (e) { console.error(e); }
});

ProductVariantSchema.post("deleteMany", async function () {
  try {
    const q = this.getQuery() || {};
    if (q.product) await recalcProductStock(q.product);
  } catch (e) { console.error(e); }
});

export default mongoose.models.ProductVariant ||
  mongoose.model("ProductVariant", ProductVariantSchema, "productVariants");
