"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table as UiTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { showToast } from "@/lib/ShowToast";
import { Barcode, Printer, RefreshCw } from "lucide-react";

/* utils */
const formatNpr = (v) => {
  const n = Number(v || 0);
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(n); }
  catch { return `Rs. ${n.toLocaleString("en-IN")}`; }
};
const toNum = (v, d = 0) => { const n = typeof v === "string" ? parseFloat(v) : Number(v); return Number.isFinite(n) ? n : d; };

/* printing */
function printRow(rowData) {
  const today = new Date().toISOString().split("T")[0];
  let customerName = "", phoneNumber = "";
  const match = rowData.customer.match(/^\d+\s*\|\s*(.+)\s+\((\d+)\)$/);
  if (match) { customerName = match[1]; phoneNumber = match[2]; } else { customerName = rowData.customer; phoneNumber = ""; }
  const warranty_class = rowData.warranty_period == 365 ? "111px" : "-60px";
  const productWithColor = `${rowData.product}${rowData.color ? ` (${rowData.color})` : ""}`;
  const contentLen = productWithColor.length;
  const fontSize = contentLen <= 32 ? 8 : contentLen <= 44 ? 7 : contentLen <= 56 ? 6 : 5;

  const w = window.open("", "", "width=800,height=1000");
  w.document.write(`
<html>
<head>
  <title>Print Warranty</title>
  <style>
    @media print { @page { size: letter; margin: 0; } html, body { margin:0; padding:0; height:100%; width:100%; overflow:hidden; } }
    html, body { margin:0; padding:0; height:100%; width:100%; font-family: Arial, sans-serif; }
    .centered-container { width:3.5in; height:5in; position:absolute; top:17.8%; left:50%; transform:translate(-50%, -50%);
      display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-size:10px; line-height:1.6; }
    .text-line { margin-bottom:5px; }
    .warranty { margin-left:${warranty_class}; }
    .product-line { margin-left:90px; font-size:${fontSize}px; max-width:260px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  </style>
</head>
<body>
  <div class="centered-container">
    <div class="text-line">${customerName}</div>
    <div class="text-line">${phoneNumber}</div>
    <div class="text-line">${today}</div>
    <div class="text-line product-line">${productWithColor}</div>
    <div class="text-line">Daraz</div>
    <div class="text-line" style="margin-left:14px;margin-bottom:7px;">${rowData.serial}</div>
    <div class="warranty">✔️</div>
  </div>
  <script> window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; } </script>
</body>
</html>`);
  w.document.close(); w.focus();
}

const summarizeProductsForPrint = (rowsArr) => {
  if (!rowsArr?.length) return { product: "", color: "" };
  const groups = new Map();
  rowsArr.forEach((r) => {
    const key = `${r.productName}||${r.variantName || ""}`;
    const g = groups.get(key) || { name: r.productName, color: r.variantName || "", qty: 0 };
    g.qty += 1; groups.set(key, g);
  });
  const list = [...groups.values()].sort((a,b)=>b.qty-a.qty);
  const totalQty = rowsArr.length;
  if (list.length === 1) return { product: `${list[0].name} *${list[0].qty}`, color: list[0].color };
  const first = list[0], second = list[1];
  const shown = first.qty + (second ? second.qty : 0);
  let product = `${first.name} *${first.qty}`;
  if (second) product += ` | ${second.name} *${second.qty}`;
  if (totalQty - shown > 0) product += ` +${totalQty - shown} more`;
  return { product, color: "" };
};

export default function DarazWarrantyOnlyWebsite() {
  const orderInputRef = useRef(null);
  const snRefs = useRef({});
  const enterGuardRef = useRef(0);
  const printLockRef = useRef(false);

  const [orderIdInput, setOrderIdInput] = useState("");
  const [loading, setLoading] = useState(false);

  // resolver payload (customer from Daraz, items → website-hydrated)
  const [norm, setNorm] = useState(null); // { order_id, order_seq, buyer, total }
  const [rows, setRows] = useState([]);   // expanded website items
  const [unmappedCount, setUnmappedCount] = useState(0);

  useEffect(() => { orderInputRef.current?.focus?.(); }, []);

  // Fetch order → only mapped website items
  const fetchResolved = async (id) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/daraz/warranty/resolve/${encodeURIComponent(id)}`, { withCredentials: true });
      if (!data || data.error) throw new Error(data?.error || "Failed");

      const mapped = Array.isArray(data.mapped_items) ? data.mapped_items : [];
      setUnmappedCount(Math.max(0, Number(data.raw_count || 0) - Number(data.mapped_count || mapped.length)));

      const expanded = [];
      mapped.forEach((it, idx) => {
        const w = it.website || null;
        if (!w) return;
        const qty      = Math.max(1, Number(it.qty || 1));
        const price    = toNum(it.price, 0); // info only (Daraz unit price)
        const warranty = toNum(w.warranty_months ?? it.warranty_months, 12);

        for (let i = 0; i < qty; i++) {
          expanded.push({
            _key: `${w.product_id}-${w.variant_id || "novar"}-${idx}-${i}-${Date.now()}`,
            productId: w.product_id || null,
            variantId: w.variant_id || null,
            productName: (w.product_name || "").trim(),
            variantName: (w.variant_name || "").trim(),
            price,
            warrantyMonths: warranty,
            serialNumber: "",
          });
        }
      });

      setNorm({
        order_id: data.order_id,
        order_seq: data.order_seq,
        buyer: data.buyer,
        total: data.total,
      });
      setRows(expanded);
      setTimeout(() => snRefs.current[0]?.focus?.(), 60);
    } catch (e) {
      showToast("error", e?.response?.data?.error || e?.message || "Could not load order");
      setNorm(null); setRows([]); setUnmappedCount(0);
    } finally { setLoading(false); }
  };

  // Scanner input: Enter triggers fetch
  const onScanKey = async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault(); e.stopPropagation();
    const now = Date.now(); if (now - enterGuardRef.current < 180) return;
    enterGuardRef.current = now;
    const v = (orderIdInput || "").trim();
    if (!v) return;
    await fetchResolved(v);
    setOrderIdInput("");
    requestAnimationFrame(() => orderInputRef.current?.focus?.());
  };

  const setSNAtIndex = (i, sn) =>
    setRows((prev) => {
      const n = [...prev];
      if (n[i]) n[i] = { ...n[i], serialNumber: sn };
      return n;
    });

  // SAVE to API (now with darazOrderId) then PRINT
  const doPrint = async (rowsSnapshot) => {
    if (!norm) return;
    const customerStr = `${norm?.order_seq || norm?.order_id || ""} | ${norm?.buyer?.name || ""}${norm?.buyer?.phone ? ` (${norm.buyer.phone})` : ""}`;

    const itemsForDB = (rowsSnapshot || rows).map((r) => ({
      productId: r.productId || null,
      variantId: r.variantId || null,
      productName: r.productName,
      variantName: r.variantName || "",
      serial: (r.serialNumber || "").trim(),
      warrantyMonths: Number(r.warrantyMonths || 12),
    }));

    try {
      const { data } = await axios.post(
        "/api/daraz/warranty/register",
        {
          channel: "daraz",
          shopName: "Daraz",
          userId: null,
          orderId: null, // external order
          darazOrderId: norm?.order_id || "", // <-- include it
          customer: { name: norm?.buyer?.name || "", phone: norm?.buyer?.phone || "" },
          notes: `Daraz order ${norm?.order_id}`,
          items: itemsForDB,
        },
        { withCredentials: true }
      );

      if (data?.success) {
        const { inserted = 0, duplicates = 0, failed = 0 } = data?.data || {};
        showToast("success", `Saved ${inserted}${duplicates ? `, ${duplicates} duplicate` : ""}${failed ? `, ${failed} failed` : ""}`);
      } else {
        showToast("error", data?.message || "Failed to save warranty");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Save failed");
    }

    // Print one ticket per serial
    const summary = summarizeProductsForPrint(rowsSnapshot || rows);
    (rowsSnapshot || rows).forEach((r, i) => {
      const months = Number(r.warrantyMonths || 12);
      const warranty_period = months >= 12 ? 365 : months * 30;
      const payload = {
        customer: customerStr,
        product: summary.product,
        color: summary.color,
        serial: (r.serialNumber || "").trim(),
        warranty_period,
      };
      setTimeout(() => printRow(payload), i * 120);
    });
  };

  const doPrintAndReset = (rowsSnapshot) => {
    if (printLockRef.current) return;
    printLockRef.current = true;
    doPrint(rowsSnapshot);
    // reset for next scan
    setNorm(null); setRows([]); setUnmappedCount(0);
    setTimeout(() => { printLockRef.current = false; orderInputRef.current?.focus?.(); }, 250);
  };

  const onSerialKeyDown = (e, idx) => {
    if (e.key !== "Enter") return;
    e.preventDefault(); e.stopPropagation();
    const now = Date.now(); if (now - enterGuardRef.current < 180) return; enterGuardRef.current = now;
    const val = e.currentTarget.value.trim();

    setRows((prev) => {
      const next = prev.map((r, i) => (i === idx ? { ...r, serialNumber: val } : r));
      const allFilled = next.every((x) => (x.serialNumber || "").trim());
      if (allFilled) {
        setTimeout(() => doPrintAndReset(next), 0);
      } else {
        // focus next empty
        const start = Math.min(idx + 1, next.length - 1);
        let go = start;
        for (let i = start; i < next.length; i++) {
          if (!next[i].serialNumber?.trim()) { go = i; break; }
        }
        requestAnimationFrame(() => snRefs.current[go]?.focus?.());
      }
      return next;
    });
  };

  const orderHeader = useMemo(() => {
    if (!norm) return null;
    return {
      id: norm.order_id,
      buyer: `${norm?.buyer?.name || ""}${norm?.buyer?.phone ? ` • ${norm.buyer.phone}` : ""}`,
      total: formatNpr(norm.total || 0),
    };
  }, [norm]);

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Daraz Warranty </h1>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => norm && fetchResolved(norm.order_id)}
            title="Reload order"
            disabled={!norm || loading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Order scan (scanner hits Enter) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Barcode className="h-5 w-5" /> Daraz Order
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[320px_1fr] items-end">
          <div className="space-y-1">
            <Label htmlFor="daraz-order">Order ID</Label>
            <Input
              id="daraz-order"
              ref={orderInputRef}
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
              placeholder="Scan Daraz order id and press Enter"
              onKeyDown={onScanKey}
              disabled={loading}
            />
          </div>

          {orderHeader && (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium truncate">{orderHeader.id}</div>
                <div className="text-sm text-muted-foreground truncate">{orderHeader.buyer}</div>
                <div className="ml-auto text-sm font-medium">{orderHeader.total}</div>
              </div>
              {unmappedCount > 0 && (
                <div className="text-xs text-amber-600 mt-1">
                  {unmappedCount} item{unmappedCount > 1 ? "s" : ""} not mapped — map to website variants to include them here.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items + Serials (website-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Serial Numbers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <UiTable className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-right">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Warranty (mo)</TableHead>
                  <TableHead className="min-w-[260px]">Serial Number</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!norm ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Scan Daraz order to begin.
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No mapped website items in this order.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, idx) => (
                    <TableRow key={r._key}>
                      <TableCell className="text-right">{idx + 1}</TableCell>
                      <TableCell className="font-medium max-w-[360px] truncate" title={r.productName}>
                        {r.productName}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate" title={r.variantName}>
                        {r.variantName || "—"}
                      </TableCell>
                      <TableCell className="text-right">{formatNpr(r.price)}</TableCell>
                      <TableCell className="text-right">{toNum(r.warrantyMonths, 12)}</TableCell>
                      <TableCell>
                        <Input
                          ref={(el) => (snRefs.current[idx] = el)}
                          value={r.serialNumber}
                          placeholder="Scan / enter serial…"
                          onChange={(e) => setSNAtIndex(idx, e.target.value)}
                          onKeyDown={(e) => onSerialKeyDown(e, idx)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UiTable>
          </div>

          <div className="flex items-center justify-between mt-3 text-sm">
            <div className="text-muted-foreground">{rows.length} row{rows.length === 1 ? "" : "s"}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => rows.length && doPrint(rows)} disabled={!rows.length}>
                <Printer className="h-4 w-4 mr-2" /> Print Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
