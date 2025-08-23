// models/ServiceHisab.model.js
import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const DOC_MODELS = ["ServiceRequestOnline", "ServiceRequestOffline"];
const KINDS = ["expense", "settlement"];               // two categories
const EXPENSE_TYPES = ["shipping", "repair"];          // only for kind=expense

const ServiceHisabSchema = new Schema(
  {
    // Link to the service request (online or offline)
    docModel: { type: String, enum: DOC_MODELS, required: true, index: true },
    doc: { type: Types.ObjectId, refPath: "docModel", required: true, index: true },

    // What kind of entry is this?
    kind: { type: String, enum: KINDS, required: true, index: true },

    // Only when kind = "expense"
    expenseType: {
      type: String,
      enum: EXPENSE_TYPES,
      default: null,
      validate: {
        validator: function (v) {
          // if kind is "expense", must have one of EXPENSE_TYPES
          if (this.kind === "expense") return EXPENSE_TYPES.includes(v);
          // if not expense, must be null
          return v === null || v === undefined;
        },
        message: "expenseType required for expense and must be one of shipping|repair",
      },
    },

    amount: { type: Number, required: true, min: 0.01 }, // NPR

    // Who recorded it (admin/staff)
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true },

    when: { type: Date, default: () => new Date(), index: true }, // when it happened (or recorded)
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

ServiceHisabSchema.index({ docModel: 1, doc: 1, when: -1 });
ServiceHisabSchema.index({ kind: 1, expenseType: 1 });

export default mongoose.models.ServiceHisab ||
  mongoose.model("ServiceHisab", ServiceHisabSchema);
