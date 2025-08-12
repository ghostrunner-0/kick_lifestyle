// app/api/banners/create/route.js
import { z } from "zod";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import Banner from "@/models/Banner.model";

// ---- Zod validation ----
const imageZ = z.object({
  _id: z.string(),
  alt: z.string().optional().default(""),
  path: z.string(),
});

const payloadZ = z.object({
  desktopImage: imageZ,
  mobileImage: imageZ,
  href: z.string().trim().min(1, "Href is required"),
  active: z.boolean().optional().default(true),
  order: z.number().int().min(0).optional(), // if omitted, we auto-assign
});

const normalizeImage = (img) => ({
  _id: String(img._id),
  alt: img.alt ?? "",
  path: String(img.path),
});

export async function POST(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 401, "User Not Allowed");

    await connectDB();

    const raw = await req.json();
    const parsed = payloadZ.safeParse(raw);
    if (!parsed.success) {
      return response(false, 400, "Invalid or missing fields", parsed.error.format());
    }

    const data = parsed.data;
    let order = data.order;

    if (typeof order !== "number") {
      await Banner.updateMany({ deletedAt: null }, { $inc: { order: 1 } });
      order = 0;
    }

    const doc = {
      desktopImage: normalizeImage(data.desktopImage),
      mobileImage: normalizeImage(data.mobileImage),
      href: data.href.trim(),
      active: typeof data.active === "boolean" ? data.active : true,
      order,
      deletedAt: null,
    };

    const created = await Banner.create(doc);
    return response(true, 201, "Banner created successfully", created);
  } catch (err) {
    return catchError(err, "Failed to create banner");
  }
}

