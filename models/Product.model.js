import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    alt: { type: String, default: "" },
    path: { type: String, required: true },
  },
  { _id: false }
);

const additionalInfoSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      minlength: 3,
      unique: true,
      lowercase: true,
      trim: true,
    },
    shortDesc: { type: String, trim: true, maxlength: 300 },

    // ✅ match the actual model name exactly ("Category")
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    mrp: { type: Number, required: true },
    specialPrice: { type: Number },

    showInWebsite: { type: Boolean, default: true, index: true },

    productMedia: {
      type: [imageSchema],
      validate: [
        {
          validator: (arr) => Array.isArray(arr) && arr.length > 0,
          message: "At least one product media is required.",
        },
      ],
      required: true,
      default: [],
    },
    descImages: {
      type: [imageSchema],
      validate: [
        {
          validator: (arr) => Array.isArray(arr) && arr.length > 0,
          message: "At least one description image is required.",
        },
      ],
      required: true,
      default: [],
    },

    heroImage: { type: imageSchema, required: true },

    additionalInfo: {
      type: [additionalInfoSchema],
      validate: [
        {
          validator: (arr) => Array.isArray(arr) && arr.length > 0,
          message: "At least one additional info entry is required.",
        },
      ],
      required: true,
      default: [],
    },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

// No extra schema.index({ category: 1 }) needed since field has index:true
const Product =
  mongoose.models.Product ||
  mongoose.model("Product", ProductSchema, "Products");

export default Product;
