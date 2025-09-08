import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ["user", "admin", "sales","editor"],
      default: "user",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.provider || this.provider === "credentials";
      },
      select: true, // 👈 Important fix: allow password to be selectable
    },
    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    pathaoCityId: {
      type: Number,
      default: null,
    },
    pathaoCityLabel: {
      type: String,
      default: null,
    },
    pathaoZoneId: {
      type: Number,
      default: null,
    },
    pathaoZoneLabel: {
      type: String,
      default: null,
    },
    pathaoAreaId: {
      type: Number,
      default: null,
    },
    pathaoAreaLabel: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// 🔒 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🧪 Instance method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🧾 Export the model
export default mongoose.models.User ||
  mongoose.model("User", userSchema, "users");
