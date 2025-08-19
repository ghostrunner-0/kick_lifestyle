export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Order from "@/models/Orders.model";

/* small helpers */
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

/** Build a powerful $and-of-$or query from a free text `q` */
function buildSearchQuery(q) {
  if (!q) return {};

  // split by whitespace, ignore empties
  const tokens = String(q)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return {};

  // for each token, we want "this token must match something"
  const andClauses = tokens.map((tok) => {
    const r = new RegExp(esc(tok), "i");
    const or = [];

    // direct ids
    if (isObjectId(tok)) {
      or.push({ _id: new mongoose.Types.ObjectId(tok) });
    }

    // numeric handling (total / seq)
    const n = Number(tok.replace(/[, ]/g, ""));
    const isNum = Number.isFinite(n);

    if (isNum) {
      // exact totals or display seq
      or.push({ "amounts.total": n });
      or.push({ display_order_seq: n });
      // phones often digits-only
      or.push({ "customer.phone": new RegExp(esc(String(n)), "i") });
    }

    // date handling (search by createdAt day)
    const d = new Date(tok);
    if (!isNaN(d.getTime())) {
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      or.push({ createdAt: { $gte: start, $lte: end } });
    }

    // text partials across many fields
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
      // items array (dot notation matches inside subdocs)
      { "items.name": r },
      { "items.variantName": r }
    );

    return { $or: or };
  });

  return { $and: andClauses };
}

export async function GET(req) {
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
          items: { $slice: 1 }, // tiny sample so we can search by item names but keep payload light
          amounts: 1,
          paymentMethod: 1,
          status: 1,
        })
        .lean(),
      Order.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e?.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
