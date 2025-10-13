"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { showToast } from "@/lib/ShowToast";
import { Loader2, Search, Trash2, Printer } from "lucide-react";

/* --- utils & print --- */
const formatNpr = (v) => {
  const n = Number(v || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rs. ${n.toLocaleString("en-IN")}`;
  }
};
const toNepDate = (d) => (d ? new Date(d).toLocaleString() : "");
const addDays = (start, days) =>
  new Date(new Date(start).getTime() + days * 86400000);

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

export default function WarrantyListPage() {
  /* filters */
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all"); // all|active|expired
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* data */
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (q) params.set("q", q);
      if (channel) params.set("channel", channel);
      if (status) params.set("status", status);

      const { data } = await axios.get(
        `/api/warranty/items?${params.toString()}`,
        { withCredentials: true }
      );
      setRows(data?.items || []);
      setTotal(Number(data?.total || 0));
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.error || e?.message || "Load failed"
      );
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [page, pageSize, channel, status]);
  // Debounce search: simple approach
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      load();
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [q]);

  const onDelete = async (r) => {
    const ok = window.confirm(
      `Delete serial "${r.serial}"?${
        rows.filter(
          (x) => String(x.registrationId) === String(r.registrationId)
        ).length === 1
          ? "\n(This will delete the whole registration.)"
          : ""
      }`
    );
    if (!ok) return;
    try {
      const params = new URLSearchParams();
      if (r.serial) params.set("serial", r.serial);
      await axios.delete(
        `/api/warranty/${r.registrationId}?${params.toString()}`,
        { withCredentials: true }
      );
      showToast("success", "Deleted");
      load();
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.error || e?.message || "Delete failed"
      );
    }
  };

  const onPrint = (r) => {
    const customerStr = `${r?.customer?.name || ""}${
      r?.customer?.phone ? ` (${r.customer.phone})` : ""
    }`;
    const months = Number(r.warrantyMonths || 12);
    const warranty_period = months >= 12 ? 365 : months * 30;
    const payload = {
      customer: customerStr,
      product: r?.product?.productName || "",
      color: r?.product?.variantName || "",
      serial: r.serial,
      warranty_period,
      shopName: r?.shopName || "Kick",
    };
    printRow(payload);
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Warranty Registrations</h1>
        <Badge variant="secondary">{total} total</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_180px_180px_160px]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
            <Input
              className="pl-8"
              placeholder="Search serial / product / variant / name / phone / shop"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div>
            <Label className="sr-only">Channel</Label>
            <Select
              value={channel}
              onValueChange={(v) => {
                setPage(1);
                setChannel(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="kick">Kick</SelectItem>
                <SelectItem value="khalti">Khalti</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="daraz">Daraz</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="sr-only">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                setPage(1);
                setStatus(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (active + expired)</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="sr-only">Page size</Label>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPage(1);
                setPageSize(Number(v));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100, 200].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <UiTable className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead className="text-right">Months</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="py-8 text-center text-muted-foreground"
                    >
                      <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No results
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const expired = new Date(r.expiryDate) <= new Date();
                    return (
                      <TableRow key={`${r.registrationId}-${r.serial}`}>
                        <TableCell title={r.createdAt}>
                          {toNepDate(r.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {r.channel}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="max-w-[220px] truncate"
                          title={r.shopName}
                        >
                          {r.shopName || "—"}
                        </TableCell>
                        <TableCell
                          className="max-w-[220px] truncate"
                          title={r?.customer?.name || ""}
                        >
                          {r?.customer?.name || "—"}
                        </TableCell>
                        <TableCell>{r?.customer?.phone || "—"}</TableCell>
                        <TableCell
                          className="max-w-[260px] truncate"
                          title={r?.product?.productName || ""}
                        >
                          {r?.product?.productName || "—"}
                        </TableCell>
                        <TableCell
                          className="max-w-[220px] truncate"
                          title={r?.product?.variantName || ""}
                        >
                          {r?.product?.variantName || "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.serial}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.warrantyMonths}
                        </TableCell>
                        <TableCell>
                          <Badge variant={expired ? "destructive" : "outline"}>
                            {new Date(r.expiryDate).toLocaleDateString()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onPrint(r)}
                            >
                              <Printer className="h-4 w-4 mr-1" /> Print
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDelete(r)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </UiTable>
          </div>

          <div className="flex items-center justify-between mt-3 text-sm">
            <div className="text-muted-foreground">
              {total} result{total === 1 ? "" : "s"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <div>
                Page {page} / {maxPage}
              </div>
              <Button
                variant="outline"
                disabled={loading || page >= maxPage}
                onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
