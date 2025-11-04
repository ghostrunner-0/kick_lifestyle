// app/api/auth/send-otp/route.js
export const runtime = "nodejs";

import { connectDB } from "@/lib/DB";
import OTP from "@/models/OTP.model";
import { sendMail } from "@/lib/sendMail.js";
import { zSchema } from "@/lib/zodSchema";
import { response, catchError } from "@/lib/helperFunctions"; // ✅ your old custom responder

export async function POST(req) {
  console.log("🟢 [send-otp] API HIT");

  try {
    await connectDB();
    console.log("✅ [send-otp] MongoDB connected");

    const body = await req.json();
    console.log("📩 [send-otp] Incoming body:", body);

    const parsed = zSchema.pick({ email: true }).safeParse(body);
    if (!parsed.success) {
      console.error("❌ [send-otp] Invalid payload:", parsed.error.errors);
      return response(false, "Invalid email", 400);
    }

    const { email } = parsed.data;
    console.log("🔹 [send-otp] Email received:", email);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("🟡 [send-otp] OTP generated:", otp);

    // Save to DB
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
    const doc = await OTP.create({ email, otp, expiresAt });
    console.log("🧾 [send-otp] OTP stored in DB:", {
      email: doc.email,
      otp: doc.otp,
      expiresAt: doc.expiresAt,
    });

    // Send email
    console.log("✉️ [send-otp] Sending email now...");
    const templateIdOtp = process.env.BREVO_TEMPLATE_ID_OTP;
    const mailRes = await sendMail(
      "Your Login OTP for Kick Lifestyle",
      email,
      {
        otp,
      },
      { templateId: templateIdOtp, tags: ["login-otp"] }
    );
    console.log("✅ [send-otp] Email sent response:", mailRes);

    console.log("🎉 [send-otp] Done for:", email);
    return response(true, "OTP sent successfully", 201);
  } catch (err) {
    console.error("💥 [send-otp] Error:", err);
    return catchError(err);
  }
}
