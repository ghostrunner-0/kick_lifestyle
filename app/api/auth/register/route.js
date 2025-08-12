import { emailVerificationLink } from "@/email/emailVerificationLink";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { sendMail } from "@/lib/sendMail";
import { zSchema } from "@/lib/zodSchema";
import UserModel from "@/models/User.model";
import { SignJWT } from "jose";

export async function POST(req) {
  try {
    await connectDB();

    // Extend validation schema to include phone
    const validationSchema = zSchema.pick({
      name: true,
      email: true,
      password: true,
      phone: true,   // added phone here
    });

    const payload = await req.json();
    const validatedData = validationSchema.safeParse(payload);

    if (!validatedData.success) {
      return response(
        false,
        400,
        "Invalid or missing input field",
        validatedData.error
      );
    }

    const { name, email, password, phone } = validatedData.data;

    const existingUser = await UserModel.exists({ email });
    if (existingUser) {
      return response(false, 409, "User already exists");
    }

    const newUser = new UserModel({
      name,
      email,
      password,
      phone,  // save phone in DB
    });

    await newUser.save();

    const secret = new TextEncoder().encode(process.env.SECRET_KEY);
    const token = await new SignJWT({ userId: newUser.id })
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
      true,
      200,
      "Registration successful, please verify your email."
    );
  } catch (error) {
    return catchError(error);
  }
}
