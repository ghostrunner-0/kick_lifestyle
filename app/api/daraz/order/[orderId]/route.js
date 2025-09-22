import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { ensureFreshDarazToken } from "@/lib/darazToken";
import { getOrder, getOrderItems } from "@/lib/darazMini";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  try {
    // whoever is allowed to register warranty from backend
    const staff = await isAuthenticated("admin"); // or "staff"
    if (!staff)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();

    const orderId = params?.orderId;
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const tokenDoc = await ensureFreshDarazToken();
    if (!tokenDoc?.access_token) {
      return NextResponse.json(
        { error: "Daraz not connected. Authorize first." },
        { status: 400 }
      );
    }

    const [order, items] = await Promise.all([
      getOrder(orderId, tokenDoc.access_token),
      getOrderItems(orderId, tokenDoc.access_token),
    ]);

    // normalize the important fields for warranty form
    const buyer = {
      name:
        order?.address_shipping?.first_name || order?.customer_first_name || "",
      phone:
        order?.address_shipping?.phone || order?.address_billing?.phone || "",
      email: order?.customer_email || "",
      address:
        order?.address_shipping?.address1 || order?.shipping_address || "",
      city: order?.address_shipping?.city || "",
      country: order?.address_shipping?.country || tokenDoc?.country || "",
    };

    const lineItems = (items || []).map((it) => ({
      order_item_id: it.order_item_id,
      sku: it.sku,
      name: it.name || it.product_name,
      qty: it.quantity || it.qty || 1,
      price: it.item_price || it.paid_price || 0,
      status: it.status,
    }));

    return NextResponse.json({
      order_id: orderId,
      buyer,
      items: lineItems,
      raw: { order, items }, // remove if you don’t want raw
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Lookup failed" },
      { status: 500 }
    );
  }
}
