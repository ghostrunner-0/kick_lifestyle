// models/Orders.model.js

import mongoose from "mongoose";
import { ORDER_STATUSES } from "@/lib/constants/orderStatus";

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
    khalti_id: String, // payer's Khalti ID (mobile or wallet ID)
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
    khalti: KhaltiMetaSchema,
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

    // Customer snapshot
    customer: {
      fullName: String,
      phone: String,
    },

    // Shipping address
    address: AddressSchema,

    // Line items
    items: { type: [ItemSchema], required: true },

    // Amounts
    amounts: AmountsSchema,

    // Payment method + meta
    paymentMethod: {
      type: String,
      enum: ["cod", "khalti", "qr"],
      required: true,
    },

    payment: PaymentSchema,

    // Shipping meta
    shipping: {
      carrier: { type: String, default: "pathao" },
      trackingId: String,
      pricePlanPayload: mongoose.Schema.Types.Mixed,
    },

    // Coupon snapshot
    coupon: CouponSchema,

    // Status (shared with UI)
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "processing",
      index: true,
    },

    notes: String,
    orderNumber: { type: String, index: true },

    // Display ID & sequence
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

// Useful index for payment lookup
OrderSchema.index({ "payment.khalti.pidx": 1 }, { sparse: true });

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

export default Order;
