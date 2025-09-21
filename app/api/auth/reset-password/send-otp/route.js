// app/api/auth/send-otp/route.js
export const runtime = "nodejs";

import { connectDB } from "@/lib/DB";
import { generateotp, response } from "@/lib/helperFunctions";
import { zSchema } from "@/lib/zodSchema";
import UserModel from "@/models/User.model";
import OTP from "@/models/OTP.model";
import { sendMail } from "@/lib/sendMail.js"; // template-only Brevo sender

export async function POST(request) {
  try {
    await connectDB();

    const payload = await request.json();

    // Validate only email
    const validationSchema = zSchema.pick({ email: true });
    const { email } = validationSchema.parse(payload);

    const user = await UserModel.findOne({ email });
    if (!user) {
      return response(false, 404, "User not found");
    }

    // Remove existing OTPs
    await OTP.deleteMany({ email });

    // Generate & save new OTP
    const otp = await generateotp();
    await new OTP({ email, otp }).save();

    // Send via Brevo TEMPLATE ONLY
    const templateIdOtp =
      parseInt(process.env.BREVO_TEMPLATE_ID_OTP ?? "", 10) || 0;

    console.log("[SEND OTP] templateId:", templateIdOtp);

    if (!templateIdOtp) {
      console.error("[SEND OTP] Missing BREVO_TEMPLATE_ID_OTP");
      return response(false, 500, "OTP email template not configured");
    }

    const sendResult = await sendMail(
      "Your Login OTP for Kick Lifestyle", // optional subject override
      email,
      {
        // Use {{ params.otp }} in your Brevo template
        otp,
        // Include only if your template expects them:
        // validityMinutes: 10,
        // appName: "Kick Lifestyle",
        // firstName: user.name,
        // supportEmail: "support@kick.com.np",
      },
      { templateId: templateIdOtp, tags: ["login-otp"] }
    );

    if (!sendResult?.success) {
      console.error("[SEND OTP] Brevo send failed:", sendResult?.message);
      return response(false, 500, "Failed to send OTP email");
    }

    return response(true, 200, "OTP sent to your email successfully");
  } catch (error) {
    console.error("[SEND OTP] Error:", error);
    return response(false, 500, error.message || "Internal Server Error");
  }
}
