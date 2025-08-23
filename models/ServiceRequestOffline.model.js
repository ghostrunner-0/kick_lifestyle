// models/ServiceRequestOffline.model.js
import mongoose from "mongoose";
import {
  normalizeSerialsArray,
  SERVICE_STATUS,
  INTAKE_METHODS,
  PAYER,
} from "./_serviceShared.js";

const { Schema, Types } = mongoose;

const OfflineItemSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: "Product", index: true, default: null },
    variantId: { type: Types.ObjectId, ref: "ProductVariant", index: true, default: null },
    productName: { type: String, required: true, trim: true },
    variantName: { type: String, default: "", trim: true },

    serials: {
      type: [String],
      required: true,
      set: normalizeSerialsArray,
    },

    issueId: { type: Types.ObjectId, ref: "ServiceIssue", default: null },
    issueName: { type: String, required: true, trim: true },
    categoryName: { type: String, required: true, trim: true },

    status: { type: String, enum: SERVICE_STATUS, default: "received", index: true },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const ServiceRequestOfflineSchema = new Schema(
  {
    channel: { type: String, default: "offline", immutable: true },

    shopId: { type: Types.ObjectId, ref: "OfflineShop", required: true, index: true },
    // snapshot for quick tables even if shop doc changes later
    shop: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, default: "", trim: true },
      location: { type: String, default: "", trim: true },
      contactPerson: { type: String, default: "", trim: true },
    },

    // Optional customer details if the shop forwarded them
    customer: {
      name: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
    },

    intake: {
      method: { type: String, enum: INTAKE_METHODS, required: true, index: true },
      payer: { type: String, enum: PAYER, default: null }, // for indrive/pathao
      amount: { type: Number, default: 0 },
      reference: { type: String, default: "" },            // airway bill, rider name, etc.
    },

    items: { type: [OfflineItemSchema], validate: v => Array.isArray(v) && v.length > 0 },

    status: { type: String, enum: SERVICE_STATUS, default: "received", index: true },

    adminNote: { type: String, default: "" },
    attachments: [{ type: String, default: "" }],
  },
  { timestamps: true }
);

ServiceRequestOfflineSchema.pre("validate", function (next) {
  const m = this.intake?.method;
  if (m === "indrive" || m === "pathao") {
    if (!this.intake?.payer) return next(new Error("intake.payer required for indrive/pathao"));
  }
  next();
});

ServiceRequestOfflineSchema.index({ createdAt: -1 });
ServiceRequestOfflineSchema.index({ shopId: 1, createdAt: -1 });
ServiceRequestOfflineSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.ServiceRequestOffline ||
  mongoose.model("ServiceRequestOffline", ServiceRequestOfflineSchema);
