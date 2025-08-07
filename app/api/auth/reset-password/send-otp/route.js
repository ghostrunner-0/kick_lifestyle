import { connectDB } from "@/lib/DB";
import { generateotp, response } from "@/lib/helperFunctions";
import { zSchema } from "@/lib/zodSchema";
import UserModel from "@/models/User.model";
import OTP from "@/models/OTP.model";
import { otpEmail } from "@/email/otpemail";
import { sendMail } from "@/lib/sendMail";

export async function POST(request) {
  try {
    await connectDB();

    const payload = await request.json();

    // Only validate the `email` field
    const validationSchema = zSchema.pick({ email: true });
    const { email } = validationSchema.parse(payload);

    const user = await UserModel.findOne({ email });
    if (!user) {
      return response(false, 404, "User not found");
    }

    // Delete any existing OTPs for that email
    await OTP.deleteMany({ email });

    // Generate and save a new OTP
    const otp = await generateotp();
    const otpEntry = new OTP({ email, otp });
    await otpEntry.save();

    // Send the OTP email
    const emailSent = await sendMail(
      "Your Login OTP for Kick Lifestyle",
      email,
      otpEmail(otp)
    );

    if (!emailSent) {
      return response(false, 500, "Failed to send OTP email");
    }

    return response(true, 200, "OTP sent to your email successfully");
  } catch (error) {
    return response(false, 500, error.message || "Internal Server Error");
  }
}
