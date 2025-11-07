import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    variantId: { type: String, default: null },
    name: String,
    variantName: String,
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    mrp: { type: Number, default: 0 },
    image: String,
  },
  { _id: false }
);

const AddressSchema = new mongoose.Schema(
  {
    cityId: String,
    cityLabel: String,
    zoneId: String,
    zoneLabel: String,
    areaId: String,
    areaLabel: String,
    landmark: String,
  },
  { _id: false }
);

const AmountsSchema = new mongoose.Schema(
  {
    subtotal: Number,
    discount: Number,
    shippingCost: Number,
    codFee: Number,
    total: Number,
    currency: { type: String, default: "NPR" },
  },
  { _id: false }
);

const CouponSchema = new mongoose.Schema(
  {
    code: String,
    mode: String, // "money" | "freeItem"
    discountType: String, // "fixed" | "percent"
    discountAmount: Number,
    discountApplied: Number,
    freeItem: {
      productId: String,
      variantId: String,
      productName: String,
      variantName: String,
      qty: Number,
    },
  },
  { _id: false }
);

const KhaltiMetaSchema = new mongoose.Schema(
  {
    pidx: String,
    status: String,
    transaction_id: String,
    total_amount: Number,
    khalti_id: String, // ✅ NEW: payer's Khalti ID (mobile or wallet ID)
    verifiedAt: Date,
    payment_url: String,
    expires_at: Date,
    initiateAt: Date,
  },
  { _id: false }
);

const PaymentSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
    provider: String, // e.g., "khalti"
    providerRef: String, // txn/ref id
    khalti: KhaltiMetaSchema, // ✅ nested Khalti details
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    // User linkage
    userId: { type: String, required: true, index: true },
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    user: {
      name: String,
      email: { type: String, index: true },
    },

    customer: {
      fullName: String,
      phone: String,
    },

    address: AddressSchema,
    items: { type: [ItemSchema], required: true },
    amounts: AmountsSchema,

    paymentMethod: {
      type: String,
      enum: ["cod", "khalti", "qr"],
      required: true,
    },

    payment: PaymentSchema, // ✅ now includes full Khalti meta

    shipping: {
      carrier: { type: String, default: "pathao" },
      trackingId: String,
      pricePlanPayload: mongoose.Schema.Types.Mixed,
    },

    coupon: CouponSchema,

    status: {
      type: String,
      enum: [
        "processing",
        "pending payment",
        "payment Not Verified",
        "Invalid Payment",
        "cancelled",
        "completed",
        "ready to pack",
        "ready to ship",
      ],
      default: "processing",
      index: true,
    },

    notes: String,
    orderNumber: { type: String, index: true },

    display_order_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    display_order_seq: { type: Number, required: true, index: true },
    display_order_prefix: { type: String, required: true },
  },
  { timestamps: true }
);

// Optional performance optimization
OrderSchema.index({ "payment.khalti.pidx": 1 }, { sparse: true });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
