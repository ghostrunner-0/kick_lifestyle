export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import Order from "@/models/Orders.model";

/* -------- Company -------- */
const COMPANY = {
  name: process.env.COMPANY_NAME || "Kick Lifestyle",
  address: process.env.COMPANY_ADDR || "Kathmandu , Nepal",
  phone: process.env.COMPANY_PHONE || "9820810020",
  email: process.env.COMPANY_EMAIL || "info@kick-lifestyle.shop",
  logo: process.env.COMPANY_LOGO_URL || "", // set to /logo.png or full URL; leave empty to hide
};

/* -------- helpers -------- */
const formatNpr = (v) => {
  const n = Number(v || 0);
  return `Rs ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
function numberToWordsIndian(num) {
  num = Math.round(Number(num || 0));
  if (!num) return "Zero Rupees only";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const two = (n)=> n<20?ones[n]:tens[Math.floor(n/10)]+(n%10?` ${ones[n%10]}`:"");
  const three=(n)=> (Math.floor(n/100)?`${ones[Math.floor(n/100)]} Hundred${n%100?" ":""}`:"") + (n%100?two(n%100):"");
  let s=""; let crore=Math.floor(num/1e7); num%=1e7;
  let lakh=Math.floor(num/1e5); num%=1e5;
  let thou=Math.floor(num/1e3); num%=1e3;
  let hund=num;
  if(crore) s+=`${three(crore)} Crore `;
  if(lakh) s+=`${three(lakh)} Lakh `;
  if(thou) s+=`${three(thou)} Thousand `;
  if(hund) s+=three(hund);
  return (s.trim()+" Rupees only").replace(/\s+/g," ");
}
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");

/* -------- GET /preview?ids=a&ids=b (or ids=a,b) -------- */
export async function GET(req) {
  // ✅ allow both admin and sales and await the check
  const allowed = await isAuthenticated(["admin", "sales"]);
  if (!allowed) {
    return NextResponse.json({ success:false, message:"not authorized" }, { status:401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  let ids = searchParams.getAll("ids");
  if (ids.length === 1 && ids[0]?.includes(",")) {
    ids = ids[0].split(",").map(s=>s.trim()).filter(Boolean);
  }
  const oids = ids
    .filter(id => /^[0-9a-fA-F]{24}$/.test(String(id)))
    .map(id => new mongoose.Types.ObjectId(id));

  if (!oids.length) {
    return NextResponse.json({ success:false, message:"No valid order ids" }, { status:400 });
  }

  const orders = await Order.find({ _id: { $in: oids } })
    .sort({ display_order_seq: 1, createdAt: 1 })
    .lean();

  if (!orders.length) {
    return NextResponse.json({ success:false, message:"Orders not found" }, { status:404 });
  }

  return new NextResponse(renderHTML(orders), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/* -------- HTML -------- */
function renderHTML(orders) {
  const css = `
  <style>
    @page { size: A4; margin: 12mm; }
    :root { --b:#111; --mut:#444; --shade:#f3f4f6; }
    *{box-sizing:border-box}
    body{margin:0;background:#f6f7f8;font:400 13px/1.45 system-ui,-apple-system,Segoe UI,Inter,Roboto,Arial}
    .sheet{width:210mm;margin:0 auto;background:#fff}
    .print-btn{position:fixed;top:14px;right:16px;z-index:20;padding:8px 12px;border:1px solid #ddd;border-radius:8px;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.06);cursor:pointer}
    @media print{ .print-btn{ display:none } body{ background:#fff } }

    .invoice{border:1.5px solid var(--b); margin:14px 12px 24px}
    .title{font:700 22px/1.2 inherit; text-align:center; padding:8px 0 4px}

    /* header grid */
    .hdr{display:grid;grid-template-columns:2.6fr 1fr 1fr;border-top:1.5px solid var(--b);border-bottom:1.5px solid var(--b)}
    .company{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;padding:12px;border-right:1.5px solid var(--b)}
    .logo{width:82px;height:82px;object-fit:contain}
    .c-name{font-weight:800;font-size:22px}
    .c-meta{color:var(--mut);font-size:12px;margin-top:4px}
    .box{display:grid;grid-template-rows:auto 1fr}
    .box h6{margin:0;padding:8px 10px;border-left:1.5px solid var(--b);border-bottom:1.5px solid var(--b);background:var(--shade);font:600 13px/1 inherit}
    .box div{padding:10px;border-left:1.5px solid var(--b);font:800 15px/1.2 inherit}

    .sec{padding:10px 12px;border-bottom:1.5px solid var(--b)}
    .billto-title{font-weight:600}
    .billto-name{font-weight:800;font-size:15px;margin:6px 0}
    .billto-line{color:#111}

    table{width:100%;border-collapse:separate;border-spacing:0}
    thead th{background:var(--shade);font-weight:700}
    thead th, tbody td{border:1.5px solid var(--b);padding:8px 10px}
    thead th:first-child, tbody td:first-child{border-left-width:1.5px}
    thead th:last-child, tbody td:last-child{border-right-width:1.5px}
    .num{width:44px;text-align:center}
    .qty{width:90px;text-align:center}
    .price,.amt{text-align:right;width:130px}
    thead{display:table-header-group}

    .total-row td{font-weight:800;background:#fafafa}

    .grid2{display:grid;grid-template-columns:1.5fr 1fr;gap:12px;border-top:1.5px solid var(--b);padding:12px}
    .card{border:1.5px solid var(--b)}
    .card h5{margin:0;padding:8px 10px;border-bottom:1.5px solid var(--b);background:var(--shade);font-weight:700}
    .card .inner{padding:10px 12px}
    .words{font-weight:800}
    .amounts dt{float:left}
    .amounts dd{margin:0;text-align:right}
    .amounts dt,.amounts dd{padding:4px 0;border-bottom:1px solid #e5e7eb}
    .amounts .strong dt,.amounts .strong dd{font-weight:800;border-bottom:1.5px solid var(--b)}

    .terms{padding:12px 14px;border-top:1.5px solid var(--b)}
    .page{page-break-after:always}
    .page:last-child{page-break-after:auto}
  </style>`;

  const printBtn = `<button class="print-btn" onclick="window.print()">Print</button>`;
  const head = `
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Invoice Preview</title>
    ${css}
  `;

  const pages = orders.map(o => oneInvoice(o)).join("");
  return `<!doctype html>
<html>
<head>${head}</head>
<body>
  ${printBtn}
  <div class="sheet">
    ${pages}
  </div>
</body>
</html>`;
}

function oneInvoice(order){
  const {
    display_order_id,
    createdAt,
    customer = {},
    address = {},
    items = [],
    amounts = {},
    paymentMethod,
  } = order || {};

  const subtotal = Number(amounts?.subtotal || 0);
  const discount = Number(amounts?.discount || 0);
  const shipping = Number(amounts?.shippingCost || 0);
  const codFee  = Number(amounts?.codFee || 0);
  const total   = Number(amounts?.total ?? (subtotal - discount + shipping + codFee));
  const received = total; // adjust if you track partial payments
  const balance  = Math.max(0, total - received);

  const addrLine = [address?.landmark, address?.areaLabel, address?.zoneLabel, address?.cityLabel]
    .filter(Boolean).join(", ");

  const rows = items.map((it, i) => {
    const name = it?.variantName ? `${it?.name || ""} - ${it.variantName || ""}` : (it?.name || "");
    const qty = Number(it?.qty || 0);
    const unit = Number(it?.price || 0);
    const line = (it?.isFreeItem ? 0 : unit) * qty;
    return `
      <tr>
        <td class="num">${i+1}</td>
        <td>${esc(name || "—")}</td>
        <td class="qty">${qty}</td>
        <td class="price">${formatNpr(it?.isFreeItem ? 0 : unit)}</td>
        <td class="amt">${formatNpr(line)}</td>
      </tr>`;
  }).join("");

  return `
<section class="invoice page">
  <div class="title">Invoice</div>

  <div class="hdr">
    <div class="company">
      ${COMPANY.logo ? `<img class="logo" src="${esc(COMPANY.logo)}" alt="logo"/>` : `<div></div>`}
      <div>
        <div class="c-name">${esc(COMPANY.name)}</div>
        <div class="c-meta">
          ${esc(COMPANY.address)}<br/>
          Phone no.: ${esc(COMPANY.phone)}<br/>
          Email: ${esc(COMPANY.email)}
        </div>
      </div>
    </div>
    <div class="box">
      <h6>Invoice No.</h6>
      <div>${esc(display_order_id || "-")}</div>
    </div>
    <div class="box">
      <h6>Date</h6>
      <div>${createdAt ? new Date(createdAt).toLocaleDateString("en-GB") : "-"}</div>
    </div>
  </div>

  <div class="sec">
    <div class="billto-title">Bill To</div>
    <div class="billto-name">${esc(customer?.fullName || "—")}</div>
    <div class="billto-line">${addrLine ? esc(addrLine) : "—"}</div>
    <div class="billto-line">Contact No. : ${esc(customer?.phone || "—")}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Item name</th>
        <th class="qty">Quantity</th>
        <th class="price">Price/ Unit</th>
        <th class="amt">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td class="num"></td>
        <td><strong>Total</strong></td>
        <td class="qty"><strong>${items.reduce((a, it)=>a+Number(it?.qty||0),0)}</strong></td>
        <td class="price"></td>
        <td class="amt"><strong>${formatNpr(total)}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="grid2">
    <div class="card">
      <h5>Invoice Amount in Words</h5>
      <div class="inner words">${esc(numberToWordsIndian(total))}</div>
    </div>
    <div class="card">
      <h5>Amounts</h5>
      <div class="inner">
        <dl class="amounts">
          <div><dt>Sub Total</dt><dd>${formatNpr(subtotal)}</dd></div>
          ${discount>0 ? `<div><dt>Discount</dt><dd>- ${formatNpr(discount)}</dd></div>` : ""}
          ${shipping>0 ? `<div><dt>Shipping</dt><dd>${formatNpr(shipping)}</dd></div>` : ""}
          ${codFee>0 ? `<div><dt>COD Fee</dt><dd>${formatNpr(codFee)}</dd></div>` : ""}
          <div class="strong"><dt>Total</dt><dd>${formatNpr(total)}</dd></div>
          <div><dt>Received</dt><dd>${formatNpr(received)}</dd></div>
          <div><dt>Balance</dt><dd>${formatNpr(balance)}</dd></div>
        </dl>
      </div>
    </div>
  </div>

  <div class="terms">
    <div style="font-weight:700;margin-bottom:6px">Terms and conditions</div>
    <div>Thanks for doing business with us!</div>
    <div style="margin-top:6px;color:#666">Payment Method: ${esc(String(paymentMethod || "").toUpperCase() || "—")}</div>
  </div>
</section>`;
}
