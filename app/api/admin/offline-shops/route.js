// app/api/admin/offline-shops/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import OfflineShop from "@/models/OfflineShop.model";

const json = (ok, status, payload) =>
  NextResponse.json(
    ok
      ? { success: true, data: payload }
      : { success: false, message: payload },
    { status }
  );

const trim = (v) => (typeof v === "string" ? v.trim() : v);

/* -------------------- GET (list) -------------------- */
export async function GET(req) {
  try {
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) return json(false, 401, "admin not authenticated");

    await connectDB();

    const url = new URL(req.url);
    const q = trim(
      url.searchParams.get("q") || url.searchParams.get("search") || ""
    );
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10))
    );

    const sortParam = url.searchParams.get("sort") || "createdAt:desc";
    const [sf, so] = sortParam.split(":");
    const sort = {
      [sf || "createdAt"]: (so || "desc").toLowerCase() === "asc" ? 1 : -1,
    };

    const phoneDigits = q ? q.replace(/\D+/g, "") : "";
    const filter = q
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { location: { $regex: q, $options: "i" } },
            { contactPerson: { $regex: q, $options: "i" } },
            { phone: { $regex: q, $options: "i" } },
            ...(phoneDigits
              ? [{ phone: { $regex: phoneDigits, $options: "i" } }]
              : []),
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      OfflineShop.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      OfflineShop.countDocuments(filter),
    ]);

    return json(true, 200, {
      items,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}

/* -------------------- POST (create) -------------------- */
export async function POST(req) {
  try {
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) return json(false, 401, "admin not authenticated");

    await connectDB();

    const body = await req.json().catch(() => ({}));
    const name = trim(body?.name);
    const phone = trim(body?.phone || "");
    const location = trim(body?.location || "");
    const contactPerson = trim(body?.contactPerson || "");

    if (!name) return json(false, 400, "Shop name is required");

    // Optional duplicate guard: same name + phone
    if (name && phone) {
      const dupe = await OfflineShop.findOne({ name, phone }).lean();
      if (dupe)
        return json(
          false,
          409,
          "A shop with the same name and phone already exists"
        );
    }

    const created = await OfflineShop.create({
      name,
      phone,
      location,
      contactPerson,
    });
    return json(true, 201, created.toObject());
  } catch (e) {
    return json(false, 500, e?.message || "Server error");
  }
}
