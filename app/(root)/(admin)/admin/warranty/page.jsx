"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table as UiTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Trash,
  Printer,
} from "lucide-react";
import { showToast } from "@/lib/ShowToast";

const cn = (...a) => a.filter(Boolean).join(" ");
const toNum = (v, d = 0) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : d;
};

/* ---------- Print helpers (same compact card) ---------- */
function printRow(rowData) {
  const today = new Date().toISOString().split("T")[0];
  let customerName = "",
    phoneNumber = "";
  const match = rowData.customer.match(/^\d+\s*\|\s*(.+)\s+\((\d+)\)$/);
  if (match) {
    customerName = match[1];
    phoneNumber = match[2];
  } else {
    customerName = rowData.customer;
    phoneNumber = "";
  }
  const warranty_class = rowData.warranty_period == 365 ? "111px" : "-60px";

  const productWithColor = `${rowData.product}${
    rowData.color ? ` (${rowData.color})` : ""
  }`;
  const len = productWithColor.length;
  const fontSize = len <= 32 ? 8 : len <= 44 ? 7 : len <= 56 ? 6 : 5;

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
<div class="text-line">${rowData.shopName || "Kick Lifestyle"}</div>
    <div class="text-line" style="margin-left:14px;margin-bottom:7px;">${
      rowData.serial
    }</div>
    <div class="warranty">✔️</div>
  </div>
  <script> window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; } </script>
</body>
</html>`);
  w.document.close();
  w.focus();
}

const summarizeProductsForPrint = (rowsArr) => {
  if (!rowsArr?.length) return { product: "", color: "" };
  const groups = new Map();
  rowsArr.forEach((r) => {
    const key = `${r.productName}||${r.variantName || ""}`;
    const g = groups.get(key) || {
      name: r.productName,
      color: r.variantName || "",
      qty: 0,
    };
    g.qty += 1;
    groups.set(key, g);
  });
  const list = [...groups.values()].sort((a, b) => b.qty - a.qty);
  const totalQty = rowsArr.length;
  if (list.length === 1)
    return { product: `${list[0].name} *${list[0].qty}`, color: list[0].color };
  const first = list[0],
    second = list[1];
  const shown = first.qty + (second ? second.qty : 0);
  let product = `${first.name} *${first.qty}`;
  if (second) product += ` | ${second.name} *${second.qty}`;
  if (totalQty - shown > 0) product += ` +${totalQty - shown} more`;
  return { product, color: "" };
};

/* ---------- Variant Picker (search website variants) ---------- */
function VariantPicker({ value, onChange, onWarrantyResolved }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState([]);
  const [selected, setSelected] = useState(null);

  async function searchVariants(term) {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/catalog/variants", {
        params: { q: term, page: 1, pageSize: 20 },
        withCredentials: true,
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      const mapped = items.map((r) => ({
        value: r.variant_id,
        label: `${r.product_name} — ${r.variant_name || "No variant"} — ${
          r.sku
        }`,
        productId: r.product_id,
        productName: r.product_name,
        variantId: r.variant_id,
        variantName: r.variant_name || "",
        sku: r.sku,
        // may or may not be present; we'll still re-verify below
        warrantyFromList: toNum(r.warranty_months, NaN),
      }));
      setOpts(mapped);
    } catch {
      setOpts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    searchVariants("");
  }, []);

  useEffect(() => {
    if (!value) setSelected(null);
    else if (opts.length) {
      const s = opts.find((o) => String(o.value) === String(value));
      if (s) setSelected(s);
    }
  }, [value, opts]);

  // when user picks a variant, re-fetch Product to guarantee warrantyMonths from Products
  const handlePick = async (opt) => {
    let warranty = Number.isFinite(opt.warrantyFromList)
      ? opt.warrantyFromList
      : NaN;
    if (!Number.isFinite(warranty) && opt.productId) {
      try {
        const { data } = await axios.get(`/api/product/get/${opt.productId}`, {
          withCredentials: true,
        });
        warranty = toNum(
          data?.data?.warrantyMonths ?? data?.warrantyMonths,
          12
        );
      } catch {
        warranty = 12;
      }
    }
    const enriched = {
      ...opt,
      warrantyMonths: Number.isFinite(warranty) ? warranty : 12,
    };
    onChange(enriched);
    onWarrantyResolved?.(enriched.warrantyMonths);
    setSelected(enriched);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          <span
            className={cn(
              "truncate text-left",
              !selected && "text-muted-foreground"
            )}
          >
            {selected ? selected.label : "Search variant…"}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search…"
            value={q}
            onValueChange={(v) => {
              setQ(v);
              searchVariants(v);
            }}
          />
          <CommandList>
            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading…</div>
            ) : (
              <>
                <CommandEmpty>No results</CommandEmpty>
                <CommandGroup>
                  {opts.map((o) => (
                    <CommandItem
                      key={o.value}
                      value={o.label}
                      className="truncate"
                      onSelect={() => handlePick(o)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          String(selected?.value) === String(o.value)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="truncate">{o.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Main Page ---------- */
export default function ManualWarrantyPage() {
  // Header
  const [channel, setChannel] = useState("kick");
  const [shopName, setShopName] = useState(""); // used only when offline
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Items rows (warrantyMonths now read-only & auto from product)
  const emptyRow = () => ({
    _key: crypto.randomUUID(),
    variant: null,
    serial: "",
    warrantyMonths: 12,
  });
  const [rows, setRows] = useState([emptyRow()]);

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (key) =>
    setRows((prev) => prev.filter((r) => r._key !== key));
  const setRowVariant = (key, v) =>
    setRows((prev) =>
      prev.map((r) =>
        r._key === key
          ? { ...r, variant: v, warrantyMonths: v.warrantyMonths }
          : r
      )
    );
  const setRowSerial = (key, serial) =>
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, serial } : r)));

  const computedShopName = useMemo(() => {
    if (channel === "offline") return shopName.trim();
    if (channel === "khalti") return "Khalti";
    return "Kick";
  }, [channel, shopName]);

  const canSubmit = useMemo(() => {
    if (!name.trim() || !phone.trim()) return false;
    if (channel === "offline" && !shopName.trim()) return false;
    if (!rows.length) return false;
    for (const r of rows) {
      if (!r.variant?.productId || !r.variant?.variantId) return false;
      if (!(r.serial || "").trim()) return false;
    }
    return true;
  }, [name, phone, channel, shopName, rows]);

  const resetForm = () => {
    setChannel("kick");
    setShopName("");
    setName("");
    setPhone("");
    setNotes("");
    setRows([emptyRow()]);
  };

  async function onSubmit({ andPrint = false } = {}) {
    if (!canSubmit) {
      showToast("error", "Fill all required fields");
      return;
    }
    const payload = {
      channel,
      shopName: computedShopName,
      customer: { name: name.trim(), phone: phone.trim() },
      notes: notes.trim(),
      items: rows.map((r) => ({
        productId: r.variant.productId,
        variantId: r.variant.variantId,
        productName: r.variant.productName,
        variantName: r.variant.variantName,
        serial: r.serial.trim(),
        // server will ignore this and pull from Product, but we still pass for clarity
        warrantyMonths: Number(r.warrantyMonths || 12),
      })),
    };

    try {
      setSaving(true);
      const { data } = await axios.post("/api/warranty/manual", payload, {
        withCredentials: true,
      });
      if (data?.success) {
        showToast("success", "Warranty registered");
        if (andPrint) {
          // Build summary + print one card per serial
          const summary = summarizeProductsForPrint(
            rows.map((r) => ({
              productName: r.variant.productName,
              variantName: r.variant.variantName,
            }))
          );
          const customerStr = `${name}${phone ? ` (${phone})` : ""}`;
          rows.forEach((r, i) => {
            const months = Number(r.warrantyMonths || 12);
            const warranty_period = months >= 12 ? 365 : months * 30;
            const payloadForPrint = {
              customer: customerStr,
              product: summary.product,
              color: summary.color,
              serial: r.serial.trim(),
              warranty_period,
              shopName: computedShopName,
            };
            setTimeout(() => printRow(payloadForPrint), i * 120);
          });
        }
        // ✅ fully reset after submit (and optional print)
        resetForm();
      } else {
        showToast("error", data?.error || "Failed");
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Failed";
      const dups = e?.response?.data?.duplicates;
      if (Array.isArray(dups) && dups.length) {
        showToast("error", `Duplicates: ${dups.join(", ")}`);
      } else {
        showToast("error", msg);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Manual Warranty Entry</h1>
        <Badge variant="secondary">Walk-in / POS</Badge>
      </div>

      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Registration Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kick">Kick</SelectItem>
                <SelectItem value="khalti">Khalti</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Shop Name</Label>
            <Input
              placeholder={
                channel === "offline" ? "Enter shop name" : computedShopName
              }
              value={channel === "offline" ? shopName : computedShopName}
              onChange={(e) => setShopName(e.target.value)}
              disabled={channel !== "offline"}
            />
          </div>

          <div className="space-y-1">
            <Label>Customer Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div className="space-y-1">
            <Label>Customer Phone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98XXXXXXXX"
            />
          </div>

          <div className="space-y-1 md:col-span-2 xl:col-span-3">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes…"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <UiTable className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-right">#</TableHead>
                  <TableHead className="min-w-[360px]">Variant</TableHead>
                  <TableHead className="min-w-[160px]">Serial</TableHead>
                  <TableHead className="min-w-[120px] text-right">
                    Warranty
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow key={r._key}>
                    <TableCell className="text-right">{idx + 1}</TableCell>

                    <TableCell className="max-w-[520px]">
                      <VariantPicker
                        value={r.variant?.variantId || ""}
                        onChange={(v) => setRowVariant(r._key, v)}
                        onWarrantyResolved={(wm) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x._key === r._key
                                ? { ...x, warrantyMonths: wm }
                                : x
                            )
                          )
                        }
                      />
                      {r.variant?.sku ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          SKU: {r.variant.sku} • {r.variant.productName}
                          {r.variant.variantName
                            ? ` — ${r.variant.variantName}`
                            : ""}
                        </div>
                      ) : null}
                    </TableCell>

                    <TableCell>
                      <Input
                        value={r.serial}
                        onChange={(e) => setRowSerial(r._key, e.target.value)}
                        placeholder="Serial…"
                      />
                    </TableCell>

                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {Number(r.warrantyMonths || 12)} mo
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(r._key)}
                        disabled={rows.length === 1}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </UiTable>
          </div>

          <div className="flex items-center justify-between mt-3">
            <Button variant="outline" onClick={addRow}>
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // local print preview without saving (optional)
                  const summary = summarizeProductsForPrint(
                    rows.map((r) => ({
                      productName: r.variant?.productName || "",
                      variantName: r.variant?.variantName || "",
                    }))
                  );
                  const customerStr = `${name}${phone ? ` (${phone})` : ""}`;
                  rows.forEach((r, i) => {
                    const months = Number(r.warrantyMonths || 12);
                    const warranty_period = months >= 12 ? 365 : months * 30;
                    setTimeout(
                      () =>
                        printRow({
                          customer: customerStr,
                          product: summary.product,
                          color: summary.color,
                          serial: r.serial.trim(),
                          warranty_period,
                        }),
                      i * 120
                    );
                  });
                }}
              >
                <Printer className="h-4 w-4 mr-2" /> Print Now
              </Button>
              <Button
                onClick={() => onSubmit({ andPrint: true })}
                disabled={!canSubmit || saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save & Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
