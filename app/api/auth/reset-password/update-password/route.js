import { catchError, response } from "@/lib/helperFunctions";
import { zSchema } from "@/lib/zodSchema";
import { connectDB } from "@/lib/DB";
import UserModel from "@/models/User.model";

export async function PUT(req) {
  try {
    await connectDB();

    const payload = await req.json();

    // Validate payload with Zod schema
    const validationSchema = zSchema.pick({
      email: true,
      password: true,
    });

    const parsedData = validationSchema.safeParse(payload);

    if (!parsedData.success) {
      return response(false, 400, parsedData.error.flatten());
    }

    const { email, password } = parsedData.data;

    // Find the user
    const user = await UserModel.findOne({ email }).select("+password");

    if (!user) {
      return response(false, 404, "User not found");
    }

    // Update password (make sure your schema hashes this on save)
    user.password = password;
    await user.save();

    return response(true, 200, "Password updated successfully");
  } catch (error) {
    return catchError(error, "Failed to update password");
  }
}
