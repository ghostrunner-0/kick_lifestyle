import mongoose from "mongoose";

// ✅ Reusable image schema for gallery & swatch
const imageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // media id from your media collection
    alt: { type: String, default: "" },
    path: { type: String, required: true }, // image URL/path
  },
  { _id: false }
);

const ProductVariantSchema = new mongoose.Schema(
  {
    // 🔗 Reference to Product
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", // must match your Product model name exactly
      required: true,
      index: true,
    },

    // Variant Name
    variantName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // MRP & Special Price
    mrp: { type: Number, required: true },
    specialPrice: { type: Number },

    // Product Gallery (multiple images)
    productGallery: {
      type: [imageSchema],
      validate: [
        {
          validator: (arr) => Array.isArray(arr) && arr.length > 0,
          message: "At least one gallery image is required.",
        },
      ],
      required: true,
      default: [],
    },

    // Swatch Image (single image)
    swatchImage: {
      type: imageSchema,
      required: false,
    },

    // SKU
    sku: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true,
    },

    // Soft delete
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

const ProductVariant =
  mongoose.models.ProductVariant ||
  mongoose.model("ProductVariant", ProductVariantSchema, "productVariants");

export default ProductVariant;
