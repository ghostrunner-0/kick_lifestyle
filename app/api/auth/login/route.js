import { emailVerificationLink } from "@/email/emailVerificationLink";
import { connectDB } from "@/lib/DB";
import { catchError, generateotp, response } from "@/lib/helperFunctions";
import { otpEmail } from "@/email/otpemail";
import { sendMail } from "@/lib/sendMail";
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
      .extend({
        password: z.string(),
      });

    const parsedData = validationSchema.parse(payload);
    const { email, password } = parsedData;

    const getUser = await User.findOne({ email });
    if (!getUser) {
      return response(false, 404, "Invalid email or password");
    }

    if (getUser.isEmailVerified === false) {
      const secret = new TextEncoder().encode(process.env.SECRET_KEY);
      const token = await new SignJWT({ userId: getUser.id })
        .setIssuedAt()
        .setExpirationTime("1h")
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret);

      const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email/${token}`;
      const emailContent = emailVerificationLink(verificationUrl);

      await sendMail(
        "Email Verification Request from Kick Lifestyle",
        email,
        emailContent
      );

      return response(
        false,
        401,
        "Your email is not verified yet. We've sent you a verification link."
      );
    }

    const isPasswordValid = await getUser.comparePassword(password);
    if (!isPasswordValid) {
      return response(false, 401, "Invalid email or password");
    }

    await OTP.deleteMany({ email });

    const otp = generateotp();
    const otpData = new OTP({ email, otp });
    await otpData.save();

    const otpEmailStatus = await sendMail(
      "Your Login OTP for Kick Lifestyle",
      email,
      otpEmail(otp)
    );

    if (!otpEmailStatus) {
      return response(false, 500, "Failed to send OTP email");
    }

    return response(true, 200, "OTP sent to your email successfully");

  } catch (error) {
    return catchError(error);
  }
}
