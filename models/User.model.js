// models/User.model.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "admin", "sales", "editor"],
      default: "user",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true },

    // store current local hash here when provider === "credentials"
    password: {
      type: String,
      required: function () {
        return !this.provider || this.provider === "credentials";
      },
      select: false,
    },

    provider: {
      type: String,
      enum: ["credentials", "google", "wordpress"],
      default: "credentials",
    },

    // NEW: keep the original WP hash without touching it
    legacy: {
      source: { type: String, enum: ["wordpress", null], default: null },
      hash: { type: String, default: null }, // e.g. "$P$B..." or "$2y$..."
      algo: { type: String, default: null }, // "phpass" | "bcrypt" | "argon2" | "md5"
    },

    isEmailVerified: { type: Boolean, default: false },
    phone: { type: String, trim: true, default: null },
    address: { type: String, trim: true, default: null },
    deletedAt: { type: Date, default: null, index: true },

    pathaoCityId: { type: Number, default: null },
    pathaoCityLabel: { type: String, default: null },
    pathaoZoneId: { type: Number, default: null },
    pathaoZoneLabel: { type: String, default: null },
    pathaoAreaId: { type: Number, default: null },
    pathaoAreaLabel: { type: String, default: null },
  },
  { timestamps: true }
);

// Hash password only for our own "credentials" provider
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  if (this.provider === "wordpress") return next(); // never rehash the WP hash
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.User ||
  mongoose.model("User", userSchema, "users");
