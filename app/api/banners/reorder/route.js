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
    // ✅ allow admin + editor
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");

    await connectDB();

    const raw = await req.json();
    const parsed = reorderZ.safeParse(raw);
    if (!parsed.success) {
      return response(false, 400, "Invalid or missing fields", parsed.error.format());
    }

    const updates = parsed.data;

    // bulk update orders
    const bulkOps = updates.map(({ _id, order }) => ({
      updateOne: { filter: { _id }, update: { $set: { order } } },
    }));

    if (bulkOps.length) {
      await Banner.bulkWrite(bulkOps);
    }

    return response(true, 200, "Banners reordered successfully");
  } catch (err) {
    return catchError(err, "Failed to reorder banners");
  }
}
