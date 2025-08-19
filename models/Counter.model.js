import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g., "order_display_seq"
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

export default mongoose.models.Counter || mongoose.model("Counter", CounterSchema);
