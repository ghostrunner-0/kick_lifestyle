// app/api/auth/send-otp/route.js
export const runtime = "nodejs";

import { emailVerificationLink } from "@/email/emailVerificationLink"; // (kept for reference; not used now)
import { connectDB } from "@/lib/DB";
import { catchError, generateotp, response } from "@/lib/helperFunctions";
import { sendMail } from "@/lib/sendMail.js"; // <-- our template-only sender
import { zSchema } from "@/lib/zodSchema";
import User from "@/models/User.model";
import { SignJWT } from "jose";
import OTP from "@/models/OTP.model";
import { z } from "zod";

export async function POST(request) {
  try {
    await connectDB();
    const payload = await request.json();

    const validationSchema = zSchema
      .pick({ email: true })
      .extend({ password: z.string() });

    const { email, password } = validationSchema.parse(payload);

    const getUser = await User.findOne({ email });
    if (!getUser) {
      return response(false, 404, "Invalid email or password");
    }

    // EMAIL VERIFICATION (template only)
    if (getUser.isEmailVerified === false) {
      const secret = new TextEncoder().encode(process.env.SECRET_KEY);
      const token = await new SignJWT({ userId: getUser.id })
        .setIssuedAt()
        .setExpirationTime("1h")
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret);

      const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email/${token}`;

      const templateIdVerify = parseInt(process.env.BREVO_TEMPLATE_ID_VERIFY ?? "", 10) || 0;
      console.log("[VERIFY] templateId:", templateIdVerify);

      if (!templateIdVerify) {
        console.error("[VERIFY] Missing BREVO_TEMPLATE_ID_VERIFY");
        return response(false, 500, "Verification email template not configured");
      }

      const sendStatus = await sendMail(
        "Email Verification Request from Kick Lifestyle", // optional subject override
        email,
        {
          // Use {{ params.verificationUrl }} in Brevo
          verificationUrl,
          // extras if your template has them:
          // firstName: getUser.firstName,
          // appName: "Kick Lifestyle",
          // supportEmail: "support@kick.com.np",
        },
        { templateId: templateIdVerify, tags: ["verify-email"] }
      );

      if (!sendStatus?.success) {
        console.error("[VERIFY] Send failed:", sendStatus?.message);
        return response(false, 500, "Failed to send verification email");
      }

      return response(
        false,
        401,
        "Your email is not verified yet. We've sent you a verification link."
      );
    }

    // PASSWORD CHECK
    const isPasswordValid = await getUser.comparePassword(password);
    if (!isPasswordValid) {
      return response(false, 401, "Invalid email or password");
    }

    // OTP CREATE
    await OTP.deleteMany({ email });
    const otp = generateotp();
    await new OTP({ email, otp }).save();

    // OTP SEND (template only)
    const templateIdOtp = parseInt(process.env.BREVO_TEMPLATE_ID_OTP ?? "", 10) || 0;
    console.log("[OTP] templateId:", templateIdOtp);

    if (!templateIdOtp) {
      console.error("[OTP] Missing BREVO_TEMPLATE_ID_OTP");
      return response(false, 500, "OTP email template not configured");
    }

    const otpEmailStatus = await sendMail(
      "Your Login OTP for Kick Lifestyle", // optional subject override
      email,
      {
        // Use {{ params.otp }} in Brevo
        otp,
        // Optional extras if present in your template:
        // validityMinutes: 10,
        // firstName: getUser.firstName,
        // appName: "Kick Lifestyle",
        // supportEmail: "support@kick.com.np",
      },
      { templateId: templateIdOtp, tags: ["login-otp"] }
    );

    if (!otpEmailStatus?.success) {
      console.error("[OTP] Send failed:", otpEmailStatus?.message);
      return response(false, 500, "Failed to send OTP email");
    }

    return response(true, 200, "OTP sent to your email successfully");
  } catch (error) {
    return catchError(error);
  }
}
