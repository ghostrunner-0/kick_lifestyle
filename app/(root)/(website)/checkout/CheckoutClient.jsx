"use client";

import React, {
  useMemo,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
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
  clearCart,
} from "@/store/cartSlice";
import { ORDERS_THANK_YOU_ROUTE } from "@/routes/WebsiteRoutes";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  ChevronsUpDown,
  Check,
  Banknote,
  Wallet,
  QrCode,
  ShoppingBag,
  Info,
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
const sanitizePhone = (val) =>
  (String(val || "").match(/\d+/g) || []).join("").slice(0, 10);
const getLabel = (options, id, fallback = "") =>
  (options || []).find((o) => String(o.value) === String(id))?.label ||
  fallback ||
  "";
const toNum = (v) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

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
          className={cn("w-full justify-between cursor-pointer", className)}
        >
          <span className={selected ? "text-slate-900" : "text-slate-400"}>
            {selected || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
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
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      String(value) === String(opt.value)
                        ? "opacity-100"
                        : "opacity-0"
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

export default function CheckoutClient({ initialUser = null }) {
  const router = useRouter();
  const dispatch = useDispatch();

  // --- Auth from Redux (email-based) ---
  const auth = useSelector((s) => s?.authStore?.auth);
  const isHydrated = useSelector((s) => !!s?._persist?.rehydrated);
  const authUser = auth?.user || auth || null;
  const authEmail = authUser?.email ?? null;
  const isLoggedIn = !!authEmail;

  // --- Cart selectors ---
  const items = useSelector(selectItems) || [];
  const itemCount = items.reduce((n, it) => n + (it.qty || 0), 0);
  const subtotal = useSelector(selectSubtotal) || 0;
  const couponState = useSelector((s) => s?.cart?.coupon || null);
  const isCartEmpty = itemCount === 0;

  // --- Form ---
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
  const [loadingLoc, setLoadingLoc] = useState({
    city: false,
    zone: false,
    area: false,
  });

  /* Saved labels from user profile (to show while options load) */
  const [savedLabels, setSavedLabels] = useState({
    city: "",
    zone: "",
    area: "",
  });

  /* Shipping (Pathao price plan) */
  const [ship, setShip] = useState({ price: 0, loading: false, error: null });

  // Persisted user from /getuser for user id/name/email in payload
  const [currentUser, setCurrentUser] = useState(null);

  // price-plan de-dupe & race guards
  const lastPriceKeyRef = useRef("");
  const latestReqRef = useRef(0);
  const lastPricePlanReqRef = useRef(null);
  const lastPricePlanResRef = useRef(null);

  // ---- QR dialog state (show BEFORE creating order) ----
  const [qrOpen, setQrOpen] = useState(false);
  const [qrConfig, setQrConfig] = useState(null); // { displayName, image: { url|path } }
  const [qrFile, setQrFile] = useState(null);
  const [qrUploading, setQrUploading] = useState(false);
  const [qrPendingPayload, setQrPendingPayload] = useState(null); // order payload to create after proof chosen
  const [createdOrder, setCreatedOrder] = useState(null); // after successful creation

  // general "placing" guard to avoid double clicks across flows
  const [placing, setPlacing] = useState(false);

  const loadQRConfig = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/website/payments/qr/config", {
        withCredentials: true,
      });
      if (data?.success) setQrConfig(data.data);
      else showToast("error", data?.message || "QR not configured");
    } catch {
      showToast("error", "QR not configured");
    }
  }, []);

  const payableFromPayload = (p) =>
    Math.max(
      0,
      Number(
        p?.amounts?.total ??
          Math.max(0, subtotal - (couponState?.discountApplied || 0))
      )
    );

  // Guards
  useEffect(() => {
    if (isHydrated && !isLoggedIn) router.replace("/auth/login?next=/checkout");
  }, [isHydrated, isLoggedIn, router]);

  /* ---- Pathao fetch helpers ---- */
  const fetchCities = useCallback(async () => {
    setLoadingLoc((s) => ({ ...s, city: true }));
    try {
      const res = await axios.get("/api/pathao/cities");
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : res.data || [];
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
  }, []);

  const fetchZones = useCallback(async (cityId) => {
    if (!cityId) return setZoneOptions([]);
    setLoadingLoc((s) => ({ ...s, zone: true }));
    try {
      const res = await axios.get(`/api/pathao/zones?cityId=${cityId}`);
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : res.data || [];
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
  }, []);

  const fetchAreas = useCallback(async (zoneId) => {
    if (!zoneId) return setAreaOptions([]);
    setLoadingLoc((s) => ({ ...s, area: true }));
    try {
      const res = await axios.get(`/api/pathao/areas?zoneId=${zoneId}`);
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : res.data || [];
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
  }, []);

  // Robust price-plan
  const calcDeliveryPrice = useCallback(async (cityId, zoneId, areaId) => {
    const reqId = ++latestReqRef.current;
    setShip({ price: 0, loading: true, error: null });

    try {
      const body = {
        item_type: 2,
        delivery_type: 48,
        item_weight: 0.5,
        recipient_city: Number(cityId),
        recipient_zone: Number(zoneId),
      };
      if (areaId) body.recipient_area = Number(areaId);

      lastPricePlanReqRef.current = body;

      const { data } = await axios.post("/api/pathao/price-plan", body);

      if (reqId !== latestReqRef.current) return; // stale response, ignore

      lastPricePlanResRef.current = data;

      if (data && data.success === false) {
        const msg = data?.message || "Failed to fetch delivery price";
        setShip({ price: 0, loading: false, error: msg });
        return;
      }

      const priceCandidates = [
        data?.data?.final_price,
        data?.final_price,
        data?.data?.price,
        data?.price,
        data?.data?.result?.final_price,
        data?.data?.result?.price,
      ];
      const shipping = priceCandidates.map(toNum).find((n) => n > 0) ?? 0;

      if (shipping <= 0) {
        setShip({
          price: 0,
          loading: false,
          error: "Delivery price unavailable for this address",
        });
        return;
      }

      setShip({ price: shipping, loading: false, error: null });
    } catch (e) {
      if (reqId !== latestReqRef.current) return;
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Could not fetch delivery price";
      setShip({ price: 0, loading: false, error: msg });
    }
  }, []);

  // Cascade loaders; ONLY calc on area & payment method changes
  useEffect(() => {
    const sub = form.watch(async (vals, { name }) => {
      if (name === "city") {
        form.setValue("zone", "");
        form.setValue("area", "");
        setAreaOptions([]);
        setShip({ price: 0, loading: false, error: null });
        lastPriceKeyRef.current = "";
        await fetchZones(vals.city);
        return;
      }

      if (name === "zone") {
        form.setValue("area", "");
        setShip({ price: 0, loading: false, error: null });
        lastPriceKeyRef.current = "";
        await fetchAreas(vals.zone);
        return;
      }

      if (name === "area") {
        await maybeRecalc(
          vals.city,
          vals.zone,
          vals.area || null,
          vals.paymentMethod
        );
        return;
      }

      if (name === "paymentMethod") {
        await maybeRecalc(
          vals.city,
          vals.zone,
          vals.area || null,
          vals.paymentMethod
        );
        return;
      }
    });
    return () => sub.unsubscribe();
  }, [form, fetchZones, fetchAreas]); // (calc is referenced via maybeRecalc’s stable closure)

  const maybeRecalc = useCallback(
    async (cityId, zoneId, areaId, pay) => {
      if (pay !== "cod" || !cityId || !zoneId || !areaId) {
        setShip({ price: 0, loading: false, error: null });
        lastPriceKeyRef.current = "";
        return;
      }
      const key = `c:${cityId}|z:${zoneId}|a:${areaId}|pm:${pay}`;
      if (lastPriceKeyRef.current === key) return; // duplicate, skip
      lastPriceKeyRef.current = key;
      await calcDeliveryPrice(cityId, zoneId, areaId);
    },
    [calcDeliveryPrice]
  );

  /** Prefill helper */
  const prefillFromUser = useCallback(
    async (u) => {
      if (!u) return;

      setCurrentUser(u);

      setSavedLabels({
        city: u.pathaoCityLabel || "",
        zone: u.pathaoZoneLabel || "",
        area: u.pathaoAreaLabel || "",
      });

      if (!form.getValues("fullName") && u.name) {
        form.setValue("fullName", u.name, { shouldValidate: true });
      }
      if (!form.getValues("landmark") && u.address) {
        form.setValue("landmark", u.address, { shouldValidate: true });
      }
      const phone = sanitizePhone(u.phone || u.mobile || u?.profile?.phone);
      if (phone) form.setValue("phone", phone, { shouldValidate: true });

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
    },
    [form, fetchCities, fetchZones, fetchAreas]
  );

  /* Load city list on mount */
  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  /* Fetch user on load AFTER rehydration (or use initialUser if provided) */
  useEffect(() => {
    if (!isHydrated) return;

    (async () => {
      try {
        if (initialUser) {
          await prefillFromUser(initialUser);
          return;
        }
        if (!authEmail) return;

        const res = await axios.get(
          `/api/website/users/${encodeURIComponent(authEmail)}/getuser`,
          {
            withCredentials: true,
          }
        );
        const u = res?.data?.data ?? res?.data?.user ?? res?.data ?? null;
        await prefillFromUser(u);
      } catch (e) {
        console.log("USER API ERROR →", e?.response?.data || e?.message);
      }
    })();
  }, [isHydrated, authEmail, initialUser, prefillFromUser]);

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

      if (!d?.eligible) {
        dispatch(setCouponAction(null));
        showToast(
          "error",
          d?.reason || "Coupon is not applicable to your cart"
        );
        return;
      }

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
        const alreadyInCart = items.some(
          (it) =>
            String(it.productId) === String(d.freeItem.productId) &&
            String(it.variant?.id || it.variantId) ===
              String(d.freeItem.variantId)
        );
        if (!alreadyInCart) {
          let image = "/placeholder.png";
          try {
            const res = await axios.get(
              `/api/website/product-variant/${d.freeItem.variantId}`
            );
            const v = res?.data?.data;
            image =
              v?.swatchImage?.path || v?.productGallery?.[0]?.path || image;
          } catch {}
          dispatch({
            type: "cart/addItem",
            payload: {
              productId: d.freeItem.productId,
              variant: {
                id: d.freeItem.variantId,
                name: d.freeItem.variantName,
                image,
              },
              name: d.freeItem.productName,
              qty: Number(d.freeItem.qty || 1),
              price: 0,
              image,
            },
          });
        }
        showToast(
          "success",
          `Coupon applied! Free item: ${d.freeItem.productName} — ${d.freeItem.variantName}`
        );
        return;
      }

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
  const memoTotals = useMemo(() => {
    if (!couponState) return { discountApplied: 0, freeItemActive: false };

    if (couponState.mode === "freeItem" && couponState?.freeItem?.variantId) {
      const setVariant = new Set(
        items.map((it) => String(it?.variant?.id || ""))
      );
      const active = setVariant.has(String(couponState.freeItem.variantId));
      return { discountApplied: 0, freeItemActive: active };
    }

    if (couponState.mode === "money") {
      return {
        discountApplied: Math.min(
          subtotal,
          Number(couponState?.discountApplied || 0)
        ),
        freeItemActive: false,
      };
    }

    return { discountApplied: 0, freeItemActive: false };
  }, [couponState, items, subtotal]);

  const discountApplied = memoTotals.discountApplied;
  const freeItemActive = memoTotals.freeItemActive;

  const codFee = paymentMethod === "cod" ? 50 : 0;
  const shippingCost = paymentMethod === "cod" ? ship.price : 0;
  const baseTotal = Math.max(0, subtotal - discountApplied);
  const total = baseTotal + shippingCost + codFee;

  // Single flag to disable both buttons
  const isPlaceOrderDisabled = useMemo(() => {
    if (isCartEmpty) return true;
    if (placing) return true;
    if (paymentMethod !== "cod") return false;
    return ship.loading || !!ship.error;
  }, [isCartEmpty, paymentMethod, ship.loading, ship.error, placing]);

  /* submit */
  const onSubmit = async (values) => {
    if (!isLoggedIn) {
      router.push("/auth/login?next=/checkout");
      return;
    }
    if (isCartEmpty) {
      showToast("info", "Your cart is empty. Add items to continue.");
      return;
    }
    if (couponState?.mode === "freeItem") {
      const setVariant = new Set(
        items.map((it) => String(it?.variant?.id || ""))
      );
      if (!setVariant.has(String(couponState?.freeItem?.variantId))) {
        showToast("error", "Coupon requires a specific variant in your cart.");
        return;
      }
    }
    if (paymentMethod === "cod") {
      if (ship.loading) {
        showToast("info", "Hold on—calculating delivery price…");
        return;
      }
      if (ship.error) {
        showToast("error", "Fix delivery details to continue");
        return;
      }
    }

    // derive labels
    const vals = form.getValues();
    const cityLabel = getLabel(cityOptions, vals.city, savedLabels.city);
    const zoneLabel = getLabel(zoneOptions, vals.zone, savedLabels.zone);
    const areaLabel = getLabel(areaOptions, vals.area, savedLabels.area);

    // ----- ORDER PAYLOAD (server generates display_order_id + seq)
    const payload = {
      user: {
        id: currentUser?._id || currentUser?.id || "",
        email: currentUser?.email || authEmail || "",
        name: currentUser?.name || values.fullName.trim(),
      },
      customer: {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
      },
      address: {
        cityId: values.city,
        cityLabel,
        zoneId: values.zone,
        zoneLabel,
        areaId: values.area,
        areaLabel,
        landmark: values.landmark.trim(),
      },
      items: items.map((it) => ({
        productId: it.productId,
        variantId: it.variant?.id || null,
        name: it.name,
        variantName: it.variant?.name || null,
        qty: it.qty,
        price: it.price,
        mrp: it.isFreeItem ? 0 : it.mrp,
        image: it.image || it.variant?.image || undefined,
      })),
      amounts: {
        subtotal,
        discount: discountApplied,
        shippingCost: paymentMethod === "cod" ? shippingCost : 0,
        codFee: paymentMethod === "cod" ? codFee : 0,
        total: paymentMethod === "cod" ? total : baseTotal,
      },
      paymentMethod: values.paymentMethod, // "cod" | "khalti" | "qr"
      coupon: couponState ?? undefined,
      metadata: {
        pricePlan: {
          request: lastPricePlanReqRef.current || null,
          response: lastPricePlanResRef.current || null,
          shippingPrice: paymentMethod === "cod" ? shippingCost : 0,
        },
      },
      userUpdates: {
        name: values.fullName.trim(),
        phone: values.phone.trim(),
        address: values.landmark.trim(),
        pathaoCityId: values.city,
        pathaoCityLabel: cityLabel,
        pathaoZoneId: values.zone,
        pathaoZoneLabel: zoneLabel,
        pathaoAreaId: values.area,
        pathaoAreaLabel: areaLabel,
      },
    };

    if (!payload.user.id || !payload.user.email) {
      showToast("error", "Could not identify user. Please re-login.");
      router.push("/auth/login?next=/checkout");
      return;
    }

    try {
      setPlacing(true);

      // ---- KHALTI FLOW (create order first, then initiate for that order)
      if (paymentMethod === "khalti") {
        const { data: createRes } = await axios.post(
          "/api/website/orders",
          payload,
          { withCredentials: true }
        );
        if (!createRes?.success || !createRes?.data?.display_order_id) {
          showToast("error", createRes?.message || "Failed to create order");
          setPlacing(false);
          return;
        }
        const displayId = createRes.data.display_order_id;

        const { data: initRes } = await axios.post(
          "/api/website/payments/khalti/initiate",
          { display_order_id: displayId },
          { withCredentials: true }
        );
        if (initRes?.success && initRes?.payment_url) {
          window.location.href = initRes.payment_url;
          return;
        }
        showToast(
          "error",
          initRes?.message || "Failed to initiate Khalti payment"
        );
        setPlacing(false);
        return;
      }

      // ---- QR FLOW: open dialog first (no order yet)
      if (paymentMethod === "qr") {
        setQrPendingPayload(payload);
        if (!qrConfig) await loadQRConfig();
        setQrOpen(true);
        setPlacing(false);
        return;
      }

      // ---- COD FLOW
      const { data } = await axios.post("/api/website/orders", payload, {
        withCredentials: true,
      });
      if (data?.success && data?.data?._id) {
        dispatch(clearCart());
        const displayId = data?.data?.display_order_id || data?.data?._id;
        showToast("success", `Order placed! ID: ${displayId}`);
        router.replace(ORDERS_THANK_YOU_ROUTE(displayId));
      } else {
        showToast("error", data?.message || "Failed to place order");
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to place order";
      showToast("error", msg);
    } finally {
      setPlacing(false);
    }
  };

  // Submit proof THEN create order, THEN upload, THEN finish
  const submitQRProofAndPlaceOrder = async () => {
    if (!qrPendingPayload) {
      showToast("error", "Missing order details.");
      return;
    }
    if (!qrFile) {
      showToast("error", "Please attach the payment screenshot.");
      return;
    }
    try {
      setQrUploading(true);

      const { data: orderRes } = await axios.post(
        "/api/website/orders",
        qrPendingPayload,
        {
          withCredentials: true,
        }
      );
      if (!orderRes?.success || !orderRes?.data?._id) {
        showToast("error", orderRes?.message || "Failed to place order");
        return;
      }
      const orderDoc = orderRes.data;
      setCreatedOrder(orderDoc);

      const fd = new FormData();
      fd.append("file", qrFile);
      fd.append("order_id", orderDoc._id);
      fd.append("display_order_id", orderDoc.display_order_id || "");
      fd.append(
        "amount",
        String(Math.max(0, Number(orderDoc?.amounts?.total ?? 0)))
      );

      const { data: uploadRes } = await axios.post(
        "/api/website/payments/qr/upload",
        fd,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (!uploadRes?.success) {
        showToast("error", uploadRes?.message || "Upload failed");
        try {
          await axios.delete(
            `/api/website/orders/${orderDoc._id}?reason=qr_proof_failed`,
            { withCredentials: true }
          );
        } catch {}
        return;
      }

      dispatch(clearCart());
      setQrOpen(false);
      showToast("success", "Payment uploaded. We’ll verify it shortly.");
      router.replace(
        ORDERS_THANK_YOU_ROUTE(orderDoc.display_order_id || orderDoc._id)
      );
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to submit proof";
      showToast("error", msg);
    } finally {
      setQrUploading(false);
    }
  };

  // Close dialog without creating any order
  const handleQrOpenChange = (open) => {
    setQrOpen(open);
    if (!open) {
      setQrFile(null);
      setQrPendingPayload(null);
      setCreatedOrder(null);
    }
  };

  /* ====== ONLY CHANGE: measure BottomNav and offset the mobile sticky footer ====== */
  const [mobileNavHeight, setMobileNavHeight] = useState(0);
  useEffect(() => {
    // Find your bottom nav by aria-label (matches your component)
    const el = document.querySelector('nav[aria-label="Mobile Navigation"]');
    if (!el) {
      setMobileNavHeight(0);
      return;
    }
    const measure = () =>
      setMobileNavHeight(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  /* ============================================================================== */

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:pb-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Checkout</h1>
          <div className="text-sm text-slate-600 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span>
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {isCartEmpty && (
          <div className="mb-6 rounded-xl border bg-amber-50 px-4 py-3 text-amber-900 flex items-center gap-3">
            <Info className="h-4 w-4" />
            <p className="text-sm">
              Your cart is empty. Add items to proceed with checkout.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader>
              <h2 className="text-lg font-semibold">Shipping details</h2>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
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
                                pattern="\\d{10}"
                                maxLength={10}
                                {...field}
                                onChange={(e) => {
                                  const val = e.target.value
                                    .replace(/[^\d]/g, "")
                                    .slice(0, 10);
                                  field.onChange(val);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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
                              placeholder={
                                loadingLoc.city ? "Loading..." : "Select city"
                              }
                              emptyText="No cities"
                              disabled={loadingLoc.city}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              placeholder={
                                loadingLoc.zone ? "Loading..." : "Select zone"
                              }
                              emptyText="No zones"
                              disabled={
                                loadingLoc.zone || !form.getValues("city")
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              placeholder={
                                loadingLoc.area ? "Loading..." : "Select area"
                              }
                              emptyText="No areas"
                              disabled={
                                loadingLoc.area || !form.getValues("zone")
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="landmark"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landmark</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nearby landmark to help the rider"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

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
                                    field.value === "cod"
                                      ? "border-slate-900"
                                      : "border-slate-200"
                                  )}
                                >
                                  <RadioGroupItem id="pm-cod" value="cod" />
                                  <Banknote className="h-5 w-5" />
                                  <span className="text-sm font-medium">
                                    Cash on Delivery{" "}
                                    <span className="ml-1 text-xs text-slate-500">
                                      (NPR 50 fee)
                                    </span>
                                  </span>
                                </label>

                                <label
                                  htmlFor="pm-khalti"
                                  className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-xl border p-3",
                                    field.value === "khalti"
                                      ? "border-slate-900"
                                      : "border-slate-200"
                                  )}
                                >
                                  <RadioGroupItem
                                    id="pm-khalti"
                                    value="khalti"
                                  />
                                  <Wallet className="h-5 w-5" />
                                  <span className="text-sm font-medium">
                                    Khalti
                                  </span>
                                </label>

                                <label
                                  htmlFor="pm-qr"
                                  className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-xl border p-3",
                                    field.value === "qr"
                                      ? "border-slate-900"
                                      : "border-slate-200"
                                  )}
                                >
                                  <RadioGroupItem id="pm-qr" value="qr" />
                                  <QrCode className="h-5 w-5" />
                                  <span className="text-sm font-medium">
                                    QR Payment
                                  </span>
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

          <div className="lg:col-span-5 lg:sticky lg:top-4 self-start space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Order summary</h2>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div className="rounded-xl bg-white/60 p-3">
                  <ul className="divide-y max-h-72 overflow-auto">
                    {items.map((it) => {
                      const key = `${it.productId}|${it.variant?.id || ""}`;
                      const title = it.variant
                        ? `${it.name} — ${it.variant.name}`
                        : it.name;
                      const lineTotal =
                        (it.isFreeItem ? 0 : Number(it.price) || 0) *
                        (Number(it.qty) || 0);
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
                              {it.qty} ×{" "}
                              {formatNpr(it.isFreeItem ? 0 : it.price)}
                            </div>
                          </div>
                          <div className="text-sm font-semibold">
                            {formatNpr(lineTotal)}
                          </div>
                        </li>
                      );
                    })}

                    {couponState?.mode === "freeItem" &&
                      freeItemActive &&
                      !items.some(
                        (it) =>
                          String(it.productId) ===
                            String(couponState.freeItem.productId) &&
                          String(it.variant?.id || it.variantId) ===
                            String(couponState.freeItem.variantId)
                      ) && (
                        <li className="flex items-center gap-3 py-2 text-emerald-700">
                          <div className="h-12 w-12 shrink-0 grid place-items-center rounded-md border bg-emerald-50">
                            🎁
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-1 text-sm font-medium">
                              Free item: {couponState.freeItem.productName} —{" "}
                              {couponState.freeItem.variantName}
                            </div>
                            <div className="text-xs">
                              Qty: {couponState.freeItem.qty}
                            </div>
                          </div>
                          <div className="text-sm font-semibold">
                            {formatNpr(0)}
                          </div>
                        </li>
                      )}
                  </ul>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">{formatNpr(subtotal)}</span>
                  </div>

                  {couponState?.mode === "money" && discountApplied > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">
                        Discount{" "}
                        {couponState.code ? `(${couponState.code})` : ""}
                      </span>
                      <span className="font-medium">
                        - {formatNpr(discountApplied)}
                      </span>
                    </div>
                  )}

                  {paymentMethod === "cod" && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">
                          Delivery {ship.loading ? "(calculating…)" : ""}
                        </span>
                        <span className="font-medium">
                          {ship.loading ? "…" : formatNpr(shippingCost)}
                        </span>
                      </div>
                      {ship.error && (
                        <div className="text-xs text-red-600">{ship.error}</div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">COD fee</span>
                        <span className="font-medium">{formatNpr(50)}</span>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold">{formatNpr(total)}</span>
                  </div>
                </div>

                {/* Desktop place order button */}
                <Button
                  type="button"
                  className="mt-2 hidden w-full h-11 rounded-xl text-[14px] font-semibold sm:block"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isPlaceOrderDisabled}
                  aria-busy={
                    (paymentMethod === "cod" && ship.loading) || placing
                  }
                  title={
                    isCartEmpty
                      ? "Your cart is empty"
                      : ship.error && paymentMethod === "cod"
                      ? "Fix delivery details to continue"
                      : paymentMethod === "cod" && ship.loading
                      ? "Calculating delivery price…"
                      : undefined
                  }
                >
                  {`Place Order — ${formatNpr(total)}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile place order button — OFFSET ABOVE BOTTOM NAV */}
      <div
        className="fixed inset-x-0 z-40 border-t bg-white/90 backdrop-blur sm:hidden"
        style={{ bottom: `${mobileNavHeight}px` }}
      >
        <div className="mx-auto max-w-6xl px-4 py-3">
          <Button
            className="w-full h-11 rounded-xl text-[14px] font-semibold"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isPlaceOrderDisabled}
            aria-busy={(paymentMethod === "cod" && ship.loading) || placing}
            title={
              isCartEmpty
                ? "Your cart is empty"
                : ship.error && paymentMethod === "cod"
                ? "Fix delivery details to continue"
                : paymentMethod === "cod" && ship.loading
                ? "Calculating delivery price…"
                : undefined
            }
          >
            {`Place Order — ${formatNpr(total)}`}
          </Button>
          <div className="pt-[env(safe-area-inset-bottom)]" />
        </div>
      </div>

      {/* QR Payment Dialog (opens BEFORE order is created) */}
      <Dialog open={qrOpen} onOpenChange={handleQrOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Scan &amp; Pay</DialogTitle>
            <DialogDescription>
              Complete the payment by scanning the QR below. Your order will be
              created after you submit the screenshot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* QR display */}
            <div className="rounded-xl border bg-white p-3 grid place-items-center">
              {qrConfig?.image?.url || qrConfig?.image?.path ? (
                <Image
                  src={qrConfig?.image?.url || qrConfig?.image?.path}
                  alt={qrConfig?.displayName || "QR"}
                  width={260}
                  height={260}
                  className="rounded-md object-contain"
                />
              ) : (
                <Image
                  src="/api/website/payments/qr/config/image"
                  alt={qrConfig?.displayName || "QR"}
                  width={260}
                  height={260}
                  className="rounded-md object-contain"
                />
              )}
              {qrConfig?.displayName && (
                <div className="mt-2 text-sm text-slate-600">
                  Pay to:{" "}
                  <span className="font-medium">{qrConfig.displayName}</span>
                </div>
              )}
            </div>

            {/* Upload proof */}
            <div className="space-y-2">
              <Label htmlFor="qr-proof">Upload payment screenshot</Label>
              <Input
                id="qr-proof"
                type="file"
                accept="image/*"
                onChange={(e) => setQrFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-slate-500">
                We’ll verify and move your order to processing.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm">
              <span className="text-slate-500 mr-1">Total:</span>
              <span className="font-semibold">
                {formatNpr(payableFromPayload(qrPendingPayload))}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => handleQrOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={submitQRProofAndPlaceOrder}
                disabled={qrUploading || !qrFile}
              >
                {qrUploading ? "Uploading…" : "Submit Proof & Place Order"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
