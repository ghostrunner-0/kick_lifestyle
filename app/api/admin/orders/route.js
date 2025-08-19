// app/api/admin/orders/route.js
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import Order from "@/models/Orders.model";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = [
  "processing",
  "pending payment",
  "payment Not Verified",
  "Invalid Payment",
  "cancelled",
  "completed",
  "ready to pack",
  "ready to ship",
];

const ALLOWED_PAYMENT_METHODS = ["cod", "khalti", "qr"];

function unionParams(sp, baseKey) {
  // supports: key, key[], and CSV in a single 'key'
  const raw = [
    ...sp.getAll(baseKey),
    ...sp.getAll(`${baseKey}[]`),
  ];
  let out = raw.slice();
  if (out.length === 0) return out;
  if (out.length === 1 && out[0].includes(",")) {
    out = out[0].split(",").map((s) => s.trim());
  }
  return out.filter(Boolean);
}

export async function GET(req) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return response(false, 401, "admin not authenticated");

    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const sortRaw = (searchParams.get("sort") || "createdAt:desc").trim();

    // ----- STATUS FILTER -----
    // Accept: status, statuses, statuses[], CSV
    const statusSingle = searchParams.get("status");
    let statuses = [
      ...unionParams(searchParams, "statuses"),
      ...(statusSingle ? [statusSingle] : []),
    ];
    // normalize & validate (ignore __ALL__)
    statuses = Array.from(
      new Set(
        statuses
          .map((s) => String(s).trim())
          .filter((s) => s && s !== "__ALL__" && ALLOWED_STATUSES.includes(s))
      )
    );

    // ----- PAYMENT METHOD FILTER -----
    // Accept: paymentMethod, paymentMethods, paymentMethods[], CSV
    const methodSingle = searchParams.get("paymentMethod");
    let paymentMethods = [
      ...unionParams(searchParams, "paymentMethods"),
      ...(methodSingle ? [methodSingle] : []),
    ];
    paymentMethods = Array.from(
      new Set(
        paymentMethods
          .map((m) => String(m).trim().toLowerCase())
          .filter((m) => m && m !== "__ALL__" && ALLOWED_PAYMENT_METHODS.includes(m))
      )
    );

    // ----- BUILD FILTER -----
    const filter = {};
    if (statuses.length > 0) filter.status = { $in: statuses };
    if (paymentMethods.length > 0) filter.paymentMethod = { $in: paymentMethods };

    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const or = [
        { display_order_id: rx },
        { "customer.fullName": rx },
        { "customer.phone": rx },
      ];
      if (/^[0-9a-fA-F]{24}$/.test(q)) {
        or.push({ _id: new mongoose.Types.ObjectId(q) });
      }
      filter.$or = or;
    }

    // ----- SORT -----
    let sort = { createdAt: -1 };
    if (sortRaw) {
      const [field, dir] = sortRaw.split(":");
      if (field) sort = { [field]: String(dir).toLowerCase() === "asc" ? 1 : -1 };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Order.find(filter)
        .select({
          _id: 1,
          display_order_id: 1,
          status: 1,
          paymentMethod: 1,
          "customer.fullName": 1,
          "customer.phone": 1,
          "amounts.total": 1,
          createdAt: 1,
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: { items, total, page, limit },
    });
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
