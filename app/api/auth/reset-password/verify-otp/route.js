import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import { zSchema } from "@/lib/zodSchema";
import UserModel from "@/models/User.model";
import OTP from "@/models/OTP.model";

export async function POST(request) {
  try {
    await connectDB();

    const payload = await request.json();
    const validationSchema = zSchema.pick({ email: true, otp: true });
    const { email, otp } = validationSchema.parse(payload);
    if (!validationSchema) {
      return response(false, 400, "Invalid input data");
    }
    const user = await OTP.findOne({ email, otp });
    if (!user) {
      return response(false, 404, "Invalid OTP or email");
    }
    // Delete the OTP after successful verification
    await OTP.deleteOne({ email, otp });
    const existingUser = await UserModel.findOne({ email });
    if (!existingUser) {
      return response(false, 404, "User not found");
    }
    // Update user's password or any other necessary fields
    return response(true, 200, "OTP verified successfully");
  } catch (error) {
    return response(false, 500, error.message || "Internal Server Error");
  }
}
