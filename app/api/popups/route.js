import { NextResponse } from "next/server";
import Popup from "@/models/Popup.model";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import { response, catchError } from "@/lib/helperFunctions";

/* --- helpers --- */
const clean = (s) => (typeof s === "string" ? s.trim() : s);

function normalizeIn(payload) {
  // Only allow two types
  if (!["image-link", "discount"].includes(payload.type)) {
    throw new Error("type must be 'image-link' or 'discount'");
  }
  // image required
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

    // image-link
    linkHref:
      payload.type === "image-link" ? clean(payload.linkHref || "") : "",
    noBackdrop: payload.type === "image-link" ? !!payload.noBackdrop : false,

    // discount
    couponCode:
      payload.type === "discount" ? clean(payload.couponCode || "") : "",

    // targeting / lifecycle
    pages: Array.isArray(payload.pages)
      ? payload.pages.map(clean).filter(Boolean)
      : [],
    priority: Number(payload.priority ?? 10),
    startAt: payload.startAt ? new Date(payload.startAt) : new Date(),
    endAt: payload.endAt ? new Date(payload.endAt) : null,
    isActive: typeof payload.isActive === "boolean" ? payload.isActive : true,

    // frequency (optional from payload)
    frequency: {
      scope: payload.frequency?.scope ?? "session",
      maxShows: Number(payload.frequency?.maxShows ?? 1),
    },
  };
  return doc;
}

/* GET: list with search/paging */
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100
    );
    const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10), 0);

    const find = { deletedAt: null };
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      find.$or = [{ title: rx }, { couponCode: rx }, { linkHref: rx }];
    }

    const [items, total] = await Promise.all([
      Popup.find(find)
        .sort({ priority: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Popup.countDocuments(find),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items, total, limit, skip, q },
    });
  } catch (err) {
    console.error("Admin GET popups error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to list popups" },
      { status: 500 }
    );
  }
}

/* POST: create */
export async function POST(req) {
  try {
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");

    await connectDB();
    const raw = await req.json();

    const doc = normalizeIn(raw);
    const created = await Popup.create(doc);
    return response(true, 201, "Popup created", created);
  } catch (err) {
    return catchError(err, "Failed to create popup");
  }
}

/* PATCH: bulk soft-delete optional (ids:[]) */
export async function PATCH(req) {
  try {
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");
    await connectDB();

    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return response(false, 400, "ids array required");
    }

    await Popup.updateMany(
      { _id: { $in: ids } },
      { $set: { deletedAt: new Date() } }
    );
    return response(true, 200, "Popups deleted");
  } catch (err) {
    return catchError(err, "Failed to delete popups");
  }
}
