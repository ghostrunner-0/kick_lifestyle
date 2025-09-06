// models/HomePageBanner.model.js
import mongoose from "mongoose";

// Reuse your image subdocument shape, adding `url`
const imageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // your file/id
    alt: { type: String, default: "" },
    path: { type: String, required: true }, // storage path
    url: { type: String, default: "" }, // public URL or click-through URL
  },
  { _id: false }
);

// Singleton document with fixed _id => guarantees only one row exists
const homePageBannerSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "home-page-banner", immutable: true },
    image: { type: imageSchema, required: true },
  },
  { timestamps: true, collection: "home_page_banner" }
);

// Convenience helpers
homePageBannerSchema.statics.getSingleton = function () {
  return this.findById("home-page-banner").lean();
};

homePageBannerSchema.statics.upsertImage = function (image) {
  return this.findByIdAndUpdate(
    "home-page-banner",
    { image },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
};

const HomePageBanner =
  mongoose.models.HomePageBanner ||
  mongoose.model("HomePageBanner", homePageBannerSchema);

export default HomePageBanner;
