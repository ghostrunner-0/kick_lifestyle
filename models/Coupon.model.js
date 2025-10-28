// /models/Coupon.model.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const CouponSchema = new Schema(
  {
    // Identity
    code: { type: String, required: true, unique: true, trim: true },

    // Discount
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountAmount: { type: Number, required: true, min: 0 },
    individualUse: { type: Boolean, default: true, index: true },

    // Free item (target a variant directly)
    freeItem: {
      product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
      variant: {
        type: Schema.Types.ObjectId,
        ref: "ProductVariant",
        default: null,
      },
      qty: { type: Number, min: 1, default: 1 },
    },

    // Applicability
    // If both arrays empty -> applies to all.
    // Keep specificProducts only if you need “any variant of product X”.
    specificProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }], // optional
    specificVariants: [{ type: Schema.Types.ObjectId, ref: "ProductVariant" }],

    // Usage limits
    perUserLimit: { type: Number, min: 0, default: 0 }, // 0 = unlimited
    totalLimit: { type: Number, min: 0, default: 0 }, // 0 = unlimited
    redemptionsTotal: { type: Number, min: 0, default: 0, index: true },

    // Switch discount after N total redemptions
    changeAfterUsage: { type: Number, min: 0, default: 0 }, // 0 = never
    newDiscountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: null,
    },
    newDiscountAmount: { type: Number, min: 0, default: null },

    // Soft delete
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

// Normalize code
CouponSchema.pre("save", function (next) {
  if (this.isModified("code") && typeof this.code === "string") {
    this.code = this.code.trim().toUpperCase();
  }
  next();
});

// Optional integrity checks
CouponSchema.pre("validate", function (next) {
  // If you want to force at least one targeting rule, uncomment:
  // if (
  //   (!this.specificProducts || this.specificProducts.length === 0) &&
  //   (!this.specificVariants || this.specificVariants.length === 0) &&
  //   !this.freeItem?.variant
  // ) {
  //   return next(new Error("Define scope or freeItem.variant for this coupon."));
  // }
  next();
});

// Effective discount helper
CouponSchema.virtual("effectiveDiscount").get(function () {
  const switched =
    this.changeAfterUsage > 0 && this.redemptionsTotal >= this.changeAfterUsage;

  const type =
    switched && this.newDiscountType ? this.newDiscountType : this.discountType;
  const amount =
    switched && (this.newDiscountAmount ?? null) != null
      ? this.newDiscountAmount
      : this.discountAmount;

  return { type, amount };
});

// Unique active code (ignores soft-deleted)
CouponSchema.index(
  { code: 1, deletedAt: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

// Fast lookups on targeting
CouponSchema.index({ specificVariants: 1 });
CouponSchema.index({ specificProducts: 1 });
CouponSchema.index({ "freeItem.variant": 1 });

const Coupon =
  mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema, "coupons");

export default Coupon;
