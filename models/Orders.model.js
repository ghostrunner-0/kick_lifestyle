// models/Order.js
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

const OrderSchema = new mongoose.Schema(
  {
    // User linkage + snapshot
    userId: { type: String, required: true, index: true },
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    user: {
      name: String,
      email: { type: String, index: true },
    },

    // Customer details at time of order
    customer: {
      fullName: String,
      phone: String,
    },

    // Address snapshot
    address: AddressSchema,

    // Items
    items: { type: [ItemSchema], required: true },

    // Amounts snapshot
    amounts: AmountsSchema,

    // Payment (status: only paid/unpaid)
    paymentMethod: { type: String, enum: ["cod", "khalti", "qr"], required: true },
    payment: {
      status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
      provider: String,      // e.g., "khalti"
      providerRef: String,   // gateway txn/ref id
    },

    // Shipping (no status field)
    shipping: {
      carrier: { type: String, default: "pathao" },
      trackingId: String,
      pricePlanPayload: mongoose.Schema.Types.Mixed,
    },

    // Coupon snapshot
    coupon: CouponSchema,

    // Main order status
    status: {
      type: String,
      enum: [
        "processing",
        "pending payment",
        "payment Not Verified",
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
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
