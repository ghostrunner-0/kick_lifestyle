import { NextResponse } from "next/server";
import { z } from "zod";
import Popup from "@/models/Popup.model";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import { response, catchError } from "@/lib/helperFunctions";
import { zSchema } from "@/lib/zodSchema"; // must contain shape.image {_id, alt, path}

const payloadZ = z.object({
  _id: z.string().optional(), // present on PUT
  type: z.enum(["image-link", "discount"]),
  image: zSchema.shape.image, // {_id, alt, path}
  linkHref: z.string().url().optional().or(z.literal("")).default(""),
  couponCode: z.string().optional().default(""),

  isActive: z.boolean().optional().default(true),
  startAt: z.coerce.date().nullable().optional(),
  endAt: z.coerce.date().nullable().optional(),
  priority: z.number().int().optional().default(10),
  pages: z.array(z.string()).optional().default([]),

  frequency: z
    .object({
      scope: z.enum(["once", "daily", "session", "always"]).default("session"),
      maxShows: z.number().int().min(0).default(1),
    })
    .optional()
    .default({ scope: "session", maxShows: 1 }),

  ui: z
    .object({
      layout: z.enum(["centered", "edge", "sheet"]).optional(),
    })
    .optional()
    .default({}),
});

// GET: return single active config (first non-deleted)
export async function GET() {
  try {
    await connectDB();
    const doc = await Popup.findOne({ deletedAt: null }).sort({
      updatedAt: -1,
    });
    return response(true, 200, "ok", doc || null);
  } catch (err) {
    return catchError(err, "Failed to fetch popup config");
  }
}

// POST: create (if none exists) or upsert if you want strict single-entry
export async function POST(req) {
  try {
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");

    await connectDB();
    const existing = await Popup.findOne({ deletedAt: null });

    const raw = await req.json();
    const parsed = payloadZ.safeParse(raw);
    if (!parsed.success) {
      return response(false, 400, "Invalid fields", parsed.error.format());
    }
    const d = parsed.data;

    // enforce type-specific fields
    if (d.type === "image-link") d.couponCode = "";
    if (d.type === "discount") d.linkHref = "";

    if (existing) {
      // If already present, disallow extra create to maintain single-entry
      return response(
        false,
        409,
        "Popup config already exists. Use PUT to update.",
        existing
      );
    }

    const created = await Popup.create(d);
    return response(true, 201, "Created", created);
  } catch (err) {
    return catchError(err, "Failed to create popup config");
  }
}

// PUT: update the single document (by _id)
export async function PUT(req) {
  try {
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");

    await connectDB();
    const raw = await req.json();
    const parsed = payloadZ.safeParse(raw);
    if (!parsed.success) {
      return response(false, 400, "Invalid fields", parsed.error.format());
    }
    const d = parsed.data;
    if (!d._id) return response(false, 400, "_id is required for update");

    if (d.type === "image-link") d.couponCode = "";
    if (d.type === "discount") d.linkHref = "";

    const updated = await Popup.findOneAndUpdate(
      { _id: d._id, deletedAt: null },
      { $set: d },
      { new: true }
    );
    if (!updated) return response(false, 404, "Popup config not found");
    return response(true, 200, "Updated", updated);
  } catch (err) {
    return catchError(err, "Failed to update popup config");
  }
}
