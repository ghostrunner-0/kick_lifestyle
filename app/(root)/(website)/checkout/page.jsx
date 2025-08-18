// app/checkout/page.jsx
"use client";

import React, { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

import {
  selectItems,
  selectSubtotal,
  setCoupon as setCouponAction,
} from "@/store/cartSlice";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ChevronsUpDown,
  Check,
  Banknote,
  Wallet,
  QrCode,
  ShoppingBag,
} from "lucide-react";
import { showToast } from "@/lib/ShowToast";

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
const sanitizePhone = (val) => (String(val || "").match(/\d+/g) || []).join("").slice(0, 10);

/* Combobox with valueLabel fallback */
function ComboBox({
  value,
  valueLabel,
  onChange,
  options,
  placeholder = "Select...",
  emptyText = "No options.",
  className,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const selected =
    options.find((o) => String(o.value) === String(value))?.label ||
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
          className={cn("w-full justify-between", className)}
        >
          <span className={selected ? "text-slate-900" : "text-slate-400"}>
            {selected || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(String(opt.value));
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      String(value) === String(opt.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
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

/* schema */
const schema = z.object({
  fullName: z.string().trim().min(1, "Required"),
  phone: z.string().regex(/^[\d]{10}$/, "Enter a valid 10-digit number"),
  city: z.string().min(1, "Choose a city"),
  zone: z.string().min(1, "Choose a zone"),
  area: z.string().min(1, "Choose an area"),
  landmark: z.string().trim().min(1, "Required"),
  paymentMethod: z.enum(["cod", "khalti", "qr"]),
  couponCode: z.string().optional(),
});

const idStr = (v) =>
  typeof v === "object" && v?._id ? String(v._id) : v != null ? String(v) : "";

/** Strict helpers mirrored on client for UI decisions */
const strictCouponCheck = {
  extractTargets: (couponObj) => {
    const productIds = (couponObj?.targets?.productIds ?? couponObj?.specificProducts ?? [])
      .map(idStr)
      .filter(Boolean);
    const variantIds = (couponObj?.targets?.variantIds ?? couponObj?.specificVariants ?? [])
      .map(idStr)
      .filter(Boolean);
    const freeItemVariantIdRaw =
      couponObj?.freeItem?.variantId ??
      couponObj?.freeItem?.variant?._id ??
      couponObj?.freeItem?.variant ??
      null;
    const freeItemVariantId = freeItemVariantIdRaw ? idStr(freeItemVariantIdRaw) : null;
    return { productIds, variantIds, freeItemVariantId };
  },
  isDiscountEligible: (couponObj, items) => {
    const { productIds, variantIds } = strictCouponCheck.extractTargets(couponObj);
    const setProduct = new Set(items.map((it) => String(it.productId)));
    const setVariant = new Set(items.map((it) => String(it?.variant?.id || "")));

    if (productIds.length > 0) {
      return productIds.some((pid) => setProduct.has(String(pid)));
    }
    if (variantIds.length > 0) {
      return variantIds.some((vid) => setVariant.has(String(vid)));
    }
    return true; // global
  },
  isFreeItemEligible: (couponObj, items) => {
    if (!strictCouponCheck.isDiscountEligible(couponObj, items)) return false;
    const { freeItemVariantId } = strictCouponCheck.extractTargets(couponObj);
    if (!freeItemVariantId) return true;
    const setVariant = new Set(items.map((it) => String(it?.variant?.id || "")));
    return setVariant.has(freeItemVariantId);
  },
};

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  const auth = useSelector((s) => s?.authStore?.auth);
  const isLoggedIn = !!auth;
  const authUser = auth?.user || auth;
  const authUserId = authUser?._id;

  const items = useSelector(selectItems) || [];
  const itemCount = items.reduce((n, it) => n + (it.qty || 0), 0);
  const subtotal = useSelector(selectSubtotal) || 0;
  const couponState = useSelector((s) => s?.cart?.coupon || null);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      phone: "",
      city: "",
      zone: "",
      area: "",
      landmark: "",
      paymentMethod: "cod",
      couponCode: "",
    },
  });

  const paymentMethod = form.watch("paymentMethod");

  /* location options (Pathao) */
  const [cityOptions, setCityOptions] = useState([]);
  const [zoneOptions, setZoneOptions] = useState([]);
  const [areaOptions, setAreaOptions] = useState([]);
  const [loadingLoc, setLoadingLoc] = useState({ city: false, zone: false, area: false });

  /* Saved labels from user profile (to show while options load) */
  const [savedLabels, setSavedLabels] = useState({ city: "", zone: "", area: "" });

  /* Shipping (Pathao price plan) */
  const [ship, setShip] = useState({ price: 0, loading: false, error: null });

  // Guards
  useEffect(() => {
    if (!isLoggedIn) router.replace("/auth/login?next=/checkout");
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (isLoggedIn && itemCount === 0) router.replace("/cart");
  }, [isLoggedIn, itemCount, router]);

  // ---- Pathao fetch helpers ----
  const fetchCities = async () => {
    setLoadingLoc((s) => ({ ...s, city: true }));
    try {
      const res = await axios.get("/api/pathao/cities");
      const list = Array.isArray(res.data?.data) ? res.data.data : res.data || [];
      setCityOptions(
        list.map((c) => ({
          value: String(c.city_id ?? c.id),
          label: c.city_name ?? c.name,
        }))
      );
    } catch {
      setCityOptions([]);
    } finally {
      setLoadingLoc((s) => ({ ...s, city: false }));
    }
  };

  const fetchZones = async (cityId) => {
    if (!cityId) return setZoneOptions([]);
    setLoadingLoc((s) => ({ ...s, zone: true }));
    try {
      const res = await axios.get(`/api/pathao/zones?cityId=${cityId}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : res.data || [];
      setZoneOptions(
        list.map((z) => ({
          value: String(z.zone_id ?? z.id),
          label: z.zone_name ?? z.name,
        }))
      );
    } catch {
      setZoneOptions([]);
    } finally {
      setLoadingLoc((s) => ({ ...s, zone: false }));
    }
  };

  const fetchAreas = async (zoneId) => {
    if (!zoneId) return setAreaOptions([]);
    setLoadingLoc((s) => ({ ...s, area: true }));
    try {
      const res = await axios.get(`/api/pathao/areas?zoneId=${zoneId}`);
      const list = Array.isArray(res.data?.data) ? res.data.data : res.data || [];
      setAreaOptions(
        list.map((a) => ({
          value: String(a.area_id ?? a.id),
          label: a.area_name ?? a.name,
        }))
      );
    } catch {
      setAreaOptions([]);
    } finally {
      setLoadingLoc((s) => ({ ...s, area: false }));
    }
  };

  // Calculate delivery price (Pathao price plan) when COD + city/zone are selected
  const calcDeliveryPrice = async (cityId, zoneId) => {
    if (!cityId || !zoneId) return;
    setShip({ price: 0, loading: true, error: null });
    try {
      const { data } = await axios.post("/api/pathao/price-plan", {
        item_type: 2,
        delivery_type: 48,
        item_weight: 0.5,
        recipient_city: Number(cityId),
        recipient_zone: Number(zoneId),
      });

      // Prefer final_price if > 0, otherwise fallback to price
      const finalRaw = data?.data?.final_price ?? data?.final_price;
      const priceRaw  = data?.data?.price ?? data?.price ?? 0;
      const finalNum  = typeof finalRaw === "number" ? finalRaw : NaN;
      const shipping  = finalNum > 0 ? finalNum : Number(priceRaw || 0);

      setShip({ price: shipping, loading: false, error: null });
    } catch (e) {
      setShip({ price: 0, loading: false, error: "Could not fetch delivery price" });
    }
  };
  // ------------------------------

  /* Load city list on mount for immediate UI */
  useEffect(() => {
    fetchCities();
  }, []);

  /* Fetch logged-in user profile and prefill */
  useEffect(() => {
    if (!isLoggedIn || !authUserId) return;

    (async () => {
      try {
        const res = await axios.get(`/api/users/${authUserId}/getuser`);
        const u = res?.data?.data ?? res?.data?.user ?? res?.data ?? null;
        if (!u) return;

        setSavedLabels({
          city: u.pathaoCityLabel || "",
          zone: u.pathaoZoneLabel || "",
          area: u.pathaoAreaLabel || "",
        });

        // name → fullName
        if (!form.getValues("fullName") && u.name)
          form.setValue("fullName", u.name, { shouldValidate: true });

        // phone → 10 digits
        const phone = sanitizePhone(u.phone || u.mobile || u?.profile?.phone);
        if (phone) form.setValue("phone", phone, { shouldValidate: true });

        // Prefill Pathao IDs + cascade
        await fetchCities();

        const cityId = u.pathaoCityId ? String(u.pathaoCityId) : "";
        if (cityId) {
          form.setValue("city", cityId, { shouldValidate: true });
          await fetchZones(cityId);
        }

        const zoneId = u.pathaoZoneId ? String(u.pathaoZoneId) : "";
        if (zoneId) {
          form.setValue("zone", zoneId, { shouldValidate: true });
          await fetchAreas(zoneId);
        }

        const areaId = u.pathaoAreaId ? String(u.pathaoAreaId) : "";
        if (areaId) {
          form.setValue("area", areaId, { shouldValidate: true });
        }

        // If COD and city/zone ready, calculate shipping
        if (form.getValues("paymentMethod") === "cod" && cityId && zoneId) {
          await calcDeliveryPrice(cityId, zoneId);
        }
      } catch {
        // allow manual entry
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, authUserId]);

  // Cascade + recalc delivery when user changes location/method
  useEffect(() => {
    const sub = form.watch(async (vals, { name }) => {
      if (name === "city") {
        form.setValue("zone", "");
        form.setValue("area", "");
        setAreaOptions([]);
        await fetchZones(vals.city);
      } else if (name === "zone") {
        form.setValue("area", "");
        await fetchAreas(vals.zone);
      }

      if (["city", "zone", "area", "paymentMethod"].includes(String(name))) {
        if (vals.paymentMethod === "cod" && vals.city && vals.zone) {
          await calcDeliveryPrice(vals.city, vals.zone);
        } else {
          setShip((s) => ({ price: 0, loading: false, error: null }));
        }
      }
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  /* coupon apply/remove (STRICT) */
  const applyCoupon = async () => {
    const code = (form.getValues("couponCode") || "").trim().toUpperCase();
    if (!code) return;

    try {
      const payload = {
        code,
        items: items.map((it) => ({
          productId: it.productId,
          variantId: it?.variant?.id || null,
          qty: Number(it.qty || 0),
    price: it.isFreeItem ? 0 : Number(it.price || 0),
        })),
      };
      const { data } = await axios.post("/api/website/coupons/apply", payload);

      if (!data?.success) {
        dispatch(setCouponAction(null));
        showToast("error", data?.message || "Invalid coupon");
        return;
      }

      const d = data.data;

      // If not eligible — show toast + clear coupon
      if (!d?.eligible) {
        dispatch(setCouponAction(null));
        showToast("error", d?.reason || "Coupon is not applicable to your cart");
        return;
      }

      // If it’s a free-item coupon (eligible), store info and add free item to cart if not present
      if (d?.freeItem?.exists && d?.freeItem?.eligible) {
        dispatch(
          setCouponAction({
            code,
            mode: "freeItem",
            freeItem: {
              variantId: d.freeItem.variantId,
              qty: Number(d.freeItem.qty || 1),
              productId: d.freeItem.productId || null,
              productName: d.freeItem.productName || "",
              variantName: d.freeItem.variantName || "",
            },
          })
        );
        // Add free item to cart if not present
        const freeItemKey = `${d.freeItem.productId}|${d.freeItem.variantId}`;
        const alreadyInCart = items.some(
          (it) => String(it.productId) === String(d.freeItem.productId) && String(it.variant?.id || it.variantId) === String(d.freeItem.variantId)
        );
        if (!alreadyInCart) {
          // Fetch real image for variant
          let image = "/placeholder.png";
          try {
            const res = await axios.get(`/api/website/product-variant/${d.freeItem.variantId}`);
            const v = res?.data?.data;
            image = v?.swatchImage?.path || v?.productGallery?.[0]?.path || image;
          } catch {}
          dispatch({
            type: "cart/addItem",
            payload: {
              productId: d.freeItem.productId,
              variant: { id: d.freeItem.variantId, name: d.freeItem.variantName, image },
              name: d.freeItem.productName,
              qty: Number(d.freeItem.qty || 1),
              price: 0,
              image,
            },
          });
        }
        showToast("success", `Coupon applied! Free item: ${d.freeItem.productName} — ${d.freeItem.variantName}`);
        return;
      }

      // Else: standard money discount
      const applied = Number(d?.moneyDiscount?.applied || 0);
      const type = d?.moneyDiscount?.type || "fixed";
      const amount = Number(d?.moneyDiscount?.amount || 0);

      dispatch(
        setCouponAction({
          code,
          mode: "money",
          discountType: type,
          discountAmount: amount,
          discountApplied: applied,
        })
      );
      showToast("success", `Coupon applied! You saved ${formatNpr(applied)}.`);
    } catch (e) {
      dispatch(setCouponAction(null));
      showToast("error", "Failed to apply coupon");
    }
  };

  const removeCoupon = () => {
    // Remove free item from cart if present
    if (couponState?.mode === "freeItem" && couponState?.freeItem?.variantId) {
      dispatch({
        type: "cart/removeItem",
        payload: {
          productId: couponState.freeItem.productId,
          variant: { id: couponState.freeItem.variantId },
        },
      });
    }
    dispatch(setCouponAction(null));
    showToast("info", "Coupon removed");
  };

  /* totals */
  const { discountApplied, freeItemActive } = useMemo(() => {
    if (!couponState) return { discountApplied: 0, freeItemActive: false };

    if (couponState.mode === "freeItem" && couponState?.freeItem?.variantId) {
      // Ensure strict: free-item still only “active” if that variant is currently in cart
      const setVariant = new Set(items.map((it) => String(it?.variant?.id || "")));
      const active = setVariant.has(String(couponState.freeItem.variantId));
      return { discountApplied: 0, freeItemActive: active };
    }

    if (couponState.mode === "money") {
      return {
        discountApplied: Math.min(subtotal, Number(couponState?.discountApplied || 0)),
        freeItemActive: false,
      };
    }

    return { discountApplied: 0, freeItemActive: false };
  }, [couponState, items, subtotal]);

  const codFee = paymentMethod === "cod" ? 50 : 0;
  const shippingCost = paymentMethod === "cod" ? ship.price : 0;
  const total = Math.max(0, subtotal - discountApplied) + shippingCost + codFee;

  /* submit */
  const onSubmit = (values) => {
    if (!isLoggedIn) {
      router.push("/auth/login?next=/checkout");
      return;
    }
    if (itemCount === 0) {
      router.push("/cart");
      return;
    }

    // Optional strict recheck for free item at submission
    if (couponState?.mode === "freeItem") {
      const setVariant = new Set(items.map((it) => String(it?.variant?.id || "")));
      if (!setVariant.has(String(couponState?.freeItem?.variantId))) {
        showToast("error", "Coupon requires a specific variant in your cart.");
        return;
      }
    }

    const payload = {
      customer: {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
      },
      address: {
        cityId: values.city,
        zoneId: values.zone,
        areaId: values.area,
        landmark: values.landmark.trim(),
      },
      paymentMethod: values.paymentMethod,
      coupon: couponState ?? undefined, // send exact applied metadata
      amounts: {
        subtotal,
        discount: discountApplied,
        shippingCost,
        codFee,
        total,
      },
      items: items.map((it) => ({
        productId: it.productId,
        variantId: it.variant?.id || null,
        name: it.name,
        variantName: it.variant?.name || null,
        qty: it.qty,
        price: it.price,
  mrp: it.isFreeItem ? 0 : it.mrp,
      })),
    };

    console.log("PLACE ORDER →", payload);
    // TODO: POST /api/orders
  };

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:pb-8">
        {/* Clean header (no "back to cart") */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Checkout</h1>
          <div className="text-sm text-slate-600 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span>{itemCount} item{itemCount === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT: form */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <h2 className="text-lg font-semibold">Shipping details</h2>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <fieldset className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="98XXXXXXXX"
                                inputMode="numeric"
                                pattern="\d{10}"
                                maxLength={10}
                                {...field}
                                onChange={(e) => {
                                  // Only allow digits, max 10
                                  const val = e.target.value.replace(/[^\d]/g, "").slice(0, 10);
                                  field.onChange(val);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>


                    {/* City */}
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <ComboBox
                              value={field.value}
                              valueLabel={savedLabels.city}
                              onChange={field.onChange}
                              options={cityOptions}
                              placeholder={loadingLoc.city ? "Loading..." : "Select city"}
                              emptyText="No cities"
                              disabled={loadingLoc.city}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Zone */}
                    <FormField
                      control={form.control}
                      name="zone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zone</FormLabel>
                          <FormControl>
                            <ComboBox
                              value={field.value}
                              valueLabel={savedLabels.zone}
                              onChange={field.onChange}
                              options={zoneOptions}
                              placeholder={loadingLoc.zone ? "Loading..." : "Select zone"}
                              emptyText="No zones"
                              disabled={loadingLoc.zone || !form.getValues("city")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Area */}
                    <FormField
                      control={form.control}
                      name="area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Area</FormLabel>
                          <FormControl>
                            <ComboBox
                              value={field.value}
                              valueLabel={savedLabels.area}
                              onChange={field.onChange}
                              options={areaOptions}
                              placeholder={loadingLoc.area ? "Loading..." : "Select area"}
                              emptyText="No areas"
                              disabled={loadingLoc.area || !form.getValues("zone")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Landmark (required) */}
                    <FormField
                      control={form.control}
                      name="landmark"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landmark</FormLabel>
                          <FormControl>
                            <Input placeholder="Nearby landmark to help the rider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    {/* Payment */}
                    <div className="space-y-3">
                      <h3 className="text-base font-semibold">Payment</h3>
                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RadioGroup
                                className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <label
                                  htmlFor="pm-cod"
                                  className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-xl border p-3",
                                    field.value === "cod" ? "border-slate-900" : "border-slate-200"
                                  )}
                                >
                                  <RadioGroupItem id="pm-cod" value="cod" />
                                  <Banknote className="h-5 w-5" />
                                  <span className="text-sm font-medium">
                                    Cash on Delivery{" "}
                                    <span className="ml-1 text-xs text-slate-500">(NPR 50 fee)</span>
                                  </span>
                                </label>

                                <label
                                  htmlFor="pm-khalti"
                                  className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-xl border p-3",
                                    field.value === "khalti" ? "border-slate-900" : "border-slate-200"
                                  )}
                                >
                                  <RadioGroupItem id="pm-khalti" value="khalti" />
                                  <Wallet className="h-5 w-5" />
                                  <span className="text-sm font-medium">Khalti</span>
                                </label>

                                <label
                                  htmlFor="pm-qr"
                                  className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-xl border p-3",
                                    field.value === "qr" ? "border-slate-900" : "border-slate-200"
                                  )}
                                >
                                  <RadioGroupItem id="pm-qr" value="qr" />
                                  <QrCode className="h-5 w-5" />
                                  <span className="text-sm font-medium">QR Payment</span>
                                </label>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </fieldset>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* RIGHT: sticky summary */}
          <div className="lg:col-span-5 lg:sticky lg:top-4 self-start space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Order summary</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Coupon */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Coupon code"
                    {...form.register("couponCode")}
                    className="h-10"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10"
                    onClick={applyCoupon}
                  >
                    Apply
                  </Button>
                  {couponState && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10"
                      onClick={removeCoupon}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                {/* Items */}
                <div className="rounded-xl bg-white/60 p-3">
                  <ul className="divide-y max-h-72 overflow-auto">
                    {items.map((it) => {
                      const key = `${it.productId}|${it.variant?.id || ""}`;
                      const title =
                        it.variant ? `${it.name} — ${it.variant.name}` : it.name;
                      const lineTotal =
                        (it.isFreeItem ? 0 : Number(it.price) || 0) * (Number(it.qty) || 0);
                      const img =
                        it.image || it.variant?.image || "/placeholder.png";
                      return (
                        <li key={key} className="flex items-center gap-3 py-2">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-white">
                            <Image
                              src={img}
                              alt={title}
                              fill
                              sizes="48px"
                              className="object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-1 text-sm font-medium">
                              {title}
                            </div>
                            <div className="text-xs text-slate-500">
                              {it.qty} × {formatNpr(it.isFreeItem ? 0 : it.price)}
                            </div>
                          </div>
                          <div className="text-sm font-semibold">
                            {formatNpr(lineTotal)}
                          </div>
                        </li>
                      );
                    })}

                    {/* Free item preview (only when active and not already in items list) */}
                    {couponState?.mode === "freeItem" && freeItemActive && !items.some(
                      (it) => String(it.productId) === String(couponState.freeItem.productId) && String(it.variant?.id || it.variantId) === String(couponState.freeItem.variantId)
                    ) && (
                      <li className="flex items-center gap-3 py-2 text-emerald-700">
                        <div className="h-12 w-12 shrink-0 grid place-items-center rounded-md border bg-emerald-50">
                          🎁
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-sm font-medium">
                            Free item: {couponState.freeItem.productName} — {couponState.freeItem.variantName}
                          </div>
                          <div className="text-xs">Qty: {couponState.freeItem.qty}</div>
                        </div>
                        <div className="text-sm font-semibold">{formatNpr(0)}</div>
                      </li>
                    )}
                  </ul>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">{formatNpr(subtotal)}</span>
                  </div>

                  {/* Money discount (only when not a free-item coupon) */}
                  {couponState?.mode === "money" && discountApplied > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">
                        Discount {couponState.code ? `(${couponState.code})` : ""}
                      </span>
                      <span className="font-medium">- {formatNpr(discountApplied)}</span>
                    </div>
                  )}

                  {/* Delivery (Pathao) */}
                  {paymentMethod === "cod" && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">
                        Delivery {ship.loading ? "(calculating…)" : ""}
                      </span>
                      <span className="font-medium">
                        {ship.loading ? "…" : formatNpr(shippingCost)}
                      </span>
                    </div>
                  )}
                  {ship.error && paymentMethod === "cod" && (
                    <div className="text-xs text-red-600">{ship.error}</div>
                  )}

                  {/* COD fee */}
                  {paymentMethod === "cod" && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">COD fee</span>
                      <span className="font-medium">{formatNpr(50)}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold">{formatNpr(total)}</span>
                  </div>
                </div>

                {/* Desktop button */}
                <Button
                  type="button"
                  className="mt-2 hidden w-full h-11 rounded-xl text-[14px] font-semibold sm:block"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={paymentMethod === "cod" && (ship.loading || ship.error)}
                  title={ship.error ? "Fix delivery details to continue" : undefined}
                >
                  {`Place Order — ${formatNpr(total)}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/90 backdrop-blur sm:hidden">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <Button
            className="w-full h-11 rounded-xl text-[14px] font-semibold"
            onClick={form.handleSubmit(onSubmit)}
            disabled={paymentMethod === "cod" && (ship.loading || ship.error)}
            title={ship.error ? "Fix delivery details to continue" : undefined}
          >
            {`Place Order — ${formatNpr(total)}`}
          </Button>
          <div className="pt-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );
}
