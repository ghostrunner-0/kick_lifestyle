import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    alt: { type: String, default: "" },
    path: { type: String, required: true },
  },
  { _id: false }
);

const PopupSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["image-link", "discount"], required: true },

    // Visual
    image: { type: imageSchema, required: true },

    // For image-link
    linkHref: { type: String, trim: true, default: "" },

    // For discount
    couponCode: { type: String, trim: true, default: "" },

    // Display controls
    isActive: { type: Boolean, default: true },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    priority: { type: Number, default: 10 },

    // Optional path targeting (prefix "*" wildcard: "/product/*")
    pages: [{ type: String }],

    // Frequency (frontend honors)
    frequency: {
      scope: {
        type: String,
        enum: ["once", "daily", "session", "always"],
        default: "session",
      },
      maxShows: { type: Number, default: 1 },
    },

    // UI overrides
    ui: {
      layout: {
        type: String,
        enum: ["centered", "edge", "sheet"],
        default: undefined,
      },
    },

    // Soft-delete & audit
    deletedAt: { type: Date, default: null, index: true },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Popup ||
  mongoose.model("Popup", PopupSchema, "popups");
