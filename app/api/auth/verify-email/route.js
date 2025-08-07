import { catchError, response } from "@/lib/helperFunctions";
import { connectDB } from "@/lib/DB";
import { jwtVerify } from "jose";
import UserModel from "@/models/User.model"; 
export async function POST(req) {
  try {
    await connectDB();

    const { token } = await req.json();

    if (!token) {
      return response(false, 400, "Token is required");
    }

    const secret = new TextEncoder().encode(process.env.SECRET_KEY);
    const decoded = await jwtVerify(token, secret);

    const userId = decoded.payload.userId;
    if (!userId) {
      return response(false, 400, "Invalid token payload");
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return response(false, 404, "User not found");
    }

    user.isEmailVerified = true;
    await user.save();

    return response(true, 200, "Email verified successfully");
  } catch (error) {
    return catchError(error);
  }
}
