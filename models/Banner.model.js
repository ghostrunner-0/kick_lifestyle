// models/Banner.model.js
import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    alt: { type: String, default: "" },
    path: { type: String, required: true },
  },
  { _id: false }
);

const BannerSchema = new mongoose.Schema(
  {
    desktopImage: { type: imageSchema, required: true },
    mobileImage: { type: imageSchema, required: true },
    href: { type: String, trim: true, default: "#" },
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, required: true, min: 0, index: true },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

const Banner =
  mongoose.models.Banner || mongoose.model("Banner", BannerSchema, "Banners");

export default Banner;
