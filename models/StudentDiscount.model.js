// models/StudentDiscount.model.js
import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    alt: { type: String, default: "" },
    path: { type: String, required: true },
  },
  { _id: false }
);

const StudentDiscountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: { type: String, required: true, trim: true }, // original (for display)
    // 🔒 Use this to block duplicates (digits-only)
    phoneNumberNormalized: {
      type: String,
      required: true,
      index: true,
      unique: true,
      trim: true,
    },
    collegeName: { type: String, required: true, trim: true },
    collegePhoneNumber: { type: String, required: true, trim: true },
    idCardPhoto: { type: imageSchema, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.StudentDiscount ||
  mongoose.model("StudentDiscount", StudentDiscountSchema);
