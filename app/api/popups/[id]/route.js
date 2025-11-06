import { NextResponse } from "next/server";
import Popup from "@/models/Popup.model";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import { response, catchError } from "@/lib/helperFunctions";

const clean = (s) => (typeof s === "string" ? s.trim() : s);

function normalizeIn(payload) {
  if (!["image-link", "discount"].includes(payload.type)) {
    throw new Error("type must be 'image-link' or 'discount'");
  }
  if (!payload.image || !payload.image._id || !payload.image.path) {
    throw new Error("image object is required");
  }
  const doc = {
    type: payload.type,
    title: clean(payload.title || ""),
    image: {
      _id: String(payload.image._id),
      path: String(payload.image.path),
      alt: payload.image.alt || "",
    },
    linkHref:
      payload.type === "image-link" ? clean(payload.linkHref || "") : "",
    noBackdrop: payload.type === "image-link" ? !!payload.noBackdrop : false,
    couponCode:
      payload.type === "discount" ? clean(payload.couponCode || "") : "",
    pages: Array.isArray(payload.pages)
      ? payload.pages.map(clean).filter(Boolean)
      : [],
    priority: Number(payload.priority ?? 10),
    startAt: payload.startAt ? new Date(payload.startAt) : new Date(),
    endAt: payload.endAt ? new Date(payload.endAt) : null,
    isActive: typeof payload.isActive === "boolean" ? payload.isActive : true,
    frequency: {
      scope: payload.frequency?.scope ?? "session",
      maxShows: Number(payload.frequency?.maxShows ?? 1),
    },
  };
  return doc;
}

/* GET /api/admin/popups/[id] */
export async function GET(_req, ctx) {
  try {
    const { params } = await ctx; // ✅ await the context
    const { id } = params || {};
    if (!id) return NextResponse.json(null);

    await connectDB();
    const item = await Popup.findById(id).lean();
    if (!item) return NextResponse.json(null);
    return NextResponse.json({ ok: true, data: item });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: "Failed to get popup" },
      { status: 500 }
    );
  }
}

/* PUT /api/admin/popups/[id] */
export async function PUT(req, ctx) {
  try {
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");

    const { params } = await ctx; // ✅ await the context
    const { id } = params || {};
    if (!id) return response(false, 400, "Missing popup id");

    await connectDB();
    const raw = await req.json();
    const $set = normalizeIn(raw);

    const updated = await Popup.findByIdAndUpdate(
      id,
      { $set },
      { new: true }
    ).lean();
    if (!updated) return response(false, 404, "Popup not found");

    return response(true, 200, "Popup updated", updated);
  } catch (err) {
    return catchError(err, "Failed to update popup");
  }
}

/* DELETE /api/admin/popups/[id] */
export async function DELETE(_req, ctx) {
  try {
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");

    const { params } = await ctx; // ✅ await the context
    const { id } = params || {};
    if (!id) return response(false, 400, "Missing popup id");

    await connectDB();
    await Popup.findByIdAndUpdate(id, {
      $set: { deletedAt: new Date(), isActive: false },
    });

    return response(true, 200, "Popup deleted");
  } catch (err) {
    return catchError(err, "Failed to delete popup");
  }
}
