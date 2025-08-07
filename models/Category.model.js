import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // string ID from media collection
    alt: { type: String, default: "" },
    path: { type: String, required: true }, // image path or URL
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 50,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      minlength: 3,
      unique: true,
      lowercase: true,
      trim: true,
    },
    image: {
      type: imageSchema,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Category =
  mongoose.models.Category ||
  mongoose.model("Category", categorySchema, "categories");
export default Category;
