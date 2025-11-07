// app/api/auth/register/route.js
export const runtime = "nodejs";

import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { sendMail } from "@/lib/sendMail.js"; // <-- template-only sender
import { zSchema } from "@/lib/zodSchema";
import UserModel from "@/models/User.model";
import { SignJWT } from "jose";

export async function POST(req) {
  try {
    await connectDB();

    // Validate input (includes phone)
    const validationSchema = zSchema.pick({
      name: true,
      email: true,
      password: true,
      phone: true,
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

    // Check if user exists
    const existingUser = await UserModel.exists({ email });
    if (existingUser) {
      return response(false, 409, "User already exists");
    }

    // Create user
    const newUser = new UserModel({ name, email, password, phone });
    await newUser.save();

    // Create verification token
    const secret = new TextEncoder().encode(process.env.SECRET_KEY);
    const token = await new SignJWT({ userId: newUser.id })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setProtectedHeader({ alg: "HS256" })
      .sign(secret);

    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email/${token}`;

    // Send verification email via Brevo TEMPLATE ONLY
    const templateIdVerify =
      parseInt(process.env.BREVO_TEMPLATE_ID_VERIFY ?? "", 10) || 0;

    console.log("[REGISTER VERIFY] templateId:", templateIdVerify);

    if (!templateIdVerify) {
      console.error("[REGISTER VERIFY] Missing BREVO_TEMPLATE_ID_VERIFY");
      return response(false, 500, "Verification email template not configured");
    }

    const sendStatus = await sendMail(
      "Email Verification Request from Kick Lifestyle", // optional subject override
      email,
      {
        // Make sure your Brevo template uses {{ params.verificationUrl }}
        verificationUrl,
        // Optional extras if you added them to your template:
        // firstName: name,
        // appName: "Kick Lifestyle",
        // supportEmail: "support@kick.com.np",
      },
      { templateId: templateIdVerify, tags: ["verify-email"] }
    );

    if (!sendStatus?.success) {
      console.error("[REGISTER VERIFY] Send failed:", sendStatus?.message);
      return response(false, 500, "Failed to send verification email");
    }

    return response(
      true,
      200,
      "Registration successful, please verify your email."
    );
  } catch (error) {
    return catchError(error);
  }
}
