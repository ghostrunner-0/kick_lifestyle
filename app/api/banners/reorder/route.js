import { z } from "zod";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import Banner from "@/models/Banner.model";

// Zod schema to validate reorder payload
const reorderZ = z.array(
  z.object({
    _id: z.string().min(1, "Banner _id is required"),
    order: z.number().int().min(0, "Order must be a positive integer"),
  })
);

export async function PUT(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 401, "User Not Allowed");

    await connectDB();

    const raw = await req.json();
    const parsed = reorderZ.safeParse(raw);
    if (!parsed.success) {
      return response(
        false,
        400,
        "Invalid or missing fields",
        parsed.error.format()
      );
    }

    const updates = parsed.data;

    // Perform updates in bulk
    const bulkOps = updates.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { order: item.order } },
      },
    }));

    if (bulkOps.length > 0) {
      await Banner.bulkWrite(bulkOps);
    }

    return response(true, 200, "Banners reordered successfully");
  } catch (err) {
    return catchError(err, "Failed to reorder banners");
  }
}
