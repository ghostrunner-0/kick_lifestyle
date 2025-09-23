// /app/api/daraz/order/[orderId]/route.js
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { ensureFreshDarazToken } from "@/lib/darazToken";
import { getOrder, getOrderItems } from "@/lib/darazMini";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  try {
    // Gate: only backoffice staff/admin can hit this
    const staff = await  isAuthenticated(["admin", "sales"]);
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();
    const param = await params;
    const orderId = param?.orderId;
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // Ensure we have a valid, refreshed token (your helper should do refresh if needed)
    const tokenDoc = await ensureFreshDarazToken();
    const token = tokenDoc?.access_token;
    if (!token) {
      return NextResponse.json(
        { error: "Daraz not connected. Please authorize first." },
        { status: 400 }
      );
    }

    const [order, items] = await Promise.all([
      getOrder(orderId, token),
      getOrderItems(orderId, token),
    ]);

    // If the order_id is invalid or not owned by the seller, Daraz returns E016.
    // getOrder/getOrderItems will throw; you’ll see message in the response below.

    // Normalize for your warranty form
    const buyer = {
      name:
        order?.address_shipping?.first_name ||
        order?.customer_first_name ||
        "",
      phone:
        order?.address_shipping?.phone ||
        order?.address_billing?.phone ||
        "",
      email: order?.customer_email || "",
      address:
        order?.address_shipping?.address1 ||
        order?.shipping_address ||
        "",
      city: order?.address_shipping?.city || "",
      country:
        order?.address_shipping?.country ||
        tokenDoc?.country ||
        "",
    };

    const lineItems = (items || []).map((it) => ({
      order_item_id: it.order_item_id,
      sku: it.sku,
      name: it.name || it.product_name,
      qty: it.quantity ?? it.qty ?? 1,
      price: it.item_price ?? it.paid_price ?? 0,
      status: it.status,
    }));

    return NextResponse.json({
      order_id: String(orderId),
      buyer,
      items: lineItems,
      // raw: { order, items }, // uncomment if you want raw payloads for debugging
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Lookup failed" },
      { status: 500 }
    );
  }
}
