// models/ServiceRequestOnline.model.js
import mongoose from "mongoose";
import {
  normalizeSerialsArray,
  SERVICE_STATUS,
  INTAKE_METHODS,
  PAYER,
} from "./_serviceShared.js";

const { Schema, Types } = mongoose;

const ServiceItemSchema = new Schema(
  {
    // Link back to your WR document item/serials (optional)
    warrantyRegistrationId: { type: Types.ObjectId, ref: "WarrantyRegistration", index: true, default: null },

    // Product snapshot + refs
    productId: { type: Types.ObjectId, ref: "Product", index: true, default: null },
    variantId: { type: Types.ObjectId, ref: "ProductVariant", index: true, default: null },
    productName: { type: String, required: true, trim: true },
    variantName: { type: String, default: "", trim: true },

    // One request item can have multiple serials of the same product/variant
    serials: {
      type: [String],
      required: true,
      set: normalizeSerialsArray,
    },

    // Issue selection
    issueId: { type: Types.ObjectId, ref: "ServiceIssue", default: null },
    issueName: { type: String, required: true, trim: true },     // denormalized for quick view
    categoryName: { type: String, required: true, trim: true },  // denormalized

    // Per-item status & notes
    status: { type: String, enum: SERVICE_STATUS, default: "received", index: true },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const ServiceRequestOnlineSchema = new Schema(
  {
    channel: { type: String, default: "online", immutable: true },

    // Who & where it came from
    userId: { type: Types.ObjectId, ref: "User", default: null, index: true },
    orderId: { type: Types.ObjectId, ref: "Order", default: null, index: true },
    warrantyRegistrationId: { type: Types.ObjectId, ref: "WarrantyRegistration", default: null, index: true },

    // Customer snapshot (copied from WR)
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },

    // Intake / logistics
    intake: {
      method: { type: String, enum: INTAKE_METHODS, required: true, index: true }, // indrive|pathao|courier|walkin
      // only relevant for indrive/pathao
      payer: { type: String, enum: PAYER, default: null },
      amount: { type: Number, default: 0 }, // NPR
      reference: { type: String, default: "" }, // rider name, tracking no, etc.
    },

    items: { type: [ServiceItemSchema], validate: v => Array.isArray(v) && v.length > 0 },

    // Overall status (request-level)
    status: { type: String, enum: SERVICE_STATUS, default: "received", index: true },

    adminNote: { type: String, default: "" },
    attachments: [{ type: String, default: "" }], // file urls if you store photos
  },
  { timestamps: true }
);

// Validation: if intake is rider apps, payer must be set
ServiceRequestOnlineSchema.pre("validate", function (next) {
  const m = this.intake?.method;
  if (m === "indrive" || m === "pathao") {
    if (!this.intake?.payer) return next(new Error("intake.payer required for indrive/pathao"));
  }
  next();
});

ServiceRequestOnlineSchema.index({ createdAt: -1 });
ServiceRequestOnlineSchema.index({ "customer.phone": 1, createdAt: -1 });
ServiceRequestOnlineSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.ServiceRequestOnline ||
  mongoose.model("ServiceRequestOnline", ServiceRequestOnlineSchema);
