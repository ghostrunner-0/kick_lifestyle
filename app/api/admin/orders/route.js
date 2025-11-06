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

  return null; // ok
}

/**
 * Find userIds by free-text (name/phone). Returns:
 *  - userObjectIds: [ObjectId,...]
 *  - userIdStrings: ["<id>", ...] (stringified ObjectIds)
 */
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

  // digits-only phone contains (≥5 digits)
  const digits = full.replace(/\D+/g, "");
  if (digits.length >= 5) {
    const rxDigits = new RegExp(digits);
    ors.push({ phone: rxDigits });
  }

  const users = await User.find({ $or: ors })
    .select({ _id: 1 })
    .limit(500) // guardrail
    .lean();

  const userObjectIds = users.map((u) => u._id).filter(Boolean);
  const userIdStrings = userObjectIds.map((oid) => String(oid));

  return { userObjectIds, userIdStrings };
}

/* ---------- GET /admin/orders ---------- */
export async function GET(req) {
  // role check
  const guard = await requireRole(["admin", "sales"]);
  if (guard) return guard;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") || 20))
    );
    const sortRaw = searchParams.get("sort") || "createdAt:desc";

    // optional filters
    const status = searchParams.get("status");
    const statuses = searchParams.getAll("statuses").filter(Boolean);
    const paymentMethod = searchParams.get("paymentMethod");
    const paymentMethods = searchParams
      .getAll("paymentMethods")
      .filter(Boolean);

    // 1) Base query from free-text (multi-token, OR across fields, AND across tokens)
    const baseQuery = buildOrderSearchQuery(q);

    // 2) If query present, also user-based matches via userRef/userId
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

    // 3) Combine filters
    const query = {
      ...(Object.keys(baseQuery).length ? baseQuery : {}),
      ...(Object.keys(userOr).length ? userOr : {}),
      ...(status && status !== "__ALL__" ? { status } : {}),
      ...(statuses.length ? { status: { $in: statuses } } : {}),
      ...(paymentMethod && paymentMethod !== "__ALL__"
        ? { paymentMethod }
        : {}),
      ...(paymentMethods.length
        ? { paymentMethod: { $in: paymentMethods } }
        : {}),
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

          // both shapes for customer snapshot
          customer: 1, // { fullName, phone, ... }
          customerName: 1, // alt flat
          customerPhone: 1, // alt flat

          address: 1,
          items: { $slice: 1 }, // tiny sample to reduce payload
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
      { success: false, message: e?.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
