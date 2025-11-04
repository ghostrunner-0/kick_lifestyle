import mongoose from "mongoose";

const PopupSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    type: {
      type: String,
      enum: ["discount", "image-link", "launch"],
      required: true,
    },

    // Visuals
    imageUrl: { type: String, trim: true, required: true },
    noBackdrop: { type: Boolean, default: false }, // for image-link style "no bg"

    // Targeting
    pages: [{ type: String }], // ["/", "/category/*", "/product/*"] supports prefix wildcard
    priority: { type: Number, default: 10 },
    startAt: { type: Date, default: Date.now },
    endAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },

    // Frequency control (front-end honors)
    frequency: {
      scope: {
        type: String,
        enum: ["once", "daily", "session", "always"],
        default: "session",
      },
      maxShows: { type: Number, default: 1 }, // for "once" or "daily" you can still cap
    },

    // DISCOUNT fields
    couponCode: { type: String, trim: true },
    ctaText: { type: String, trim: true, default: "Shop Now" },
    ctaHref: { type: String, trim: true, default: "/" },

    // IMAGE-LINK fields
    linkHref: { type: String, trim: true },

    // LAUNCH fields
    launchTitle: { type: String, trim: true },
    launchSubtitle: { type: String, trim: true },
    launchAt: { type: Date, default: null },
    launchCtaText: { type: String, trim: true, default: "Notify Me" },
    launchCtaHref: { type: String, trim: true, default: "/notify" },

    // Tracking (simple counters)
    stats: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      copies: { type: Number, default: 0 },
    },

    // Admin audit
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.Popup ||
  mongoose.model("Popup", PopupSchema, "popups");
