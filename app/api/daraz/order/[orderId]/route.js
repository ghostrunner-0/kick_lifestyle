// /app/api/daraz/warranty/resolve/[orderId]/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { ensureFreshDarazToken } from "@/lib/darazToken";
import { getOrder, getOrderItems } from "@/lib/darazMini";

export const runtime = "nodejs";

/**
 * Returns a normalized shape for the frontend:
 * {
 *   order_id: string,
 *   order_seq?: string,
 *   buyer: { name, phone, email, address, city, country },
 *   total?: number,
 *   items: [
 *     { seller_sku, daraz_sku_id, daraz_item_id, name, variant, qty, price, mapped: boolean,
 *       product_id?, variant_id?, warranty_months? }
 *   ]
 * }
 */
export async function GET(_req, { params }) {
  try {
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();

    const orderId = params?.orderId;
    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

    const tokenDoc = await ensureFreshDarazToken();
    const access_token = tokenDoc?.access_token;
    if (!access_token) return NextResponse.json({ error: "Daraz not connected" }, { status: 400 });

    // Parallel fetch
    const [order, items] = await Promise.all([
      getOrder(orderId, access_token),
      getOrderItems(orderId, access_token),
    ]);

    // Normalize buyer
    const buyer = {
      name: order?.address_shipping?.first_name || order?.customer_first_name || "",
      phone: order?.address_shipping?.phone || order?.address_billing?.phone || "",
      email: order?.customer_email || "",
      address: order?.address_shipping?.address1 || order?.shipping_address || "",
      city: order?.address_shipping?.city || "",
      country: order?.address_shipping?.country || tokenDoc?.country || "",
    };

    // Build SKU list
    const lines = (items || []).map((it) => ({
      seller_sku: it.sku || it.SellerSku || it.seller_sku || "",
      daraz_sku_id: it.SkuId ?? it.order_item_id ?? null,
      daraz_item_id: order?.order_id || null,
      name: it.name || it.product_name || "",
      variant: it.variation || it.sku?.split(":").slice(1).join(":") || "",
      qty: Number(it.quantity ?? it.qty ?? 1),
      price: Number(it.item_price ?? it.paid_price ?? 0),
    }));

    const sellerSkus = [...new Set(lines.map((l) => l.seller_sku).filter(Boolean))];

    // Lookup mappings in your collection (DarazMappings)
    const col = mongoose.connection.collection("DarazMappings");
    const maps = await col.find({ seller_sku: { $in: sellerSkus } }).toArray();
    const mapBySku = new Map(maps.map((m) => [m.seller_sku, m]));

    // Optionally fetch warrantyMonths for matched product ids
    const productIds = [...new Set(maps.map((m) => m.product_id).filter(Boolean))].map((id) => new mongoose.Types.ObjectId(id));
    let wByPid = new Map();
    if (productIds.length) {
      const prodCol = mongoose.connection.collection("Products");
      const prods = await prodCol.find({ _id: { $in: productIds } }, { projection: { warrantyMonths: 1 } }).toArray();
      wByPid = new Map(prods.map((p) => [String(p._id), Number(p.warrantyMonths || 12)]));
    }

    const outItems = lines.map((l) => {
      const m = mapBySku.get(l.seller_sku);
      if (!m) return { ...l, mapped: false };
      const wm = wByPid.get(String(m.product_id)) ?? Number(m.warranty_months || 12);
      return {
        ...l,
        mapped: true,
        product_id: String(m.product_id || ""),
        variant_id: String(m.variant_id || ""),
        warranty_months: wm,
      };
    });

    // Filter only mapped items for the serial entry flow (unmapped are informational)
    const mappedOnly = outItems.filter((x) => x.mapped);

    return NextResponse.json({
      order_id: String(orderId),
      order_seq: order?.order_number || order?.order_id || String(orderId),
      buyer,
      total: Number(order?.price || 0),
      items: mappedOnly,
      raw_count: outItems.length,
      mapped_count: mappedOnly.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Resolve failed" }, { status: 500 });
  }
}
