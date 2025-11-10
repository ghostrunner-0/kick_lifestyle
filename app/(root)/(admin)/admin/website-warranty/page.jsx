"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table as UiTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
import { showToast } from "@/lib/ShowToast";
import { ChevronsUpDown, Check, RefreshCw, Printer } from "lucide-react";

/* utils */
const cn = (...a) => a.filter(Boolean).join(" ");
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
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean).map(String)));
const toNum = (v, d = 0) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : d;
};

/* --------- PRINTING --------- */
/* Print one warranty card per row */
function printRow(rowData) {
  const today = new Date().toISOString().split("T")[0];

  let customerName = "";
  let phoneNumber = "";

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
  const contentLen = productWithColor.length;
  const fontSize =
    contentLen <= 32 ? 8 : contentLen <= 44 ? 7 : contentLen <= 56 ? 6 : 5;

  const printWindow = window.open("", "", "width=800,height=1000");

  printWindow.document.write(`
<html>
  <head>
    <title>Print Warranty</title>
    <style>
      @media print {
        @page { size: letter; margin: 0; }
        html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; }
      }
      html, body { margin: 0; padding: 0; height: 100%; width: 100%; font-family: Arial, sans-serif; }
      .centered-container {
        width: 3.5in; height: 5in; position: absolute; top: 17.8%; left: 50%;
        transform: translate(-50%, -50%); display: flex; flex-direction: column;
        align-items: center; justify-content: center; text-align: center; font-size: 10px; line-height: 1.6;
      }
      .text-line { margin-bottom: 5px; }
      .warranty { margin-left:${warranty_class}; }
      .product-line {
        margin-left:90px; font-size:${fontSize}px;
        max-width: 260px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
      }
    </style>
  </head>
  <body>
    <div class="centered-container">
      <div class="text-line">${customerName}</div>
      <div class="text-line">${phoneNumber}</div>
      <div class="text-line">${today}</div>
      <div class="text-line product-line">${productWithColor}</div>
      <div class="text-line">Kick Lifestyle</div>
      <div class="text-line" style="margin-left:14px;margin-bottom:7px;">${rowData.serial}</div>
      <div class="warranty">✔️</div>
    </div>
    <script>
      window.onload = function () {
        window.print();
        window.onafterprint = function () { window.close(); };
      };
    </script>
  </body>
</html>
`);
  printWindow.document.close();
  printWindow.focus();
}

/* Build single-line summary for all products in an order */
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

  if (list.length === 1) {
    const only = list[0];
    return {
      product: `${only.name} *${only.qty}`,
      color: only.color || "",
    };
  }

  const first = list[0];
  const second = list[1];
  const shownQty = first.qty + (second ? second.qty : 0);
  const rest = totalQty - shownQty;

  let product = `${first.name} *${first.qty}`;
  if (second) product += ` | ${second.name} *${second.qty}`;
  if (rest > 0) product += ` +${rest} more`;

  return { product, color: "" };
};

/* --------- Combobox --------- */
const OrdersComboBox = forwardRef(function OrdersComboBox(
  { options, loading, value, onChange, placeholder = "Select order…" },
  triggerRef
) {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState("");

  const selected =
    options.find((o) => String(o.value) === String(value))?.label || "";

  const filtered = filterText
    ? options.filter((o) =>
        o.label.toLowerCase().includes(filterText.toLowerCase())
      )
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          className="w-full sm:w-[520px] min-w-0 overflow-hidden justify-between"
        >
          <span
            className={cn(
              selected ? "" : "text-muted-foreground",
              "block truncate text-left min-w-0"
            )}
          >
            {selected || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search…"
            value={filterText}
            onValueChange={setFilterText}
          />
          <CommandList>
            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading…</div>
            ) : (
              <>
                <CommandEmpty>No matching orders</CommandEmpty>
                <CommandGroup>
                  {filtered.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={opt.label}
                      className="truncate"
                      onSelect={() => {
                        onChange(opt.value, opt);
                        setOpen(false);
                        setFilterText("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          String(value) === String(opt.value)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="truncate">{opt.label}</span>
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
});

/* --------- Page --------- */
export default function WarrantyFromOrdersFast() {
  const dropdownRef = useRef(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderOptions, setOrderOptions] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");

  const [order, setOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const snRefs = useRef({});

  const [warrantyByProduct, setWarrantyByProduct] = useState({});

  const enterGuardRef = useRef(0);
  const printLockRef = useRef(false);

  const focusDropdown = () => dropdownRef.current?.focus?.();

  /* ---- Load only ready-to-ship orders ---- */
  const loadReadyToPackOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { data } = await axios.get("/api/admin/orders/ready-to-ship", {
        withCredentials: true,
      });

      // Our API shape: { success, count, data: [orders] }
      // Also supports legacy { data: { items: [...] } } just in case.
      const items = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.items)
        ? data.data.items
        : [];

      setOrderOptions(
        items.map((o) => {
          const id = String(o._id);
          const disp = o.display_order_id || id;
          const name = o?.customer?.fullName || o?.customerName || "Customer";
          const phone = o?.customer?.phone || o?.customerPhone || "";
          const total = formatNpr(o?.amounts?.total || 0);
          return {
            value: id,
            label: `${disp} — ${name}${phone ? ` (${phone})` : ""} — ${total}`,
          };
        })
      );
    } catch (e) {
      setOrderOptions([]);
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "Failed to load orders"
      );
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReadyToPackOrders();
  }, [loadReadyToPackOrders]);

  const fetchWarrantyForProducts = useCallback(async (productIds = []) => {
    const unique = uniq(productIds);
    if (!unique.length) return {};
    const out = {};
    for (const pid of unique) {
      try {
        let months = null;
        try {
          const { data } = await axios.get(`/api/product/get/${pid}`, {
            withCredentials: true,
          });
          months = toNum(
            data?.data?.warrantyMonths ?? data?.warrantyMonths,
            null
          );
        } catch {
          const { data } = await axios.get("/api/product", {
            withCredentials: true,
            params: {
              start: 0,
              size: 1,
              filters: "[]",
              globalFilter: String(pid),
              sorting: "[]",
              deleType: "SD",
            },
          });
          const rec = Array.isArray(data?.data) ? data.data[0] : null;
          months = toNum(rec?.warrantyMonths, null);
        }
        out[pid] = months || 12;
      } catch {
        out[pid] = 12;
      }
    }
    return out;
  }, []);

  const loadOrderDetail = useCallback(
    async (id) => {
      if (!id) return;
      setOrderLoading(true);
      setOrder(null);
      setRows([]);
      setWarrantyByProduct({});

      try {
        const { data } = await axios.get(`/api/admin/orders/${id}`, {
          withCredentials: true,
        });
        const doc = data?.data || data?.order || null;
        if (!doc) throw new Error("Order not found");
        setOrder(doc);

        const expanded = [];
        const productIds = [];

        (doc.items || []).forEach((it, idx) => {
          const qty = Math.max(0, Number(it.qty || 0));
          const productId = String(it.productId || it._id || "");

          const base = {
            productId,
            productName: it.name || it.productName || `Item ${idx + 1}`,
            variantId: it.variantId || it?.variant?._id || null,
            variantName: it.variantName || it?.variant?.name || null,
            price: Number(it.isFreeItem ? 0 : it.price || 0),
          };

          if (productId) productIds.push(productId);

          for (let i = 0; i < qty; i++) {
            expanded.push({
              ...base,
              _key: `${productId}-${
                base.variantId || "novar"
              }-${idx}-${i}-${Date.now()}`,
              unitIndex: i + 1,
              serialNumber: "",
              warrantyMonths: null,
            });
          }
        });

        setRows(expanded);

        const map = await fetchWarrantyForProducts(productIds);
        setWarrantyByProduct(map);
        setRows((prev) =>
          prev.map((r) => ({
            ...r,
            warrantyMonths: map[r.productId] ?? 12,
          }))
        );

        requestAnimationFrame(() => {
          snRefs.current[0]?.focus?.();
        });
      } catch (e) {
        showToast(
          "error",
          e?.response?.data?.message || e?.message || "Failed to load order"
        );
      } finally {
        setOrderLoading(false);
      }
    },
    [fetchWarrantyForProducts]
  );

  const onPickOrder = (id) => {
    setSelectedOrderId(id);
    loadOrderDetail(id);
  };

  const setSNAtIndex = (rowIndex, sn) =>
    setRows((prev) => {
      const next = [...prev];
      if (next[rowIndex]) {
        next[rowIndex] = {
          ...next[rowIndex],
          serialNumber: sn,
        };
      }
      return next;
    });

  const allFilled = (arr) =>
    arr.every((r) => (r.serialNumber || "").trim().length > 0);

  const resetAll = () => {
    setOrder(null);
    setRows([]);
    setSelectedOrderId("");
    requestAnimationFrame(() => focusDropdown());
    setTimeout(() => (printLockRef.current = false), 50);
  };

  /* PRINT: save warranty + print cards */
  const doPrint = async (rowsSnapshot) => {
    if (!order) return;

    const seq = order?.display_order_seq || "";
    const name = order?.customer?.fullName || "";
    const phone = order?.customer?.phone || "";
    const customerStr = seq
      ? `${seq} | ${name}${phone ? ` (${phone})` : ""}`
      : `${name}${phone ? ` (${phone})` : ""}`;

    const snapshot = rowsSnapshot || rows;

    const itemsForDB = snapshot.map((r) => ({
      productId: r.productId || null,
      variantId: r.variantId || null,
      productName: r.productName,
      variantName: r.variantName || "",
      serial: (r.serialNumber || "").trim(),
      warrantyMonths: Number(
        warrantyByProduct[r.productId] ?? r.warrantyMonths ?? 12
      ),
    }));

    const savePayload = {
      channel: "kick",
      shopName: "Kick",
      userId: order.userId || null,
      orderId: order._id,
      customer: { name, phone },
      items: itemsForDB,
    };

    try {
      const { data } = await axios.post(
        "/api/admin/warranty/register/bulk",
        savePayload,
        {
          withCredentials: true,
        }
      );
      if (data?.success) {
        const ok = Number(data?.data?.inserted || 0);
        const dup = Number(data?.data?.duplicates || 0);
        const fail = Number(data?.data?.failed || 0);
        showToast(
          "success",
          `Saved ${ok}${dup ? `, ${dup} duplicate` : ""}${
            fail ? `, ${fail} failed` : ""
          }`
        );
      } else {
        showToast("error", data?.message || "Failed to save warranty");
      }
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "Save failed"
      );
    }

    const summary = summarizeProductsForPrint(snapshot);

    snapshot.forEach((r, i) => {
      const months = Number(
        warrantyByProduct[r.productId] ?? r.warrantyMonths ?? 12
      );
      const warranty_period = months >= 12 ? 365 : months * 30;

      const payloadForPrint = {
        customer: customerStr,
        product: summary.product,
        color: summary.color,
        serial: (r.serialNumber || "").trim(),
        warranty_period,
      };

      setTimeout(() => printRow(payloadForPrint), i * 120);
    });
  };

  const doPrintAndReset = (rowsSnapshot) => {
    if (printLockRef.current) return;
    printLockRef.current = true;
    doPrint(rowsSnapshot);
    resetAll();
  };

  const onSerialKeyDown = (e, idx) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    if (now - enterGuardRef.current < 220) return;
    enterGuardRef.current = now;

    const currentValue = e.currentTarget.value.trim();

    setRows((prev) => {
      const next = prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              serialNumber: currentValue,
            }
          : r
      );

      if (allFilled(next)) {
        setTimeout(() => doPrintAndReset(next), 0);
      } else {
        const start = Math.min(idx + 1, next.length - 1);
        let go = start;
        for (let i = start; i < next.length; i++) {
          if (!next[i].serialNumber?.trim()) {
            go = i;
            break;
          }
        }
        requestAnimationFrame(() => snRefs.current[go]?.focus?.());
      }

      return next;
    });
  };

  const onPasteMulti = (e, rowIndex) => {
    const text = e.clipboardData?.getData("text") || "";
    if (!text.includes("\n")) return;
    e.preventDefault();
    const parts = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;

    setRows((prev) => {
      const next = [...prev];
      for (let i = 0; i < parts.length && rowIndex + i < next.length; i++) {
        next[rowIndex + i] = {
          ...next[rowIndex + i],
          serialNumber: parts[i],
        };
      }

      if (allFilled(next)) {
        setTimeout(() => doPrintAndReset(next), 0);
      } else {
        requestAnimationFrame(() => {
          const ni = Math.min(rowIndex + parts.length, next.length - 1);
          snRefs.current[ni]?.focus?.();
        });
      }

      return next;
    });
  };

  const orderSummary = useMemo(() => {
    if (!order) return null;
    const totalQty = (order.items || []).reduce(
      (a, b) => a + Number(b?.qty || 0),
      0
    );
    return {
      disp: order.display_order_id || String(order._id),
      name: order?.customer?.fullName || "",
      phone: order?.customer?.phone || "",
      status: order.status,
      method: order.paymentMethod,
      total: formatNpr(order?.amounts?.total || 0),
      totalQty,
    };
  }, [order]);

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Warranty Registration — Rapid</h1>
        <Badge variant="secondary">Dropdown → Serial → Enter</Badge>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={loadReadyToPackOrders}
            title="Refresh list"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Order selector + summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <Label>Order</Label>
              <OrdersComboBox
                ref={dropdownRef}
                options={orderOptions}
                loading={ordersLoading}
                value={selectedOrderId}
                onChange={(id) => onPickOrder(id)}
                placeholder="Select order…" // ready-to-ship only
              />
            </div>

            {orderSummary && (
              <div className="sm:flex-1 sm:mt-6 sm:ml-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium truncate">
                    {orderSummary.disp}
                  </div>
                  <Badge className="capitalize" variant="secondary">
                    {orderSummary.status}
                  </Badge>
                  <Badge variant="outline" className="uppercase">
                    {orderSummary.method}
                  </Badge>
                  <div className="text-sm text-muted-foreground truncate">
                    {orderSummary.name}
                    {orderSummary.phone
                      ? ` • ${orderSummary.phone}`
                      : ""} • {orderSummary.totalQty} unit
                    {orderSummary.totalQty === 1 ? "" : "s"}
                  </div>
                  <div className="ml-auto text-sm font-medium">
                    {orderSummary.total}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Serial grid */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Serial Numbers</h3>
          <p className="text-sm text-muted-foreground">
            Scan serials. Scanner hits <kbd>Enter</kbd>. When all rows are
            filled, it saves, prints, resets, and focuses the dropdown.
          </p>
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
                  <TableHead className="min-w-[280px]">Serial Number</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Loading order…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Pick an order to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, idx) => (
                    <TableRow key={r._key}>
                      <TableCell className="text-right">{idx + 1}</TableCell>
                      <TableCell className="font-medium">
                        {r.productName}
                      </TableCell>
                      <TableCell>{r.variantName || "—"}</TableCell>
                      <TableCell className="text-right">
                        {formatNpr(r.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(
                          warrantyByProduct[r.productId] ??
                            r.warrantyMonths ??
                            12
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          ref={(el) => (snRefs.current[idx] = el)}
                          value={r.serialNumber}
                          placeholder="Scan / enter serial…"
                          enterKeyHint="done"
                          onChange={(e) => setSNAtIndex(idx, e.target.value)}
                          onKeyDown={(e) => onSerialKeyDown(e, idx)}
                          onPaste={(e) => onPasteMulti(e, idx)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UiTable>
          </div>

          <div className="flex items-center justify-between mt-3 text-sm">
            <div className="text-muted-foreground">
              {rows.length} row
              {rows.length === 1 ? "" : "s"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => rows.length && doPrint(rows)}
                disabled={!rows.length}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
