export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import Order from "@/models/Orders.model";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";

/* ---- Company header (optional tweak via env) ---- */
const COMPANY = {
  name: process.env.COMPANY_NAME || "Kick Lifestyle",
  address: process.env.COMPANY_ADDR || "Kathmandu , Nepal",
  phone: process.env.COMPANY_PHONE || "9820810020",
  email: process.env.COMPANY_EMAIL || "info@kick-lifestyle.shop",
  logo: process.env.COMPANY_LOGO_URL || "", // e.g. "/logo.png" or full URL
};

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/*  GET /api/admin/orders/packing-list/preview?ids=<id>&ids=...
    (also accepts CSV ?ids=a,b,c)
*/
export async function GET(req) {
  // ✅ allow admin and sales
  const allowed = await isAuthenticated(["admin", "sales"]);
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: "not authorized" },
      { status: 401 }
    );
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  let ids = searchParams.getAll("ids");
  if (ids.length === 1 && ids[0]?.includes(",")) {
    ids = ids[0].split(",").map((s) => s.trim()).filter(Boolean);
  }
  const oids = ids
    .filter((id) => /^[0-9a-fA-F]{24}$/.test(String(id)))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (oids.length === 0) {
    return NextResponse.json(
      { success: false, message: "No valid order ids" },
      { status: 400 }
    );
  }

  const orders = await Order.find({ _id: { $in: oids } })
    .select({
      _id: 1,
      display_order_id: 1,
      createdAt: 1,
      items: 1,
    })
    .sort({ display_order_seq: 1, createdAt: 1 })
    .lean();

  if (!orders.length) {
    return NextResponse.json(
      { success: false, message: "Orders not found" },
      { status: 404 }
    );
  }

  // Aggregate items across all orders (variant-aware)
  const lines = aggregateLines(orders);

  // Try to fill missing images from DB (variant first, then product)
  await hydrateImages(lines);

  const html = renderHTML({ orders, lines, company: COMPANY });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/* ---------- Aggregation ---------- */
function aggregateLines(orders) {
  const map = new Map();
  for (const o of orders) {
    for (const it of o.items || []) {
      const key = String(it?.variantId || it?.productId || it?.name || "unknown");
      const prev = map.get(key) || {
        key,
        productId: it?.productId ? String(it.productId) : null,
        variantId: it?.variantId ? String(it.variantId) : null,
        name: it?.name || "",
        variantName: it?.variantName || "",
        image: it?.image || (Array.isArray(it?.images) ? it.images[0] : null),
        qty: 0,
      };
      prev.qty += Number(it?.qty || 0);
      if (!prev.image && (it?.image || it?.images?.[0])) {
        prev.image = it.image || it.images[0];
      }
      if (!prev.name && it?.name) prev.name = it.name;
      if (!prev.variantName && it?.variantName) prev.variantName = it.variantName;
      map.set(key, prev);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );
}

/* ---------- Image hydration from Product/Variant ---------- */
async function hydrateImages(lines) {
  const missingVariants = lines.filter((l) => !l.image && l.variantId).map((l) => l.variantId);
  const missingProducts  = lines.filter((l) => !l.image && !l.variantId && l.productId).map((l) => l.productId);

  const varDocs = missingVariants.length
    ? await ProductVariant.find({ _id: { $in: missingVariants } })
        .select("_id image images thumbnail variantName")
        .lean()
    : [];
  const prodDocs = missingProducts.length
    ? await Product.find({ _id: { $in: missingProducts } })
        .select("_id image images thumbnail name")
        .lean()
    : [];

  const vMap = new Map(varDocs.map((d) => [String(d._id), d]));
  const pMap = new Map(prodDocs.map((d) => [String(d._id), d]));

  for (const l of lines) {
    if (!l.image && l.variantId) {
      const v = vMap.get(l.variantId);
      l.image = v?.image || v?.thumbnail || (Array.isArray(v?.images) ? v.images[0] : null) || null;
    }
    if (!l.image && l.productId) {
      const p = pMap.get(l.productId);
      l.image = p?.image || p?.thumbnail || (Array.isArray(p?.images) ? p.images[0] : null) || null;
    }
  }
}

/* ---------- HTML Renderer ---------- */
function renderHTML({ orders, lines, company }) {
  const css = `
  <style>
    @page { size: A4; margin: 12mm; }
    body{ margin:0; background:#f6f7f8; font:400 13px/1.45 system-ui,-apple-system,Segoe UI,Inter,Roboto,Arial }
    *{ box-sizing:border-box }
    .print-btn{ position:fixed; top:14px; right:16px; z-index:20; padding:8px 12px; border:1px solid #ddd; border-radius:8px; background:#fff; box-shadow:0 2px 12px rgba(0,0,0,.06); cursor:pointer }
    @media print{ .print-btn{ display:none } body{ background:#fff } }
    .sheet{ width:210mm; margin:0 auto; background:#fff }
    .wrap{ border:1.5px solid #111; margin:14px 12px 24px }

    .title{ font:700 22px/1.2 inherit; text-align:center; padding:10px 0 2px }
    .hdr{ display:grid; grid-template-columns:2fr 1fr 1fr; border-top:1.5px solid #111; border-bottom:1.5px solid #111 }
    .company{ display:grid; grid-template-columns:auto 1fr; gap:12px; align-items:center; padding:12px; border-right:1.5px solid #111 }
    .logo{ width:70px; height:70px; object-fit:contain }
    .c-name{ font-weight:800; font-size:20px }
    .c-meta{ color:#444; font-size:12px; margin-top:2px }
    .box{ display:grid; grid-template-rows:auto 1fr }
    .box h6{ margin:0; padding:8px 10px; border-left:1.5px solid #111; border-bottom:1.5px solid #111; background:#f3f4f6; font:600 13px/1 }
    .box div{ padding:10px; border-left:1.5px solid #111; font:800 15px/1.2 }

    .meta{ display:flex; gap:16px; padding:10px 12px; border-bottom:1.5px solid #111; align-items:center; flex-wrap:wrap }
    .mut{ color:#555 }
    .pill{ background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; padding:4px 8px }

    table{ width:100%; border-collapse:separate; border-spacing:0 }
    thead th{ background:#f3f4f6; font-weight:700 }
    thead th, tbody td{ border:1.5px solid #111; padding:8px 10px; }
    .num{ width:44px; text-align:center }
    .img{ width:92px; text-align:center }
    .img img{ width:64px; height:64px; object-fit:cover; border:1px solid #e5e7eb; border-radius:6px; background:#fafafa }
    .name{ }
    .qty{ width:120px; text-align:right; font-weight:700 }
    tfoot td{ border:1.5px solid #111; font-weight:800; background:#fafafa }
    thead{ display:table-header-group } /* repeat header on new printed pages */
  </style>`;

  const printBtn = `<button class="print-btn" onclick="window.print()">Print</button>`;
  const head = `
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Packing List</title>
    ${css}
  `;

  const dateStr = new Date().toLocaleDateString("en-GB");
  const orderCount = orders.length;
  const totalUnits = lines.reduce((a, l) => a + (Number(l.qty) || 0), 0);

  const rows = lines.map((l, i) => {
    const title = esc(l.variantName ? `${l.name} — ${l.variantName}` : l.name);
    const img = l.image
      ? `<img src="${esc(l.image)}" alt="">`
      : `<div style="width:64px;height:64px;border:1px dashed #c7cdd4;border-radius:6px;display:grid;place-items:center;color:#95a2b3;font-size:11px;">No image</div>`;
    return `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="img">${img}</td>
        <td class="name">${title}</td>
        <td class="qty">${Number(l.qty)}</td>
      </tr>`;
  }).join("");

  return `<!doctype html>
<html>
<head>${head}</head>
<body>
  ${printBtn}
  <div class="sheet">
    <section class="wrap">
      <div class="title">Packing List</div>
      <div class="hdr">
        <div class="company">
          ${company.logo ? `<img class="logo" src="${esc(company.logo)}" alt="logo"/>` : `<div></div>`}
          <div>
            <div class="c-name">${esc(company.name)}</div>
            <div class="c-meta">
              ${esc(company.address)}<br/>
              Phone: ${esc(company.phone)}<br/>
              Email: ${esc(company.email)}
            </div>
          </div>
        </div>
        <div class="box">
          <h6>Date</h6>
          <div>${dateStr}</div>
        </div>
        <div class="box">
          <h6>Orders</h6>
          <div>${orderCount}</div>
        </div>
      </div>

      <div class="meta">
        <div class="pill">Unique Items: <strong>${lines.length}</strong></div>
        <div class="pill">Total Units: <strong>${totalUnits}</strong></div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="num">#</th>
            <th class="img">Image</th>
            <th class="name">Item</th>
            <th class="qty">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr>
            <td class="num"></td>
            <td class="img"></td>
            <td class="name">Total Units</td>
            <td class="qty">${totalUnits}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  </div>
</body>
</html>`;
}
