import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const digits10 = (s) => (String(s || "").match(/\d+/g) || []).join("").slice(0, 10);

// one line item inside a registration
const ItemSchema = new Schema(
  {
    product: {
      productId:  { type: Types.ObjectId, ref: "Product",        index: true, default: null },
      variantId:  { type: Types.ObjectId, ref: "ProductVariant", index: true, default: null },
      productName:{ type: String, required: true, trim: true },
      variantName:{ type: String, default: "", trim: true },
    },
    serial: {
      type: String,
      required: true,
      set: (v) => String(v || "").trim().toUpperCase(),
    },
    warrantyMonths: { type: Number, required: true },
  },
  { _id: false }
);

const WarrantyRegistrationSchema = new Schema(
  {
    userId:  { type: Types.ObjectId, ref: "User",  index: true, default: null },
    orderId: { type: Types.ObjectId, ref: "Order", index: true, default: null }, // one doc per order
    channel: { type: String, enum: ["kick", "daraz", "offline"], required: true, index: true },
    shopName:{ type: String, required: true, trim: true },
    offlineShopId: { type: Types.ObjectId, ref: "OfflineShop", default: null, index: true },

    customer: {
      name:  { type: String, required: true, trim: true },
      phone: { type: String, required: true, set: (v) => digits10(v) },
    },

    // MULTIPLE products in one registration
    items: { type: [ItemSchema], default: [], validate: v => Array.isArray(v) && v.length > 0 },

    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// helpful indexes
WarrantyRegistrationSchema.index({ "items.serial": 1 }, { unique: true });
WarrantyRegistrationSchema.index({ orderId: 1 }, { unique: true, sparse: true });
WarrantyRegistrationSchema.index({ "customer.phone": 1, createdAt: -1 });
WarrantyRegistrationSchema.index({ channel: 1, createdAt: -1 });

// IMPORTANT: drop the cached model so changes take effect during hot-reload
const MODEL = "WarrantyRegistration";
try { mongoose.deleteModel(MODEL); } catch (_) {}
export default mongoose.model(MODEL, WarrantyRegistrationSchema);
