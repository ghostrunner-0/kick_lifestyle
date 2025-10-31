// /models/DarazToken.model.js
import mongoose from "mongoose";

const DarazTokenSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "daraz" },

    access_token: { type: String, required: true },
    refresh_token: { type: String },

    expires_in: { type: Number }, // seconds
    refresh_expires_in: { type: Number }, // seconds

    account: { type: String }, // seller account (optional)
    country: { type: String },
    country_user_info: { type: Array },

    raw: { type: mongoose.Schema.Types.Mixed },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.DarazToken ||
  mongoose.model("DarazToken", DarazTokenSchema);
