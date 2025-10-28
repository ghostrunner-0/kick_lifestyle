import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const digits10 = (s) =>
  (String(s || "").match(/\d+/g) || []).join("").slice(0, 10);

const imageSchema = new Schema(
  {
    _id: { type: String, required: true },
    alt: { type: String, default: "" },
    path: { type: String, required: true },
  },
  { _id: false }
);

const OfflineRegistrationRequestSchema = new Schema(
  {
    // customer
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    phoneNormalized: { type: String, required: true, index: true },

    // product (store both product & variant snapshots)
    productId: {
      type: Types.ObjectId,
      ref: "Product",
      index: true,
      default: null,
    },
    productName: { type: String, required: true, trim: true }, // snapshot for convenience

    // NEW: variant info (optional)
    productVariantId: {
      type: Types.ObjectId,
      ref: "ProductVariant",
      index: true,
      default: null,
    },
    productVariantName: { type: String, trim: true, default: "" }, // e.g., "Harmonic Black"
    productVariantSku: { type: String, trim: true, default: null },

    // unit identity
    serial: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    purchaseDate: { type: Date, required: true },

    // channel
    purchasedFrom: {
      type: String,
      enum: ["kick", "daraz", "offline"],
      required: true,
      index: true,
    },
    shopName: { type: String, default: "", trim: true }, // required if offline

    // proof (warranty card image)
    purchaseProof: { type: imageSchema },

    // moderation
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    decidedAt: { type: Date, default: null },
    decidedBy: {
      user: { type: Types.ObjectId, ref: "User", default: null },
      email: { type: String, default: null },
    },

    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

/** Keep your original uniqueness rule */
OfflineRegistrationRequestSchema.index(
  { phoneNormalized: 1, serial: 1 },
  { unique: true }
);

/** Helpful for searches/reporting by product/variant/serial */
OfflineRegistrationRequestSchema.index({
  productId: 1,
  productVariantId: 1,
  serial: 1,
});

OfflineRegistrationRequestSchema.pre("validate", function (next) {
  this.phoneNormalized = digits10(this.phone);

  // Normalize snapshots from provided variant object if caller sets it
  if (!this.productVariantName && this.get("variant")?.variantName) {
    this.productVariantName = String(this.get("variant").variantName || "");
  }
  if (!this.productVariantSku && this.get("variant")?.sku) {
    this.productVariantSku = String(this.get("variant").sku || "");
  }

  if (this.purchasedFrom === "offline" && !this.shopName?.trim()) {
    return next(new Error("Shop name is required for 'Others' channel."));
  }
  next();
});

// hot reload safe
const MODEL = "OfflineRegistrationRequest";
try {
  mongoose.deleteModel(MODEL);
} catch {}
export default mongoose.model(MODEL, OfflineRegistrationRequestSchema);
