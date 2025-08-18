// app/api/website/orders/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/DB";
import Order from "@/models/Orders.model";
import User from "@/models/User.model";

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
      userUpdates,        // optional snapshot used to update User
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

    // ---- Fetch user record (by id or email)
    let dbUser = null;
    if (user.id && /^[0-9a-fA-F]{24}$/.test(user.id)) {
      dbUser = await User.findById(user.id).lean();
    }
    if (!dbUser) {
      dbUser = await User.findOne({ email: user.email }).lean();
    }

    // ---- Update user profile if any fields changed
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

    // ---- Normalize payment status to your two states
    const normalizedPaymentStatus =
      payment?.status === "paid" ? "paid" : "unpaid";

    // ---- Choose initial order status
    // For online methods (khalti/qr) with unpaid → pending payment; else processing.
    let initialOrderStatus = "processing";
    if (normalizedPaymentStatus === "unpaid" && paymentMethod !== "cod") {
      initialOrderStatus = "pending payment";
    }

    // ---- Create order
    const doc = await Order.create({
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

      shipping: { carrier: "pathao", pricePlanPayload: metadata?.pricePlan }, // no status

      coupon: coupon || undefined,
      status: initialOrderStatus,

      notes: metadata?.notes,
      orderNumber: metadata?.orderNumber,
    });

    return NextResponse.json(
      { success: true, message: "Order placed", data: doc },
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
