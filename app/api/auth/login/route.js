// app/api/auth/login/route.js
export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/DB";
import OTP from "@/models/OTP.model";
import User from "@/models/User.model";
import { sendMail } from "@/lib/sendMail.js";
import { zSchema } from "@/lib/zodSchema";
import { response, catchError } from "@/lib/helperFunctions";

const RESET_URL = "http://localhost:3000/auth/reset-password";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    // Require BOTH email and password (prevents OTP spam)
    const parsed = zSchema
      .pick({ email: true, password: true })
      .safeParse(body);
    if (!parsed.success) {
      return response(false, "Invalid email or password", 400);
    }

    const { email, password } = parsed.data;

    // 1) Find user
    const user = await User.findOne({ email, deletedAt: null }).select(
      "+password"
    );
    if (!user) return response(false, "Invalid email or password", 401);

    // 2) If legacy/WP -> force reset; do NOT issue OTP
    if (user.provider === "wordpress" || user?.legacy?.hash) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Password reset required",
          action: "RESET_REQUIRED",
          redirectURL: RESET_URL,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3) Local bcrypt password check (fixes 'wrong pass still logs in')
    if (!user.password) {
      return response(false, "Invalid email or password", 401);
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return response(false, "Invalid email or password", 401);

    // 4) Clean up previous active OTPs
    await OTP.deleteMany({ email, used: { $ne: true } });

    // 5) Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await OTP.create({
      email,
      otp,
      expiresAt,
      used: false,
      meta: {
        ip:
          (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
          null,
        ua: req.headers.get("user-agent") || null,
      },
    });

    // 6) Send email
    const templateIdOtp = process.env.BREVO_TEMPLATE_ID_OTP;
    await sendMail(
      "Your Login OTP for Kick Lifestyle",
      email,
      { otp },
      { templateId: templateIdOtp, tags: ["login-otp"] }
    );

    return response(true, "OTP sent successfully", 201);
  } catch (err) {
    console.error("send-otp error:", err);
    return catchError(err);
  }
}
