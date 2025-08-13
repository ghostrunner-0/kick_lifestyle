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

// Allow '#abc' or '#aabbcc' (case-insensitive)
const hexColorRegex = /^#(?:[A-Fa-f0-9]{3}){1,2}$/;

// Normalize like "fcba17" -> "#fcba17"
const normalizeHex = (v) => {
  const val = String(v || "").trim();
  return val.startsWith("#") ? val : `#${val}`;
};

const payloadZ = z.object({
  desktopImage: imageZ,
  mobileImage: imageZ,
  href: z.string().trim().min(1, "Href is required"),
  active: z.boolean().optional().default(true),
  order: z.number().int().min(0).optional(), // if omitted, we auto-assign
  bgColor: z
    .string()
    .trim()
    .transform(normalizeHex)
    .refine((v) => hexColorRegex.test(v), {
      message: "Enter a valid HEX color, e.g. #fcba17",
    })
    .optional()
    .default("#ffffff"),
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
      return response(
        false,
        400,
        "Invalid or missing fields",
        parsed.error.format()
      );
    }

    const data = parsed.data;
    let order = data.order;

    // Auto-assign order if not provided: push existing down by 1 and set new to 0
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
      bgColor: data.bgColor || "#ffffff", // <— NEW
      deletedAt: null,
    };

    const created = await Banner.create(doc);
    return response(true, 201, "Banner created successfully", created);
  } catch (err) {
    return catchError(err, "Failed to create banner");
  }
}
