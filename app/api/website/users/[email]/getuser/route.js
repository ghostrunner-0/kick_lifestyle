// app/api/website/[email]/getuser/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import User from "@/models/User.model";

export async function GET(_req, { params }) {
  try {
    // 1) Read session from NextAuth (v4)
    const session = await getServerSession(authOptions);
    const sessionEmail = (session?.user?.email || "").toLowerCase();
    if (!sessionEmail) return response(false, 401, "Unauthorized");

    // 2) Email from route param
    const param =await params
    const requested = decodeURIComponent(param?.email || "").toLowerCase();
    if (!requested) return response(false, 400, "Missing email");

    // 3) Only allow fetching your own profile
    if (requested !== sessionEmail) return response(false, 403, "Forbidden");

    // 4) Fetch user by email
    await connectDB();
    const user = await User.findOne({ email: requested, deletedAt: null })
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
