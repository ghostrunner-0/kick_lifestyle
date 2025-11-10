// app/api/admin/orders/route.js
export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { connectDB } from "@/lib/DB";
import User from "@/models/User.model";
import Order from "@/models/Orders.model";

import {
  buildOrderSearchQuery,
  parseSort,
  esc,
} from "@/lib/mongoSearch/ordersSearch";

/* ---------- role guard: only admin + sales ---------- */
async function requireRole(allowed = ["admin", "sales"]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  await connectDB();
  const user = await User.findOne({
    email: session.user.email,
    deletedAt: null,
  }).lean();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!allowed.includes(user.role)) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }

  return null;
}

/* ---------- helper: search users by name/phone ---------- */
async function findUsersByNameOrPhone(q) {
  const full = String(q || "").trim();
  if (!full) return { userObjectIds: [], userIdStrings: [] };

  const tokens = full.split(/\s+/).filter(Boolean);
  if (!tokens.length) return { userObjectIds: [], userIdStrings: [] };

  const ors = [];
  for (const tok of tokens) {
    const r = new RegExp(esc(tok), "i");
    ors.push({ name: r });
    ors.push({ phone: r });
  }

  const digits = full.replace(/\D+/g, "");
  if (digits.length >= 5) {
    const rxDigits = new RegExp(digits);
    ors.push({ phone: rxDigits });
  }

  const users = await User.find({ $or: ors })
    .select({ _id: 1 })
    .limit(500)
    .lean();

  const userObjectIds = users.map((u) => u._id).filter(Boolean);
  const userIdStrings = userObjectIds.map((id) => String(id));

  return { userObjectIds, userIdStrings };
}

/* ---------- GET /api/admin/orders ---------- */
export async function GET(req) {
  const guard = await requireRole(["admin", "sales"]);
  if (guard) return guard;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") || 20))
    );
    const sortRaw = searchParams.get("sort") || "createdAt:desc";

    // optional filters (all truly optional)
    const status = searchParams.get("status"); // single
    const statuses = searchParams.getAll("statuses").filter(Boolean); // array

    const paymentMethod = searchParams.get("paymentMethod");
    const paymentMethods = searchParams
      .getAll("paymentMethods")
      .filter(Boolean);

    // 1) Base query from text
    const baseQuery = buildOrderSearchQuery(q);

    // 2) Extend with user matches if q present
    let userOr = {};
    if (q) {
      const { userObjectIds, userIdStrings } = await findUsersByNameOrPhone(q);
      if (userObjectIds.length || userIdStrings.length) {
        userOr = {
          $or: [
            ...(userObjectIds.length
              ? [{ userRef: { $in: userObjectIds } }]
              : []),
            ...(userIdStrings.length
              ? [{ userId: { $in: userIdStrings } }]
              : []),
          ],
        };
      }
    }

    // 3) Status filter (prefer array if provided)
    const statusFilter = {};
    if (statuses.length) {
      statusFilter.status = { $in: statuses };
    } else if (status && status !== "__ALL__") {
      statusFilter.status = status;
    }

    // 4) Payment method filter (prefer array if provided)
    const paymentFilter = {};
    if (paymentMethods.length) {
      paymentFilter.paymentMethod = { $in: paymentMethods };
    } else if (paymentMethod && paymentMethod !== "__ALL__") {
      paymentFilter.paymentMethod = paymentMethod;
    }

    // 5) Final query (only includes what’s actually set)
    const query = {
      ...(Object.keys(baseQuery).length ? baseQuery : {}),
      ...(Object.keys(userOr).length ? userOr : {}),
      ...statusFilter,
      ...paymentFilter,
    };

    const sort = parseSort(sortRaw);

    const [items, total] = await Promise.all([
      Order.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .select({
          _id: 1,
          userId: 1,
          userRef: 1,
          display_order_id: 1,
          display_order_seq: 1,
          createdAt: 1,

          customer: 1,
          customerName: 1,
          customerPhone: 1,

          address: 1,
          items: { $slice: 1 }, // sample line-items, keep admin table light
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
    console.error("GET /api/admin/orders error:", e);
    return NextResponse.json(
      {
        success: false,
        message: e?.message || "Failed to fetch orders",
      },
      { status: 500 }
    );
  }
}
