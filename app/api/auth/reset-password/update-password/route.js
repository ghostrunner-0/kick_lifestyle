import { catchError, response } from "@/lib/helperFunctions";
import { zSchema } from "@/lib/zodSchema";
import { connectDB } from "@/lib/DB";
import UserModel from "@/models/User.model";

export async function PUT(req) {
  try {
    await connectDB();

    const payload = await req.json();

    // Validate input
    const validationSchema = zSchema.pick({
      email: true,
      password: true,
    });

    const parsed = validationSchema.safeParse(payload);
    if (!parsed.success) {
      return response(false, 400, parsed.error.flatten());
    }

    const { email, password } = parsed.data;

    // Find the user (include password + provider for transformation)
    const user = await UserModel.findOne({ email }).select(
      "+password +provider +legacy"
    );

    if (!user) {
      return response(false, 404, "User not found");
    }

    // --- Convert user from WordPress -> Credentials ---
    user.provider = "credentials";
    user.password = password; // pre('save') hook will hash it
    user.legacy = undefined; // remove entire legacy object
    user.markModified("legacy"); // mark as modified for Mongoose cleanup

    await user.save();

    // hide sensitive fields in response
    const safeUser = user.toObject();
    delete safeUser.password;

    return response(
      true,
      200,
      "Password updated, provider set to credentials, and legacy removed",
      safeUser
    );
  } catch (error) {
    return catchError(error, "Failed to update password and provider");
  }
}
