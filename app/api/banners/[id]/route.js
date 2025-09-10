// app/api/banners/[id]/route.js
import { z } from "zod";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import Banner from "@/models/Banner.model";

/* ---------------- Shared helpers (match create route) ---------------- */
const imageZ = z.object({
  _id: z.string(),
  alt: z.string().optional().default(""),
  path: z.string(),
});

// Allow '#abc' or '#aabbcc'
const hexColorRegex = /^#(?:[A-Fa-f0-9]{3}){1,2}$/;
const normalizeHex = (v) => {
  const val = String(v || "").trim();
  return val.startsWith("#") ? val : `#${val}`;
};

/* ---------------- Zod payload for UPDATE (PUT) ---------------- */
const payloadZ = z.object({
  desktopImage: imageZ.optional(),
  mobileImage: imageZ.optional(),
  href: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  bgColor: z
    .string()
    .trim()
    .transform(normalizeHex)
    .refine((v) => hexColorRegex.test(v), {
      message: "Enter a valid HEX color, e.g. #fcba17",
    })
    .optional(),
});

const normalizeImage = (img) =>
  img
    ? { _id: String(img._id), alt: img.alt ?? "", path: String(img.path) }
    : undefined;

/* --------------- GET /api/banners/:id --------------- */
export async function GET(_req, { params }) {
  try {
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");

    await connectDB();
    const { id } = (await params) || {};
    if (!id) return response(false, 400, "Missing banner id");

    const banner = await Banner.findById(id).lean();
    if (!banner) return response(false, 404, "Banner not found");

    return response(true, 200, "Banner fetched successfully", banner);
  } catch (err) {
    return catchError(err, "Failed to fetch banner");
  }
}

/* --------------- PUT /api/banners/:id --------------- */
export async function PUT(req, { params }) {
  try {
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");

    await connectDB();
    const { id } = (await params) || {};
    if (!id) return response(false, 400, "Missing banner id");

    const raw = await req.json();
    const parsed = payloadZ.safeParse(raw);
    if (!parsed.success) {
      return response(false, 400, "Invalid or missing fields", parsed.error.format());
    }
    const data = parsed.data;

    // Current doc
    const current = await Banner.findById(id);
    if (!current) return response(false, 404, "Banner not found");

    const update = {};
    if (data.desktopImage) update.desktopImage = normalizeImage(data.desktopImage);
    if (data.mobileImage) update.mobileImage = normalizeImage(data.mobileImage);
    if (typeof data.href === "string") update.href = data.href.trim();
    if (typeof data.active === "boolean") update.active = data.active;
    if (typeof data.bgColor === "string") update.bgColor = data.bgColor; // normalized + validated

    // Handle order re-indexing (gap-free)
    if (typeof data.order === "number") {
      const oldOrder = Number.isFinite(current.order) ? current.order : 0;
      let newOrder = data.order;

      // Clamp to [0, maxOrder]
      const maxDoc = await Banner.findOne()
        .sort({ order: -1 })
        .select({ order: 1 })
        .lean();
      const maxOrder = Number.isFinite(maxDoc?.order) ? maxDoc.order : 0;
      if (newOrder > maxOrder) newOrder = maxOrder;

      if (newOrder !== oldOrder) {
        if (newOrder < oldOrder) {
          // Moving up: shift down [newOrder, oldOrder-1]
          await Banner.updateMany(
            { _id: { $ne: current._id }, order: { $gte: newOrder, $lt: oldOrder } },
            { $inc: { order: 1 } }
          );
        } else {
          // Moving down: shift up (oldOrder, newOrder]
          await Banner.updateMany(
            { _id: { $ne: current._id }, order: { $gt: oldOrder, $lte: newOrder } },
            { $inc: { order: -1 } }
          );
        }
        update.order = newOrder;
      }
    }

    const updated = await Banner.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!updated) return response(false, 404, "Banner not found after update");

    return response(true, 200, "Banner updated successfully", updated);
  } catch (err) {
    return catchError(err, "Failed to update banner");
  }
}

/* --------------- DELETE /api/banners/:id (HARD DELETE) --------------- */
export async function DELETE(_req, { params }) {
  try {
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");

    await connectDB();
    const { id } = (await params) || {};
    if (!id) return response(false, 400, "Missing banner id");

    // Fetch to know its order, then hard delete
    const toRemove = await Banner.findById(id).lean();
    if (!toRemove) return response(false, 404, "Banner not found");

    await Banner.deleteOne({ _id: id });

    // Shift down any items that were after the removed one
    await Banner.updateMany({ order: { $gt: toRemove.order } }, { $inc: { order: -1 } });

    return response(true, 200, "Banner deleted successfully", { _id: id });
  } catch (err) {
    return catchError(err, "Failed to delete banner");
  }
}
