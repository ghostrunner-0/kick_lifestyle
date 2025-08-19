// app/api/website/orders/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import Order from "@/models/Orders.model";
import User from "@/models/User.model";
import Counter from "@/models/Counter.model";
import Product from "@/models/Product.model";              // <-- ensure correct path
import ProductVariant from "@/models/ProductVariant.model"; // <-- ensure correct path

// Non-obvious 3-letter prefixes per payment method
const ORDER_PREFIX = Object.freeze({
  cod: "AXC",     // COD
  khalti: "BLQ",  // Khalti
  qr: "MNP",      // QR
  default: "ZQX",
});

// ---- Atomic counter: start at 2000, increment by 1 (session-aware)
async function getNextOrderSequence(session) {
  try {
    // Pipeline-style update (MongoDB ≥ 4.2): seq = (seq ?? 1999) + 1
    const doc = await Counter.findOneAndUpdate(
      { _id: "order_display_seq" },
      [
        {
          $set: {
            seq: { $add: [{ $ifNull: ["$seq", 1999] }, 1] },
          },
        },
      ],
      { new: true, upsert: true, session }
    ).lean();
    return doc.seq;
  } catch (err) {
    // Fallback for older servers: create once at 1999, then $inc
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
    return doc.seq;
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      user,               // { id, email, name }
      customer,
      address,
      items,
      amounts,
      paymentMethod,
      coupon,
      metadata,
      userUpdates,        // optional
      payment,            // optional { status: "paid" | "unpaid", provider, providerRef }
    } = body || {};

    if (!user?.id || !user?.email) {
      return NextResponse.json({ success: false, message: "Missing user id/email" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
    }
    if (!paymentMethod) {
      return NextResponse.json({ success: false, message: "Missing paymentMethod" }, { status: 400 });
    }

    // Fetch user record (by id or email)
    let dbUser = null;
    if (user.id && /^[0-9a-fA-F]{24}$/.test(user.id)) {
      dbUser = await User.findById(user.id).lean();
    }
    if (!dbUser) {
      dbUser = await User.findOne({ email: user.email }).lean();
    }

    // Update user profile diffs (optional)
    if (dbUser) {
      const updates = {};
      const maybe = (k, v) => {
        if (typeof v === "undefined" || v === null) return;
        if (dbUser[k] !== v) updates[k] = v;
      };
      const src = {
        name: userUpdates?.name ?? user?.name,
        phone: userUpdates?.phone ?? customer?.phone,
        address: userUpdates?.address ?? address?.landmark,
        pathaoCityId: userUpdates?.pathaoCityId ?? address?.cityId,
        pathaoCityLabel: userUpdates?.pathaoCityLabel ?? address?.cityLabel,
        pathaoZoneId: userUpdates?.pathaoZoneId ?? address?.zoneId,
        pathaoZoneLabel: userUpdates?.pathaoZoneLabel ?? address?.zoneLabel,
        pathaoAreaId: userUpdates?.pathaoAreaId ?? address?.areaId,
        pathaoAreaLabel: userUpdates?.pathaoAreaLabel ?? address?.areaLabel,
      };
      Object.entries(src).forEach(([k, v]) => maybe(k, v));
      if (Object.keys(updates).length) {
        await User.updateOne({ _id: dbUser._id }, { $set: updates });
      }
    }

    // ---- PRE-FLIGHT STOCK CHECK (best-effort; still guarded in transaction)
    const variantLines = items.filter((it) => it.variantId);
    const productLines = items.filter((it) => !it.variantId);

    // Check variants
    if (variantLines.length) {
      const vIds = [...new Set(variantLines.map((it) => String(it.variantId)).filter(Boolean))];
      const vDocs = await ProductVariant.find({
        _id: { $in: vIds },
        deletedAt: null,
      })
        .select("_id stock variantName product")
        .lean();

      const vMap = new Map(vDocs.map((d) => [String(d._id), d]));
      const vErrors = [];
      for (const line of variantLines) {
        const v = vMap.get(String(line.variantId));
        if (!v) {
          vErrors.push(`Variant not found: ${line.variantName || line.name}`);
          continue;
        }
        const want = Number(line.qty || 0);
        if (!Number.isFinite(want) || want <= 0) {
          vErrors.push(`Invalid quantity for ${line.variantName || line.name}`);
          continue;
        }
        if ((v.stock ?? 0) < want) {
          vErrors.push(`Only ${v.stock ?? 0} left for ${line.variantName || line.name}`);
        }
      }
      if (vErrors.length) {
        return NextResponse.json(
          { success: false, message: "Insufficient stock", details: vErrors },
          { status: 409 }
        );
      }
    }

    // Check products (no variant)
    if (productLines.length) {
      const pIds = [...new Set(productLines.map((it) => String(it.productId)).filter(Boolean))];
      const pDocs = await Product.find({
        _id: { $in: pIds },
        deletedAt: null,
      })
        .select("_id name stock hasVariants")
        .lean();

      const pMap = new Map(pDocs.map((d) => [String(d._id), d]));
      const pErrors = [];
      for (const line of productLines) {
        const p = pMap.get(String(line.productId));
        if (!p) {
          pErrors.push(`Product not found: ${line.name}`);
          continue;
        }
        if (p.hasVariants) {
          pErrors.push(`Variant required for product: ${p.name}`);
          continue;
        }
        const want = Number(line.qty || 0);
        if (!Number.isFinite(want) || want <= 0) {
          pErrors.push(`Invalid quantity for ${line.name}`);
          continue;
        }
        if ((p.stock ?? 0) < want) {
          pErrors.push(`Only ${p.stock ?? 0} left for ${p.name}`);
        }
      }
      if (pErrors.length) {
        return NextResponse.json(
          { success: false, message: "Insufficient stock", details: pErrors },
          { status: 409 }
        );
      }
    }

    // ---- Payment normalization (paid/unpaid only)
    const normalizedPaymentStatus = payment?.status === "paid" ? "paid" : "unpaid";

    // ---- Initial order status
    let initialOrderStatus = "processing";
    if (normalizedPaymentStatus === "unpaid" && paymentMethod !== "cod") {
      initialOrderStatus = "pending payment";
    }

    // ---- Transaction: decrement stock -> create order (and generate seq)
    const session = await mongoose.startSession();
    let created;
    await session.withTransaction(async () => {
      // 1) Decrement stock atomically with guards
      // Variants first
      for (const line of variantLines) {
        const want = Number(line.qty || 0);
        if (want <= 0) continue;

        const updated = await ProductVariant.findOneAndUpdate(
          { _id: line.variantId, deletedAt: null, stock: { $gte: want } },
          { $inc: { stock: -want } },
          { session, new: true }
        );

        if (!updated) {
          throw new Error(
            `Insufficient stock for ${line.variantName || line.name}`
          );
        }
        // Post 'findOneAndUpdate' hook on ProductVariant will recalc product stock
      }

      // Then products without variants
      for (const line of productLines) {
        const want = Number(line.qty || 0);
        if (want <= 0) continue;

        const updated = await Product.findOneAndUpdate(
          { _id: line.productId, deletedAt: null, hasVariants: { $ne: true }, stock: { $gte: want } },
          { $inc: { stock: -want } },
          { session, new: true }
        );

        if (!updated) {
          throw new Error(`Insufficient stock for ${line.name}`);
        }
      }

      // 2) Sequence + display id
      const seq = await getNextOrderSequence(session);
      const prefix = ORDER_PREFIX[paymentMethod] || ORDER_PREFIX.default;
      const displayOrderId = `${prefix}-${seq}`;

      // 3) Create order (array form to pass session)
      const [doc] = await Order.create(
        [
          {
            userId: user.id,
            userRef: dbUser?._id,
            user: { name: user.name, email: user.email },

            customer,
            address,
            items,
            amounts,

            paymentMethod,
            payment: {
              status: normalizedPaymentStatus,
              provider: payment?.provider,
              providerRef: payment?.providerRef,
            },

            shipping: { carrier: "pathao", pricePlanPayload: metadata?.pricePlan },

            coupon: coupon || undefined,
            status: initialOrderStatus,

            notes: metadata?.notes,
            orderNumber: metadata?.orderNumber,

            display_order_id: displayOrderId,
            display_order_seq: seq,
            display_order_prefix: prefix,
          },
        ],
        { session }
      );

      created = doc;
    });

    return NextResponse.json(
      { success: true, message: "Order placed", data: created },
      { status: 201 }
    );
  } catch (err) {
    console.error("ORDER_CREATE_ERROR →", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
