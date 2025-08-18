// models/PathaoToken.model.js
import mongoose from "mongoose";

const PathaoTokenSchema = new mongoose.Schema(
  {
    provider: { type: String, default: "pathao", unique: true },
    access_token: { type: String, required: true },
    refresh_token: { type: String, required: true },
    token_type: { type: String, default: "Bearer" },
    // when the access token expires (ms since epoch)
    expires_at: { type: Number, required: true },
    // raw response if you want to inspect/debug
    raw: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.PathaoToken ||
  mongoose.model("PathaoToken", PathaoTokenSchema, "pathao_tokens");
