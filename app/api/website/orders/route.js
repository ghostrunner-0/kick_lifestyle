export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";
import Order from "@/models/Orders.model";
import Counter from "@/models/Counter.model";
import Coupon from "@/models/Coupon.model";
import User from "@/models/User.model";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";

/** Keep prefixes consistent everywhere */
const ORDER_PREFIX = Object.freeze({
  cod: "AXC",
  khalti: "MNP",
  qr: "BLQ",
  default: "ZQX",
});

/** Global atomic sequence */
async function getNextOrderSequence(session) {
  try {
    const doc = await Counter.findOneAndUpdate(
      { _id: "order_display_seq" },
      [{ $set: { seq: { $add: [{ $ifNull: ["$seq", 1999] }, 1] } } }],
      { new: true, upsert: true, session }
    ).lean();
    return doc?.seq;
  } catch {
    await Counter.updateOne(
      { _id: "order_display_seq" },
      { $setOnInsert: { seq: 1999 } },
      { upsert: true, session }
    );
    const doc = await Counter.findOneAndUpdate(
      { _id: "order_display_seq" },
      { $inc: { seq: 1 } },
      { new: true, session }
    ).lean();
    return doc?.seq ?? 2000;
  }
}

/** Strict stock reservation (in-transaction). Throws on any insufficiency. */
async function reserveStockStrict(items, session) {
  for (const it of items) {
    const qty = Math.max(0, Number(it?.qty || 0));
    if (!qty) continue;

    // Variant-first
    if (it?.variantId) {
      const updated = await ProductVariant.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(String(it.variantId)),
          deletedAt: null,
          stock: { $gte: qty },
        },
        { $inc: { stock: -qty } },
        { new: true, session }
      ).select("_id product stock");
      if (!updated) {
        throw new Error(
          `Insufficient stock for variant (${it?.variantName || "variant"})`
        );
      }
      continue;
    }

    // Product-level (only if no variants)
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(String(it.productId)),
        deletedAt: null,
        hasVariants: { $ne: true },
        stock: { $gte: qty },
      },
      { $inc: { stock: -qty } },
      { new: true, session }
    ).select("_id stock hasVariants");
    if (!updatedProduct) {
      throw new Error(
        `Insufficient stock for product (${it?.name || "product"})`
      );
    }
  }
}

/**
 * POST /api/website/orders
 * Creates orders for COD, QR, and KHALTI.
 * Atomic: coupon usage, stock reservation, user Pathao/address update, order creation.
 */
export async function POST(req) {
  try {
    await connectDB();

    const payload = await req.json().catch(() => ({}));

    // --- Basic validations
    const pm = String(payload?.paymentMethod || "").toLowerCase();
    if (!["cod", "khalti", "qr"].includes(pm)) {
      return response(false, 400, "Invalid payment method");
    }

    const userIdRaw = payload?.user?.id || payload?.userId;
    if (!userIdRaw || !mongoose.isValidObjectId(userIdRaw)) {
      return response(false, 400, "Missing or invalid user id");
    }

    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (items.length === 0)
      return response(false, 400, "No items to place order");

    // --- Amounts
    const subtotal = Number(payload?.amounts?.subtotal ?? 0);
    const discount = Math.max(0, Number(payload?.amounts?.discount ?? 0));
    const shippingCost =
      pm === "cod"
        ? Math.max(0, Number(payload?.amounts?.shippingCost ?? 0))
        : 0;
    const codFee =
      pm === "cod" ? Math.max(0, Number(payload?.amounts?.codFee ?? 0)) : 0;
    const baseTotal = Math.max(0, subtotal - discount);
    const total = pm === "cod" ? baseTotal + shippingCost + codFee : baseTotal;

    if (!Number.isFinite(total) || total <= 0) {
      return response(false, 400, "Invalid order amount");
    }

    const userId = new mongoose.Types.ObjectId(userIdRaw);

    // **HARD ENFORCE QR -> BLQ**
    const prefix =
      pm === "qr" ? ORDER_PREFIX.qr : ORDER_PREFIX[pm] || ORDER_PREFIX.default;

    const baseDoc = {
      userId,
      user: {
        name: payload?.user?.name || undefined,
        email: payload?.user?.email || undefined,
      },
      customer: payload?.customer || {},
      address: payload?.address || {},
      items,
      amounts: {
        subtotal,
        discount,
        shippingCost,
        codFee,
        total,
        currency: payload?.amounts?.currency || "NPR",
      },
      coupon: payload?.coupon || undefined,
      paymentMethod: pm,
      payment: {
        status:
          pm === "khalti" ? "unpaid" : payload?.payment?.status || "unpaid",
        provider:
          pm === "khalti" ? "khalti" : payload?.payment?.provider || undefined,
        providerRef: payload?.payment?.providerRef || undefined,
      },
      status:
        pm === "qr"
          ? "payment Not Verified"
          : pm === "khalti"
          ? "pending payment"
          : "processing",
      display_order_prefix: prefix,
      metadata: {
        ...(payload?.metadata || {}),
        pricePlan: payload?.metadata?.pricePlan || null,
        ...(pm === "qr"
          ? {
              qr: {
                expected_amount: total,
                submitted: false,
                createdAt: new Date(),
              },
            }
          : {}),
        ...(pm === "khalti"
          ? {
              khalti: {
                purchase_order_id: null, // set after seq
                initiateAt: null,
                pidx: null,
                payment_url: null,
                status: "Created",
              },
            }
          : {}),
      },
    };

    // --- Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1) Allocate display ID
      const seq = await getNextOrderSequence(session);
      const display_order_id = `${prefix}-${seq}`;

      // Paranoid guard for QR
      if (pm === "qr" && !display_order_id.startsWith("BLQ-")) {
        throw new Error("QR orders must use BLQ prefix");
      }

      // 2) Enforce coupon usage limits + reserve slot
      const couponSnap = payload?.coupon;
      if (couponSnap?.code) {
        const code = String(couponSnap.code).trim().toUpperCase();
        const coupon = await Coupon.findOne({ code, deletedAt: null }, null, {
          session,
        });
        if (!coupon) throw new Error("Coupon not found or inactive");

        if (
          Number(coupon.totalLimit || 0) > 0 &&
          Number(coupon.redemptionsTotal || 0) >= Number(coupon.totalLimit)
        ) {
          throw new Error("Coupon redemption limit reached");
        }

        if (Number(coupon.perUserLimit || 0) > 0) {
          const used = await Order.countDocuments(
            { userId, "coupon.code": code, status: { $ne: "cancelled" } },
            { session }
          );
          if (used >= Number(coupon.perUserLimit)) {
            throw new Error(
              "You have already used this coupon the allowed number of times"
            );
          }
        }

        await Coupon.updateOne(
          { _id: coupon._id },
          { $inc: { redemptionsTotal: 1 } },
          { session }
        );
      }

      // 3) STRICT stock reservation
      await reserveStockStrict(items, session);

      // 4) Create order
      const toCreate = {
        ...baseDoc,
        display_order_seq: seq,
        display_order_id,
      };
      if (pm === "khalti") {
        toCreate.metadata.khalti.purchase_order_id = display_order_id;
      }
      const [order] = await Order.create([toCreate], { session });

      // 5) Update user's Pathao + address fields
      const u = payload?.userUpdates || {};
      if (u && Object.keys(u).length) {
        await User.updateOne(
          { _id: userId },
          {
            $set: {
              ...(u.name ? { name: u.name } : {}),
              ...(u.phone ? { phone: u.phone } : {}),
              ...(u.address ? { address: u.address } : {}),
              ...(u.pathaoCityId != null
                ? { pathaoCityId: Number(u.pathaoCityId) }
                : {}),
              ...(u.pathaoCityLabel != null
                ? { pathaoCityLabel: u.pathaoCityLabel }
                : {}),
              ...(u.pathaoZoneId != null
                ? { pathaoZoneId: Number(u.pathaoZoneId) }
                : {}),
              ...(u.pathaoZoneLabel != null
                ? { pathaoZoneLabel: u.pathaoZoneLabel }
                : {}),
              ...(u.pathaoAreaId != null
                ? { pathaoAreaId: Number(u.pathaoAreaId) }
                : {}),
              ...(u.pathaoAreaLabel != null
                ? { pathaoAreaLabel: u.pathaoAreaLabel }
                : {}),
            },
          },
          { session }
        );
      }

      // 6) Commit
      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({
        success: true,
        data: {
          _id: order._id,
          display_order_id: order.display_order_id, // e.g., "BLQ-2034" for QR
          status: order.status,
          payment: order.payment,
          amounts: order.amounts,
        },
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return response(false, 400, err?.message || "Failed to create order");
    }
  } catch (e) {
    return response(false, 500, e?.message || "Server error");
  }
}
