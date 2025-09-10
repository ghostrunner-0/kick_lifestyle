// app/api/admin/orders/route.js
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { connectDB } from "@/lib/DB";
import User from "@/models/User.model";
import Order from "@/models/Orders.model";

/* ---------- role guard: only admin + sales ---------- */
async function requireRole(allowed = ["admin", "sales"]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email, deletedAt: null }).lean();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!allowed.includes(user.role)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  return null; // ok
}

/* ---------- helpers ---------- */
const isObjectId = (s) => /^[0-9a-fA-F]{24}$/.test(String(s || "").trim());
const esc = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function parseSort(sortRaw) {
  // e.g. "createdAt:desc" or "amounts.total:asc"
  const def = { createdAt: -1 };
  if (!sortRaw) return def;
  const [path, dir] = String(sortRaw).split(":");
  if (!path) return def;
  const d = String(dir || "desc").toLowerCase() === "asc" ? 1 : -1;
  return { [path]: d };
}

/** Build an $and of $or clauses from free-text q */
function buildSearchQuery(q) {
  if (!q) return {};

  const tokens = String(q)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return {};

  const andClauses = tokens.map((tok) => {
    const r = new RegExp(esc(tok), "i");
    const or = [];

    if (isObjectId(tok)) {
      or.push({ _id: new mongoose.Types.ObjectId(tok) });
    }

    const n = Number(tok.replace(/[, ]/g, ""));
    if (Number.isFinite(n)) {
      or.push({ "amounts.total": n });
      or.push({ display_order_seq: n });
      or.push({ "customer.phone": new RegExp(esc(String(n)), "i") });
    }

    const d = new Date(tok);
    if (!isNaN(d.getTime())) {
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      or.push({ createdAt: { $gte: start, $lte: end } });
    }

    or.push(
      { display_order_id: r },
      { paymentMethod: r },
      { status: r },
      { "customer.fullName": r },
      { "customer.phone": r },
      { "address.landmark": r },
      { "address.cityLabel": r },
      { "address.zoneLabel": r },
      { "address.areaLabel": r },
      { "items.name": r },
      { "items.variantName": r }
    );

    return { $or: or };
  });

  return { $and: andClauses };
}

/* ---------- GET /admin/orders ---------- */
export async function GET(req) {
  // role check
  const guard = await requireRole(["admin", "sales"]);
  if (guard) return guard; // returns a NextResponse when blocked

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 20)));
    const sortRaw = searchParams.get("sort") || "createdAt:desc";

    // optional filters
    const status = searchParams.get("status");
    const statuses = searchParams.getAll("statuses").filter(Boolean);
    const paymentMethod = searchParams.get("paymentMethod");
    const paymentMethods = searchParams.getAll("paymentMethods").filter(Boolean);

    const query = {
      ...(buildSearchQuery(q) || {}),
      ...(status && status !== "__ALL__" ? { status } : {}),
      ...(statuses.length ? { status: { $in: statuses } } : {}),
      ...(paymentMethod && paymentMethod !== "__ALL__" ? { paymentMethod } : {}),
      ...(paymentMethods.length ? { paymentMethod: { $in: paymentMethods } } : {}),
    };

    const sort = parseSort(sortRaw);

    const [items, total] = await Promise.all([
      Order.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .select({
          _id: 1,
          display_order_id: 1,
          display_order_seq: 1,
          createdAt: 1,
          customer: 1,
          address: 1,
          items: { $slice: 1 }, // tiny sample
          amounts: 1,
          paymentMethod: 1,
          status: 1,
        })
        .lean(),
      Order.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: { items, total, page, limit },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e?.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
