// app/api/account/change-password/route.js
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import User from "@/models/User.model";

import bcrypt from "bcryptjs";
import { z } from "zod";

/* ---------- validation ---------- */
const ChangePwSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function PUT(req) {
  console.log("🟠 [change-password:PUT] API HIT");

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.warn("❌ [change-password] No session/email");
      return response(false, 401, "Unauthorized");
    }

    await connectDB();
    console.log("✅ [change-password] DB connected");

    const payload = await req.json().catch(() => ({}));
    console.log(
      "📩 [change-password] Incoming body keys:",
      Object.keys(payload || {})
    );

    const parsed = ChangePwSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("❌ [change-password] Zod error:", parsed.error.issues);
      return response(
        false,
        400,
        parsed.error.issues?.[0]?.message || "Invalid input",
        parsed.error
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const email = String(session.user.email).toLowerCase();
    console.log("🔹 [change-password] session email:", email);

    const user = await User.findOne({ email, deletedAt: null });
    if (!user) {
      console.warn("❌ [change-password] User not found:", email);
      return response(false, 404, "User not found");
    }

    // Only allow for credentials users (as your UI enforces)
    if ((user.provider || "credentials") !== "credentials") {
      console.warn(
        "⚠️ [change-password] Non-credentials provider:",
        user.provider
      );
      return response(
        false,
        400,
        "Password is managed by your sign-in provider."
      );
    }

    // Verify current password
    const hasPw = Boolean(user.password);
    if (!hasPw) {
      console.warn("⚠️ [change-password] No existing password set");
      return response(false, 400, "No password set for this account.");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      console.warn("❌ [change-password] Current password mismatch");
      return response(false, 400, "Current password is incorrect.");
    }

    // Avoid same-as-old
    const sameAsOld = await bcrypt.compare(newPassword, user.password);
    if (sameAsOld) {
      console.warn("⚠️ [change-password] New password equals old password");
      return response(
        false,
        400,
        "New password must be different from the current password."
      );
    }

    // Hash & save
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    user.password = hashed;

    await user.save();
    console.log(
      "✅ [change-password] Password updated for:",
      user._id?.toString?.()
    );

    // Optional: add a timestamp field to track last password change
    // user.passwordChangedAt = new Date(); await user.save();

    return response(true, 200, "Password updated successfully.");
  } catch (err) {
    console.error("💥 [change-password] Error:", err);
    return catchError(err);
  }
}
