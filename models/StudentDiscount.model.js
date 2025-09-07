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

    // original (display)
    phoneNumber: { type: String, required: true, trim: true },

    // digits-only for uniqueness
    phoneNumberNormalized: {
      type: String,
      required: true,
      index: true,
      unique: true,
      trim: true,
    },

    collegeName: { type: String, required: true, trim: true },
    collegePhoneNumber: { type: String, required: true, trim: true },

    // Make this conditionally required: only required while "pending"
    idCardPhoto: {
      type: imageSchema,
      required: function () {
        // when status is pending, image must exist
        return (this.status || "pending") === "pending";
      },
    },

    // --- decision fields ---
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    decidedAt: { type: Date, default: null },

    // keep both user id and email that made the decision
    decidedBy: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      email: { type: String, default: null },
    },
  },
  { timestamps: true }
);

// small safety: normalize any backslashes in stored paths on save
StudentDiscountSchema.pre("save", function (next) {
  if (this.idCardPhoto?.path) {
    this.idCardPhoto.path = String(this.idCardPhoto.path).replace(/\\/g, "/");
  }
  next();
});

export default mongoose.models.StudentDiscount ||
  mongoose.model("StudentDiscount", StudentDiscountSchema);
