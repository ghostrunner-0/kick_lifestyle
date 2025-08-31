// models/PathaoLedger.js
import mongoose from "mongoose";

const PathaoLedgerSchema = new mongoose.Schema(
  {
    // Identifiers
    consignmentId: { type: String, index: true },            // e.g., "DL121224VS8TTJ"
    displayOrderId: { type: String, index: true },           // your display_order_id / merchant_order_id

    // Event info
    event: {
      type: String,
      required: true,
      index: true,
      // keep enum open—Pathao may add new events; we handle order.* in code anyway
      // enum: ["order.created","order.updated","order.delivered","order.returned","order.delivery-failed","order.paid"]
    },
    storeId: { type: Number, index: true, default: null },

    // Money
    currency: { type: String, default: "NPR" },
    deliveryFee: { type: Number, default: 0 },               // Pathao charge
    collectedAmount: { type: Number, default: 0 },           // COD collected (on delivered)
    netPayout: { type: Number, default: 0 },                 // collectedAmount - deliveryFee (our quick calc)

    // Extras
    invoiceId: { type: String, default: null },              // on order.paid
    reason: { type: String, default: null },                 // on returned / delivery-failed, etc.

    // Raw timestamps from Pathao payload (kept as-is for audit)
    updatedAtRaw: { type: String, default: null },           // "2024-12-27 23:53:23"
    timestampRaw: { type: String, default: null },           // "2024-12-27T17:53:23+00:00"

    // Optional: stash full payload if you want deeper audits later
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// Helpful indexes for queries & rollups
// PathaoLedgerSchema.index({ displayOrderId: 1, createdAt: -1 });
// PathaoLedgerSchema.index({ consignmentId: 1, event: 1, createdAt: -1 });
// PathaoLedgerSchema.index({ event: 1, createdAt: -1 });
// PathaoLedgerSchema.index({ storeId: 1, createdAt: -1 });

// Optional de-dupe (enable if you want to prevent duplicate rows on retries)
// PathaoLedgerSchema.index(
//   { consignmentId: 1, event: 1, timestampRaw: 1, updatedAtRaw: 1 },
//   { unique: true, partialFilterExpression: { consignmentId: { $exists: true } } }
// );

const PathaoLedger =
  mongoose.models.PathaoLedger || mongoose.model("PathaoLedger", PathaoLedgerSchema);

export default PathaoLedger;
