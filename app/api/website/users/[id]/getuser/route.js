// app/api/website/[id]/getuser/route.js
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import User from "@/models/User.model";
import { isValidObjectId } from "mongoose";

export async function GET(req, { params }) {
  try {
    // Must be logged in (any role)
    const sessionUser = await isAuthenticated(); // assumes no role filter → user/admin/shopkeeper okay
    if (!sessionUser) return response(false, 401, "Unauthorized");

    await connectDB();

    const { id } = params || {};
    if (!id || !isValidObjectId(id)) {
      return response(false, 400, "Invalid user ID");
    }

    // Only allow fetching your own profile
    if (String(sessionUser._id) !== String(id)) {
      return response(false, 403, "Forbidden");
    }

    // Fetch safe fields only (never include password)
    const user = await User.findOne({ _id: id, deletedAt: null })
      .select(
        "_id role name email isEmailVerified phone address " +
          "pathaoCityId pathaoCityLabel pathaoZoneId pathaoZoneLabel pathaoAreaId pathaoAreaLabel " +
          "createdAt updatedAt"
      )
      .lean();

    if (!user) return response(false, 404, "User not found");

    return response(true, 200, "User fetched", user);
  } catch (err) {
    return catchError(err, "Something went wrong");
  }
}
