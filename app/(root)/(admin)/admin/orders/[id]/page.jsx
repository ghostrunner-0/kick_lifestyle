"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";

/* UI */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import {
  Table as UiTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/* Icons */
import {
  ArrowLeft,
  FileDown,
  PackageSearch,
  Truck,
  CheckCircle2,
  Plus,
  Trash2,
  ChevronsUpDown,
} from "lucide-react";

/* Toast */
import { showToast } from "@/lib/ShowToast";

/* ----------------- consts & helpers ----------------- */
const ORDER_STATUSES = [
  "processing",
  "pending payment",
  "payment Not Verified",
  "Invalid Payment",
  "ready to pack",
  "ready to ship",
  "completed",
  "cancelled",
];

const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "khalti", label: "Khalti" },
  { value: "qr", label: "QR Payment" },
];

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

/* API endpoints you provided */
const PRODUCTS_SEARCH_API = "/api/product";
const VARIANTS_API = "/api/product-variant";

/* build query strings your API expects */
const baseListParams = (overrides = {}) => ({
  start: 0,
  size: 10,
  filters: "[]",
  globalFilter: "",
  sorting: "[]",
  deleType: "SD",
  ...overrides,
});

/* mappers */
const mapProduct = (p) => ({
  id: p._id,
  name: p.name,
  image: p?.heroImage?.path || "/placeholder.png",
  mrp: Number(p?.mrp || 0),
  price: Number(p?.specialPrice ?? p?.mrp ?? 0),
});

const mapVariant = (v) => ({
  id: v._id,
  name: v.variantName,
  price: Number(v?.specialPrice ?? v?.mrp ?? 0),
  mrp: Number(v?.mrp ?? v?.specialPrice ?? 0),
  image: v?.swatchImage?.path || v?.productGallery?.[0]?.path || "/placeholder.png",
  sku: v?.sku || "",
});

/* fetch variants for a product */
async function fetchVariantsForProduct(product) {
  if (!product?.id) return [];
  // try productId filter first
  try {
    const { data } = await axios.get(VARIANTS_API, {
      withCredentials: true,
      params: baseListParams({
        size: 50,
        filters: JSON.stringify([{ id: "productId", value: product.id }]),
      }),
      paramsSerializer: { indexes: false },
    });
    const list = Array.isArray(data?.data) ? data.data : [];
    if (list.length) return list.map(mapVariant);
  } catch {}
  // fallback: globalFilter by product name
  try {
    const { data } = await axios.get(VARIANTS_API, {
      withCredentials: true,
      params: baseListParams({
        size: 50,
        globalFilter: product.name || "",
      }),
    });
    const list = Array.isArray(data?.data) ? data.data : [];
    return list.map(mapVariant);
  } catch {
    return [];
  }
}

/* Simple debounce helper */
function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* ----------------- Pickers with dark mode ----------------- */
function ProductPicker({ value, onPick, className }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState([]);

  const runSearch = useCallback(
    debounce(async (term) => {
      if (!term || term.trim().length < 2) {
        setOpts([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await axios.get(PRODUCTS_SEARCH_API, {
          withCredentials: true,
          params: baseListParams({ globalFilter: term, size: 10 }),
        });
        const list = Array.isArray(data?.data) ? data.data.map(mapProduct) : [];
        setOpts(list);
      } catch {
        setOpts([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    runSearch(q);
  }, [q, runSearch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-between", className)}>
          <span className={value?.name ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}>
            {value?.name || "Search product…"}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800"
      >
        <Command>
          <CommandInput placeholder="Type 2+ letters…" value={q} onValueChange={setQ} />
          <CommandList>
            {!loading && opts.length === 0 && <CommandEmpty>No products</CommandEmpty>}
            <CommandGroup>
              {opts.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.name}
                  onSelect={() => {
                    onPick(p);
                    setOpen(false);
                  }}
                >
                  <div className="relative h-6 w-6 mr-2 rounded border overflow-hidden bg-white">
                    <Image src={p.image} alt={p.name} fill sizes="24px" className="object-contain" />
                  </div>
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function VariantPicker({ product, value, onPick, className }) {
  const [open, setOpen] = useState(false);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!product?.id) {
        setVariants([]);
        return;
      }
      setLoading(true);
      const list = await fetchVariantsForProduct(product);
      if (!ignore) setVariants(list);
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [product?.id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-between", className)}
          disabled={!product?.id || loading}
        >
          <span className={value?.name ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}>
            {!product?.id ? "Select product first" : value?.name || (loading ? "Loading…" : "Select variant…")}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800"
      >
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            {variants.length === 0 && !loading && <CommandEmpty>No variants</CommandEmpty>}
            <CommandGroup>
              {variants.map((v) => (
                <CommandItem
                  key={v.id}
                  value={v.name}
                  onSelect={() => {
                    onPick(v);
                    setOpen(false);
                  }}
                >
                  <div className="relative h-6 w-6 mr-2 rounded border overflow-hidden bg-white">
                    <Image src={v.image} alt={v.name} fill sizes="24px" className="object-contain" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{v.name}</div>
                    <div className="text-xs text-muted-foreground">{formatNpr(v.price || 0)}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* Pathao combo (dark ready) */
function ComboBox({ value, valueLabel, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const selected =
    (options || []).find((o) => String(o.value) === String(value))?.label ||
    valueLabel ||
    "";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          <span className={selected ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}>
            {selected || placeholder || "Select…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800"
      >
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No options</CommandEmpty>
            <CommandGroup>
              {(options || []).map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(String(opt.value));
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ----------------- Page ----------------- */
export default function AdminOrderEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);

  /* editable: header/meta */
  const [status, setStatus] = useState("processing");
  const [adminNote, setAdminNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");

  /* editable: customer */
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");

  /* editable: address cascade (Pathao) */
  const [city, setCity] = useState("");
  const [zone, setZone] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");

  const [cityOptions, setCityOptions] = useState([]);
  const [zoneOptions, setZoneOptions] = useState([]);
  const [areaOptions, setAreaOptions] = useState([]);

  const [savedLabels, setSavedLabels] = useState({ city: "", zone: "", area: "" });

  /* editable: items */
  const [items, setItems] = useState([]);

  /* editable: amounts */
  const [discount, setDiscount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [codFee, setCodFee] = useState(0);

  /* -------- load order -------- */
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/admin/orders/${id}`, { withCredentials: true });
      const doc = data?.data || data?.order || null;
      if (!doc) throw new Error("Order not found");

      setOrder(doc);

      /* header/meta */
      setStatus(doc.status || "processing");
      setAdminNote(doc?.adminNote || "");
      setPaymentMethod((doc?.paymentMethod || "cod").toLowerCase());

      /* customer */
      setCustName(doc?.customer?.fullName || "");
      setCustPhone(doc?.customer?.phone || "");

      /* address */
      setCity(String(doc?.address?.cityId || ""));
      setZone(String(doc?.address?.zoneId || ""));
      setArea(String(doc?.address?.areaId || ""));
      setLandmark(doc?.address?.landmark || "");
      setSavedLabels({
        city: doc?.address?.cityLabel || "",
        zone: doc?.address?.zoneLabel || "",
        area: doc?.address?.areaLabel || "",
      });

      /* items */
      setItems(
        (doc?.items || []).map((it) => ({
          productId: it.productId || null,
          variantId: it.variantId || null,
          name: it.name || "",
          variantName: it.variantName || "",
          qty: Number(it.qty || 0),
          price: Number(it.isFreeItem ? 0 : it.price || 0),
          mrp: Number(it.mrp || it.price || 0),
          image: it.image || it?.variant?.image || "/placeholder.png",
          isFreeItem: !!it.isFreeItem,
          /* local assist fields for pickers */
          _product: it.productId
            ? { id: it.productId, name: it.name || "", image: it.image || "/placeholder.png" }
            : null,
          _variant: it.variantId
            ? { id: it.variantId, name: it.variantName || "", price: Number(it.price || 0), image: it.image || "/placeholder.png" }
            : null,
        }))
      );

      /* amounts */
      setDiscount(Number(doc?.amounts?.discount || 0));
      setShippingCost(Number(doc?.amounts?.shippingCost || 0));
      setCodFee(Number(doc?.amounts?.codFee || 0));
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Failed to load order");
      router.push("/admin/orders");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  /* -------- pathao options -------- */
  const fetchCities = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/pathao/cities");
      const list = Array.isArray(data?.data) ? data.data : data || [];
      setCityOptions(list.map((c) => ({ value: String(c.city_id ?? c.id), label: c.city_name ?? c.name })));
    } catch {
      setCityOptions([]);
    }
  }, []);
  const fetchZones = useCallback(async (cityId) => {
    if (!cityId) { setZoneOptions([]); return; }
    try {
      const { data } = await axios.get(`/api/pathao/zones?cityId=${cityId}`);
      const list = Array.isArray(data?.data) ? data.data : data || [];
      setZoneOptions(list.map((z) => ({ value: String(z.zone_id ?? z.id), label: z.zone_name ?? z.name })));
    } catch {
      setZoneOptions([]);
    }
  }, []);
  const fetchAreas = useCallback(async (zoneId) => {
    if (!zoneId) { setAreaOptions([]); return; }
    try {
      const { data } = await axios.get(`/api/pathao/areas?zoneId=${zoneId}`);
      const list = Array.isArray(data?.data) ? data.data : data || [];
      setAreaOptions(list.map((a) => ({ value: String(a.area_id ?? a.id), label: a.area_name ?? a.name })));
    } catch {
      setAreaOptions([]);
    }
  }, []);

  useEffect(() => { fetchCities(); }, [fetchCities]);
  useEffect(() => { if (city) fetchZones(city); }, [city, fetchZones]);
  useEffect(() => { if (zone) fetchAreas(zone); }, [zone, fetchAreas]);

  /* -------- items helpers -------- */
  const updateItem = (idx, patch) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addEmptyItem = () =>
    setItems((arr) => [
      ...arr,
      {
        productId: null,
        variantId: null,
        name: "",
        variantName: "",
        qty: 1,
        price: 0,
        mrp: 0,
        image: "/placeholder.png",
        isFreeItem: false,
        _product: null,
        _variant: null,
      },
    ]);

  const removeItem = (idx) => setItems((arr) => arr.filter((_, i) => i !== idx));

  /* -------- amounts / totals -------- */
  const subtotal = useMemo(
    () =>
      items.reduce((sum, it) => {
        const unit = it.isFreeItem ? 0 : Number(it.price || 0);
        return sum + unit * Number(it.qty || 0);
      }, 0),
    [items]
  );

  // keep shipping & codFee zeroed if not COD
  useEffect(() => {
    if (paymentMethod !== "cod") {
      setShippingCost(0);
      setCodFee(0);
    }
  }, [paymentMethod]);

  const total = useMemo(() => {
    const base = Math.max(0, subtotal - Math.max(0, Number(discount || 0)));
    return paymentMethod === "cod"
      ? base + Math.max(0, Number(shippingCost || 0)) + Math.max(0, Number(codFee || 0))
      : base;
  }, [paymentMethod, subtotal, discount, shippingCost, codFee]);

  /* -------- actions -------- */
  const openInvoice = () => {
    if (!order?._id) return;
    const url = `/api/admin/orders/invoices/preview?ids=${encodeURIComponent(order._id)}`;
    window.open(url, "_blank", "noopener");
  };
  const openPackingList = () => {
    if (!order?._id) return;
    const url = `/api/admin/orders/packing-list/preview?ids=${encodeURIComponent(order._id)}`;
    window.open(url, "_blank", "noopener");
  };
  const bookPathao = async () => {
    if (!order?._id) return;
    try {
      const { data } = await axios.post(
        "/api/admin/orders/pathao/book",
        { ids: [String(order._id)] },
        { withCredentials: true }
      );
      if (data?.success) showToast("success", data?.message || "Shipment accepted");
      else showToast("error", data?.message || "Booking failed");
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Booking failed");
    }
  };

  const save = async () => {
    if (!order?._id) return;
    setSaving(true);
    try {
      const payload = {
        status,
        adminNote,
        paymentMethod,
        customer: {
          fullName: custName.trim(),
          phone: custPhone.trim(),
        },
        address: {
          cityId: city || "",
          cityLabel:
            cityOptions.find((o) => String(o.value) === String(city))?.label || savedLabels.city || "",
          zoneId: zone || "",
          zoneLabel:
            zoneOptions.find((o) => String(o.value) === String(zone))?.label || savedLabels.zone || "",
          areaId: area || "",
          areaLabel:
            areaOptions.find((o) => String(o.value) === String(area))?.label || savedLabels.area || "",
          landmark: landmark.trim(),
        },
        items: items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId || null,
          name: it.name,
          variantName: it.variantName || null,
          qty: Number(it.qty || 0),
          price: Number(it.isFreeItem ? 0 : it.price || 0),
          mrp: Number(it.mrp || 0),
          image: it.image || undefined,
          isFreeItem: !!it.isFreeItem,
        })),
        amounts: {
          subtotal,
          discount: Math.max(0, Number(discount || 0)),
          shippingCost: paymentMethod === "cod" ? Math.max(0, Number(shippingCost || 0)) : 0,
          codFee: paymentMethod === "cod" ? Math.max(0, Number(codFee || 0)) : 0,
          total,
        },
      };

      const { data } = await axios.patch(`/api/admin/orders/${order._id}`, payload, {
        withCredentials: true,
      });

      if (data?.success) {
        showToast("success", "Order updated");
        await load();
      } else {
        showToast("error", data?.message || "Update failed");
      }
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }
  if (!order) return null;

  return (
    <div className="space-y-4 p-2 sm:p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/orders")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-xl font-semibold">
          Order <span className="font-mono">{order.display_order_id || order._id}</span>
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="uppercase">
            {paymentMethod || "—"}
          </Badge>
          <Badge
            className="capitalize"
            variant={
              status === "completed"
                ? "default"
                : ["processing", "ready to pack", "ready to ship"].includes(status)
                ? "secondary"
                : ["pending payment", "payment Not Verified"].includes(status)
                ? "outline"
                : ["Invalid Payment", "cancelled"].includes(status)
                ? "destructive"
                : "outline"
            }
          >
            {status}
          </Badge>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={openInvoice}>
          <FileDown className="h-4 w-4 mr-2" />
          Invoice
        </Button>
        <Button variant="outline" onClick={openPackingList}>
          <PackageSearch className="h-4 w-4 mr-2" />
          Packing List
        </Button>
        <Button variant="outline" onClick={bookPathao}>
          <Truck className="h-4 w-4 mr-2" />
          Book Pathao
        </Button>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Customer & Address (editable) */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <h3 className="font-semibold">Customer & Address</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Customer name</div>
                <Input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Phone</div>
                <Input
                  value={custPhone}
                  onChange={(e) => {
                    const v = (e.target.value || "").replace(/[^\d]/g, "").slice(0, 10);
                    setCustPhone(v);
                  }}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="98XXXXXXXX"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-1">
                <div className="text-xs text-muted-foreground">City</div>
                <ComboBox
                  value={city}
                  valueLabel={savedLabels.city}
                  onChange={(v) => {
                    setCity(v);
                    setZone("");
                    setArea("");
                  }}
                  options={cityOptions}
                  placeholder="Select city"
                />
              </div>
              <div className="sm:col-span-1">
                <div className="text-xs text-muted-foreground">Zone</div>
                <ComboBox
                  value={zone}
                  valueLabel={savedLabels.zone}
                  onChange={(v) => {
                    setZone(v);
                    setArea("");
                  }}
                  options={zoneOptions}
                  placeholder={city ? "Select zone" : "Pick city first"}
                  disabled={!city}
                />
              </div>
              <div className="sm:col-span-1">
                <div className="text-xs text-muted-foreground">Area</div>
                <ComboBox
                  value={area}
                  valueLabel={savedLabels.area}
                  onChange={setArea}
                  options={areaOptions}
                  placeholder={zone ? "Select area" : "Pick zone first"}
                  disabled={!zone}
                />
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground">Landmark</div>
                <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Nearby landmark" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit panel */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <h3 className="font-semibold">Order Meta</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Status</div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose status" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800">
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Payment method</div>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose method" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800">
                  {PAYMENT_METHODS.map((pm) => (
                    <SelectItem key={pm.value} value={pm.value}>
                      {pm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Admin note</div>
              <Textarea
                rows={4}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Private note visible to admins only"
              />
            </div>

            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : (<><CheckCircle2 className="h-4 w-4 mr-2" />Save changes</>)}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <h3 className="font-semibold">Items</h3>
          <Button variant="outline" size="sm" onClick={addEmptyItem}>
            <Plus className="h-4 w-4 mr-1" /> Add line item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <UiTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[26%]">Product</TableHead>
                  <TableHead className="w-[22%]">Variant</TableHead>
                  <TableHead>Item name</TableHead>
                  <TableHead className="text-right w-[10%]">Qty</TableHead>
                  <TableHead className="text-right w-[14%]">Price</TableHead>
                  <TableHead className="text-right w-[14%]">Line total</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => {
                  const unit = it.isFreeItem ? 0 : Number(it.price || 0);
                  const line = unit * Number(it.qty || 0);
                  const productValue = it._product || (it.productId ? { id: it.productId, name: it.name, image: it.image } : null);
                  const variantValue = it._variant || (it.variantId ? { id: it.variantId, name: it.variantName, price: it.price, image: it.image } : null);

                  return (
                    <TableRow key={`${idx}-${it.productId || "new"}`}>
                      {/* Product */}
                      <TableCell className="align-top">
                        <ProductPicker
                          value={productValue}
                          onPick={async (p) => {
                            updateItem(idx, {
                              _product: p,
                              productId: p.id,
                              name: it.name || p.name,
                              variantId: null,
                              variantName: "",
                              _variant: null,
                              image: p.image || it.image || "",
                            });

                            const variants = await fetchVariantsForProduct(p);
                            if (variants.length === 0) {
                              // no variants -> take price from product
                              updateItem(idx, {
                                price: it.isFreeItem ? 0 : Number(p.price || p.mrp || 0),
                                mrp: Number(p.mrp || p.price || 0),
                              });
                            } else {
                              // wait variant
                              updateItem(idx, { price: it.isFreeItem ? 0 : 0 });
                            }
                          }}
                        />
                      </TableCell>

                      {/* Variant */}
                      <TableCell className="align-top">
                        <VariantPicker
                          product={productValue}
                          value={variantValue}
                          onPick={(v) => {
                            updateItem(idx, {
                              _variant: v,
                              variantId: v.id,
                              variantName: v.name,
                              price: it.isFreeItem ? 0 : Number(v.price || 0),
                              mrp: Number(v.mrp || v.price || 0),
                              image: v.image || it.image || "",
                              name: it.name || productValue?.name || "",
                            });
                          }}
                        />
                      </TableCell>

                      {/* Item name */}
                      <TableCell className="align-top">
                        <Input
                          value={it.name}
                          onChange={(e) => updateItem(idx, { name: e.target.value })}
                          placeholder="Item title"
                        />
                      </TableCell>

                      {/* Qty */}
                      <TableCell className="text-right align-top">
                        <Input
                          value={String(it.qty)}
                          onChange={(e) =>
                            updateItem(idx, {
                              qty: Math.max(0, parseInt((e.target.value || "").replace(/[^\d]/g, "") || "0", 10)),
                            })
                          }
                          inputMode="numeric"
                          className="text-right"
                        />
                      </TableCell>

                      {/* Price */}
                      <TableCell className="text-right align-top">
                        <Input
                          value={it.isFreeItem ? "0" : String(it.price || 0)}
                          onChange={(e) => updateItem(idx, { price: Number(e.target.value || 0) })}
                          disabled={it.isFreeItem}
                          className="text-right"
                        />
                      </TableCell>

                      {/* Line */}
                      <TableCell className="text-right align-top">{formatNpr(line)}</TableCell>

                      {/* Remove */}
                      <TableCell className="align-top">
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                      No items. Click “Add line item”.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </UiTable>
          </div>
        </CardContent>
      </Card>

      {/* Amounts */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Amounts</h3>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatNpr(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Discount</span>
            <div className="flex items-center gap-2">
              <Input
                value={String(discount)}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value || 0)))}
                inputMode="numeric"
                className="w-32 text-right"
              />
              <Button variant="ghost" size="sm" onClick={() => setDiscount(0)}>
                Clear
              </Button>
            </div>
          </div>

          {paymentMethod === "cod" && (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Shipping</span>
                <Input
                  value={String(shippingCost)}
                  onChange={(e) => setShippingCost(Math.max(0, Number(e.target.value || 0)))}
                  inputMode="numeric"
                  className="w-32 text-right"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">COD fee</span>
                <Input
                  value={String(codFee)}
                  onChange={(e) => setCodFee(Math.max(0, Number(e.target.value || 0)))}
                  inputMode="numeric"
                  className="w-32 text-right"
                />
              </div>
            </>
          )}

          <Separator />
          <div className="flex items-center justify-between text-base">
            <span className="font-semibold">Total</span>
            <span className="font-semibold">{formatNpr(total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Debug */}
      <details className="rounded border p-3 bg-muted/20">
        <summary className="cursor-pointer text-sm text-muted-foreground">Debug: local state</summary>
        <pre className="mt-2 text-xs overflow-auto">
{JSON.stringify({ status, adminNote, paymentMethod, customer: { custName, custPhone }, address: { city, zone, area, landmark }, items, amounts: { subtotal, discount, shippingCost, codFee, total } }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
