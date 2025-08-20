import mongoose from "mongoose";

const OfflineShopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },           // shop phone
    location: { type: String, trim: true },        // address / city etc.
    contactPerson: { type: String, trim: true },   // person at shop
  },
  { timestamps: true }
);

// Helpful indexes
OfflineShopSchema.index({ name: 1 });
OfflineShopSchema.index({ phone: 1 });

export default mongoose.models.OfflineShop ||
  mongoose.model("OfflineShop", OfflineShopSchema);
