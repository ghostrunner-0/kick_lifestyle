// models/ServiceIssue.model.js
import mongoose from "mongoose";
const { Schema, Types } = mongoose;

/**
 * A catalog entry like:
 *  - categoryName: "true wireless earbuds"
 *  - issueName: "Left bud not charging"
 */
const ServiceIssueSchema = new Schema(
  {
    // optional link to your Category collection, if you have one
    categoryId: { type: Types.ObjectId, ref: "Category", default: null, index: true },

    // denormalized for quick filtering/search
    categoryName: { type: String, required: true, trim: true },

    // visible label of the complaint
    issueName: { type: String, required: true, trim: true },



    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ServiceIssueSchema.index({ categoryName: 1, issueName: 1 }, { unique: true });

export default mongoose.models.ServiceIssue ||
  mongoose.model("ServiceIssue", ServiceIssueSchema);
