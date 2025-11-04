// app/api/account/profile/route.js
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import { zSchema } from "@/lib/zodSchema";
import User from "@/models/User.model";

/* ---------- utils ---------- */
const digits10 = (s) =>
  (String(s || "").match(/\d+/g) || []).join("").slice(-10);

/* ---------- GET /api/account/profile ----------
   Returns the signed-in user's minimal profile
------------------------------------------------ */
export async function GET() {
  console.log("🟢 [profile:GET] API HIT");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.warn("❌ [profile:GET] No session / email");
      return response(false, 401, "Unauthorized");
    }

    await connectDB();
    console.log("✅ [profile:GET] DB connected");

    const email = session.user.email.toLowerCase();
    console.log("🔹 [profile:GET] session email:", email);

    const user = await User.findOne({ email, deletedAt: null })
      .select("name email phone provider")
      .lean();

    if (!user) {
      console.warn("❌ [profile:GET] User not found:", email);
      return response(false, 404, "User not found");
    }

    console.log("✅ [profile:GET] Found user:", user._id?.toString?.());
    return response(true, 200, "Profile fetched", {
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      provider: user.provider ?? "credentials",
    });
  } catch (err) {
    console.error("💥 [profile:GET] Error:", err);
    return catchError(err);
  }
}

/* ---------- PUT /api/account/profile ----------
   Updates name and/or phone of the signed-in user
   Body: { name?: string, phone?: string }
------------------------------------------------ */
export async function PUT(req) {
  console.log("🟠 [profile:PUT] API HIT");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.warn("❌ [profile:PUT] No session / email");
      return response(false, 401, "Unauthorized");
    }

    await connectDB();
    console.log("✅ [profile:PUT] DB connected");

    const payload = await req.json().catch(() => ({}));
    console.log("📩 [profile:PUT] Incoming body:", payload);

    // allow partial updates; at least one of name/phone should be present
    const schema = zSchema.pick({ name: true, phone: true }).partial();
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      console.error("❌ [profile:PUT] Zod error:", parsed.error.issues);
      return response(false, 400, "Invalid input", parsed.error);
    }

    let { name, phone } = parsed.data;
    if (
      (name === undefined || name === null || String(name).trim() === "") &&
      (phone === undefined || phone === null || String(phone).trim() === "")
    ) {
      console.warn("⚠️ [profile:PUT] No fields to update");
      return response(false, 400, "Nothing to update");
    }

    const email = session.user.email.toLowerCase();
    console.log("🔹 [profile:PUT] session email:", email);

    const update = {};
    if (typeof name === "string") {
      update.name = name.trim();
    }
    if (typeof phone === "string") {
      const clean = digits10(phone);
      update.phone = clean;
      console.log("☎️ [profile:PUT] cleaned phone:", clean);
    }

    const result = await User.findOneAndUpdate(
      { email, deletedAt: null },
      { $set: update },
      { new: true, projection: "name email phone provider" }
    ).lean();

    if (!result) {
      console.warn("❌ [profile:PUT] User not found:", email);
      return response(false, 404, "User not found");
    }

    console.log(
      "✅ [profile:PUT] Updated user:",
      result._id?.toString?.(),
      "->",
      update
    );
    return response(true, 200, "Profile updated", {
      name: result.name ?? "",
      email: result.email ?? "",
      phone: result.phone ?? "",
      provider: result.provider ?? "credentials",
    });
  } catch (err) {
    console.error("💥 [profile:PUT] Error:", err);
    return catchError(err);
  }
}
