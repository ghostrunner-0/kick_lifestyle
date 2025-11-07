// app/account/page.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

/* icons */
import {
  ArrowRight,
  LogOut,
  User as UserIcon,
  Phone,
  Mail,
  Wrench,
  Package,
  ShieldCheck,
  Building2,
  MapPin,
  CalendarDays,
  Hash,
  Pencil,
  ChevronsUpDown,
  Check,
  Menu,
  LayoutDashboard,
} from "lucide-react";

/* helpers */
const PRIMARY = "#fcba17";
const digits10 = (s) =>
  (String(s || "").match(/\d+/g) || []).join("").slice(-10);
const niceDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
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

function Chip({ icon: Icon, children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs"
      style={{ borderColor: PRIMARY }}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

function SmallSkeleton({ className = "" }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-semibold">{title}</h3>
      {sub ? <p className="text-sm text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/* ------------- Small reusable Combobox ------------- */
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

/* =========================== Edit Address Dialog (fixed) =========================== */
function EditAddressDialog({ open, onOpenChange, initialUser, onSaved }) {
  const [saving, setSaving] = useState(false);

  // controlled selects
  const [city, setCity] = useState("");
  const [zone, setZone] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");

  // show saved labels instantly (even if options not loaded yet)
  const [savedLabels, setSavedLabels] = useState({
    city: "",
    zone: "",
    area: "",
  });

  // option lists
  const [cityOptions, setCityOptions] = useState([]);
  const [zoneOptions, setZoneOptions] = useState([]);
  const [areaOptions, setAreaOptions] = useState([]);

  // spinners
  const [loadingLoc, setLoadingLoc] = useState({
    city: false,
    zone: false,
    area: false,
  });

  // helpers to find current labels from options (fallback to savedLabels)
  const pickLabel = (opts, value, fallback = "") =>
    opts.find((o) => String(o.value) === String(value))?.label ||
    fallback ||
    "";

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
    if (!cityId) {
      setZoneOptions([]);
      return;
    }
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
    if (!zoneId) {
      setAreaOptions([]);
      return;
    }
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

  // When dialog opens, hydrate from initialUser and preload cascading options so selections render properly
  useEffect(() => {
    let cancelled = false;
    if (!open) return;

    const u = initialUser || {};
    const initCityId = u.pathaoCityId ? String(u.pathaoCityId) : "";
    const initZoneId = u.pathaoZoneId ? String(u.pathaoZoneId) : "";
    const initAreaId = u.pathaoAreaId ? String(u.pathaoAreaId) : "";
    const initAddr = u.address || "";

    setSavedLabels({
      city: u.pathaoCityLabel || "",
      zone: u.pathaoZoneLabel || "",
      area: u.pathaoAreaLabel || "",
    });
    setCity(initCityId);
    setZone(initZoneId);
    setArea(initAreaId);
    setLandmark(initAddr);

    // sequential preload so dropdowns contain the saved selections
    (async () => {
      await fetchCities();
      if (cancelled) return;

      if (initCityId) {
        await fetchZones(initCityId);
        if (cancelled) return;
      } else {
        setZone("");
        setArea("");
        setZoneOptions([]);
        setAreaOptions([]);
        return;
      }

      if (initZoneId) {
        await fetchAreas(initZoneId);
        if (cancelled) return;
      } else {
        setArea("");
        setAreaOptions([]);
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, initialUser, fetchCities, fetchZones, fetchAreas]);

  // when city changes by user, clear lower levels and fetch zones
  useEffect(() => {
    if (!open) return;
    if (!city) {
      setZone("");
      setArea("");
      setZoneOptions([]);
      setAreaOptions([]);
      return;
    }
    setZone("");
    setArea("");
    setAreaOptions([]);
    fetchZones(city);
  }, [city, open, fetchZones]);

  // when zone changes by user, clear area and fetch areas
  useEffect(() => {
    if (!open) return;
    if (!zone) {
      setArea("");
      setAreaOptions([]);
      return;
    }
    setArea("");
    fetchAreas(zone);
  }, [zone, open, fetchAreas]);

  const onSave = async () => {
    if (!city || !zone || !area || !landmark.trim()) return;
    setSaving(true);
    try {
      // derive labels from options (fallback to savedLabels so we always send something sensible)
      const cityLabel = pickLabel(cityOptions, city, savedLabels.city);
      const zoneLabel = pickLabel(zoneOptions, zone, savedLabels.zone);
      const areaLabel = pickLabel(areaOptions, area, savedLabels.area);

      await axios.put("/api/account/address", {
        cityId: city,
        zoneId: zone,
        areaId: area,
        cityLabel,
        zoneLabel,
        areaLabel,
        landmark: landmark.trim(),
      });

      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      console.error(e?.response?.data || e?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Edit default address</DialogTitle>
          <DialogDescription>
            Update your saved delivery address. This will be used for faster
            checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">City</Label>
            <ComboBox
              value={city}
              valueLabel={pickLabel(cityOptions, city, savedLabels.city)}
              onChange={setCity}
              options={cityOptions}
              placeholder={loadingLoc.city ? "Loading..." : "Select city"}
              emptyText="No cities"
              disabled={loadingLoc.city}
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Zone</Label>
            <ComboBox
              value={zone}
              valueLabel={pickLabel(zoneOptions, zone, savedLabels.zone)}
              onChange={setZone}
              options={zoneOptions}
              placeholder={
                loadingLoc.zone
                  ? "Loading..."
                  : city
                  ? "Select zone"
                  : "Select city first"
              }
              emptyText={city ? "No zones" : "Select city first"}
              disabled={loadingLoc.zone || !city}
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Area</Label>
            <ComboBox
              value={area}
              valueLabel={pickLabel(areaOptions, area, savedLabels.area)}
              onChange={setArea}
              options={areaOptions}
              placeholder={
                loadingLoc.area
                  ? "Loading..."
                  : zone
                  ? "Select area"
                  : "Select zone first"
              }
              emptyText={zone ? "No areas" : "Select zone first"}
              disabled={loadingLoc.area || !zone}
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Landmark</Label>
            <Input
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Nearby landmark to help the rider"
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || !city || !zone || !area || !landmark.trim()}
            style={{ backgroundColor: PRIMARY, color: "#111" }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================ Page ================================ */

const NAV = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "orders", label: "Orders", icon: Package },
  { value: "warranty", label: "Warranties", icon: ShieldCheck },
  { value: "service", label: "Service Requests", icon: Wrench },
  { value: "addresses", label: "Addresses", icon: MapPin },
];

export default function AccountPage() {
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [navOpen, setNavOpen] = useState(false);

  // Orders
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Warranties
  const [warrantyMeta, setWarrantyMeta] = useState({
    totalItems: 0,
    totalRegistrations: 0,
  });
  const [registrations, setRegistrations] = useState([]);
  const [warrantyLoading, setWarrantyLoading] = useState(false);

  // Service
  const [serviceReqs, setServiceReqs] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // NEW: Khalti pay-now button state
  const [khaltiLoadingId, setKhaltiLoadingId] = useState(null);

  // auth + guard
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get("/api/auth/me");
        if (!mounted) return;
        if (data?.success && data?.data) {
          const me = data.data;
          if (me.isAdmin) {
            router.replace("/admin/dashboard");
            return;
          }
          setUser(me);
        } else {
          router.replace("/auth/login");
          return;
        }
      } catch {
        router.replace("/auth/login");
        return;
      } finally {
        if (mounted) setLoadingUser(false);
      }
    })();
    return () => (mounted = false);
  }, [router]);

  const reloadAddresses = useCallback(async () => {
    setAddrLoading(true);
    try {
      const { data } = await axios.get("/api/website/account/addresses");
      const list = Array.isArray(data?.data) ? data.data : [];
      setAddresses(list);
    } catch {
      setAddresses([]);
    } finally {
      setAddrLoading(false);
    }
  }, []);

  // data fetch
  useEffect(() => {
    if (!user) return;

    // Orders
    (async () => {
      setOrdersLoading(true);
      try {
        const { data } = await axios.get("/api/website/account/orders", {
          params: { limit: 10, page: 1 },
        });
        const payload = data?.data || {};
        setOrders(Array.isArray(payload.items) ? payload.items : []);
        setOrdersTotal(Number(payload.total || 0));
      } catch {
        setOrders([]);
        setOrdersTotal(0);
      } finally {
        setOrdersLoading(false);
      }
    })();

    // Service Requests
    (async () => {
      setServiceLoading(true);
      try {
        const { data } = await axios.get("/api/account/service-requests", {
          params: { limit: 10 },
        });
        const list = Array.isArray(data?.data) ? data.data : [];
        setServiceReqs(list);
      } catch {
        setServiceReqs([]);
      } finally {
        setServiceLoading(false);
      }
    })();

    // Addresses
    reloadAddresses();

    // Warranties (by phone)
    (async () => {
      setWarrantyLoading(true);
      try {
        const phone = digits10(user?.phone || "");
        if (!phone) {
          setWarrantyMeta({ totalItems: 0, totalRegistrations: 0 });
          setRegistrations([]);
          return;
        }
        const { data } = await axios.get("/api/website/warranty-lookup", {
          params: { phone },
        });
        const payload = data?.data || {};
        const regs = Array.isArray(payload.registrations)
          ? payload.registrations
          : [];
        setWarrantyMeta({
          totalItems: Number(payload.totalItems || 0),
          totalRegistrations: Number(
            payload.totalRegistrations || regs.length || 0
          ),
        });
        setRegistrations(regs);
      } catch {
        setWarrantyMeta({ totalItems: 0, totalRegistrations: 0 });
        setRegistrations([]);
      } finally {
        setWarrantyLoading(false);
      }
    })();
  }, [user, reloadAddresses]);

  const initials = useMemo(() => {
    const n = user?.name || "";
    theParts: {
      const parts = n.split(" ").filter(Boolean);
      if (parts.length === 0) return "U";
      if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
  }, [user]);

  const currentNav = useMemo(
    () => NAV.find((n) => n.value === activeTab)?.label || "Overview",
    [activeTab]
  );

  const goTab = (val) => {
    setActiveTab(val);
    setNavOpen(false);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  // NEW: detect if an order is Khalti & pending payment
  const isKhaltiPending = (o) => {
    const pm = String(
      o?.paymentMethod || o?.payment?.provider || ""
    ).toLowerCase();
    const st = String(o?.status || "").toLowerCase();
    const paid = String(o?.payment?.status || "").toLowerCase();
    return pm === "khalti" && (st === "pending payment" || paid === "unpaid");
  };

  // NEW: initiate Khalti and redirect to payment_url
  const initiateKhalti = async (o) => {
    if (!o?.displayOrderId && !o?._id && !o?.id) return;
    try {
      setKhaltiLoadingId(String(o._id || o.id || o.displayOrderId));
      const res = await fetch("/api/website/payments/khalti/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          o.displayOrderId
            ? { display_order_id: o.displayOrderId }
            : { order_id: o._id || o.id }
        ),
      });
      const json = await res.json();
      if (!json?.success || !json?.payment_url) {
        throw new Error(json?.message || "Failed to initiate payment");
      }
      // redirect to Khalti hosted page
      window.location.href = json.payment_url;
    } catch (e) {
      alert(e?.message || "Could not initiate Khalti payment");
    } finally {
      setKhaltiLoadingId(null);
    }
  };

  if (loadingUser) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
        <SmallSkeleton className="h-10 w-48" />
        <SmallSkeleton className="h-28 w-full" />
        <SmallSkeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col sm:flex-row sm:items-center gap-4"
      >
        <div className="flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-full grid place-items-center text-lg font-semibold"
            style={{ backgroundColor: `${PRIMARY}1A`, color: "#111" }}
            title={user.name}
          >
            {initials}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold truncate">
              {user.name || "My Account"}
            </h1>
            {user.role ? (
              <Badge
                variant="secondary"
                className="uppercase tracking-wide text-black"
                style={{
                  backgroundColor: `${PRIMARY}33`,
                  borderColor: `${PRIMARY}55`,
                }}
              >
                {user.role}
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {user.email ? (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-4 w-4" /> {user.email}
              </span>
            ) : null}
            {user.phone ? (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-4 w-4" /> {user.phone}
              </span>
            ) : null}
          </div>
        </div>

        <div className="sm:ml-auto flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/account/profile">
              <UserIcon className="h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="gap-2"
            style={{ backgroundColor: PRIMARY, color: "#111" }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </motion.header>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <Button asChild variant="outline" className="justify-between">
          <Link
            href="/warranty/offline-register"
            className="w-full flex items-center justify-between"
          >
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Register warranty
            </span>
            <ArrowRight className="h-4 w-4 opacity-70" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link
            href={`/warranty/check${
              user.phone ? `?phone=${digits10(user.phone)}` : ""
            }`}
            className="w-full flex items-center justify-between"
          >
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Check warranty
            </span>
            <ArrowRight className="h-4 w-4 opacity-70" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link
            href="/support"
            className="w-full flex items-center justify-between"
          >
            <span className="inline-flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Support
            </span>
            <ArrowRight className="h-4 w-4 opacity-70" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link
            href="/corporate-orders"
            className="w-full flex items-center justify-between"
          >
            <span className="inline-flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Corporate orders
            </span>
            <ArrowRight className="h-4 w-4 opacity-70" />
          </Link>
        </Button>
      </motion.div>

      {/* Mobile: sidebar trigger */}
      <div className="sm:hidden">
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Section:{" "}
              <span className="font-medium text-foreground">{currentNav}</span>
            </div>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Menu className="h-4 w-4" />
                Account menu
              </Button>
            </SheetTrigger>
          </div>

          <SheetContent side="left" className="w-[84%] sm:w-[360px]">
            <SheetHeader>
              <SheetTitle>My Account</SheetTitle>
            </SheetHeader>

            <nav className="mt-4">
              <ul className="space-y-1.5">
                {NAV.map(({ value, label, icon: Icon }, idx) => (
                  <motion.li
                    key={value}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: 0.02 * idx }}
                  >
                    <SheetClose asChild>
                      <button
                        onClick={() => {
                          setActiveTab(value);
                          setNavOpen(false);
                          try {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          } catch {}
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left",
                          value === activeTab ? "bg-muted" : "hover:bg-muted/60"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    </SheetClose>
                  </motion.li>
                ))}
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Desktop tabs */}
        <TabsList className="hidden sm:inline-flex">
          {NAV.map((n) => (
            <TabsTrigger key={n.value} value={n.value}>
              <div className="flex items-center gap-2">
                <n.icon className="h-4 w-4" />
                <span>{n.label}</span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Orders" sub="Recent purchases" />
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <SmallSkeleton className="h-6 w-24" />
                ) : (
                  <div className="text-2xl font-semibold">{ordersTotal}</div>
                )}
                <div className="mt-3">
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => {
                      setActiveTab("orders");
                      try {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } catch {}
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      View all orders
                    </span>
                    <ArrowRight className="h-4 w-4 opacity-70" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Warranties" sub="Registered items" />
              </CardHeader>
              <CardContent>
                {warrantyLoading ? (
                  <SmallSkeleton className="h-6 w-36" />
                ) : (
                  <div className="text-2xl font-semibold">
                    {warrantyMeta.totalItems} item
                    {warrantyMeta.totalItems === 1 ? "" : "s"}
                  </div>
                )}
                <div className="mt-3">
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => {
                      setActiveTab("warranty");
                      try {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } catch {}
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Check warranty
                    </span>
                    <ArrowRight className="h-4 w-4 opacity-70" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Service" sub="Repair & support tickets" />
              </CardHeader>
              <CardContent>
                {serviceLoading ? (
                  <SmallSkeleton className="h-6 w-16" />
                ) : (
                  <div className="text-2xl font-semibold">
                    {serviceReqs.length}
                  </div>
                )}
                <div className="mt-3">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <Link href="/support">
                      <span className="inline-flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Get support
                      </span>
                      <ArrowRight className="h-4 w-4 opacity-70" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader title="Your Orders" sub="Latest 10 shown here" />
            </CardHeader>
            <CardContent>
              <AnimatePresence initial={false}>
                {ordersLoading ? (
                  <div className="space-y-3">
                    <SmallSkeleton className="h-16 w-full" />
                    <SmallSkeleton className="h-16 w-full" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No orders yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((o) => {
                      const viewHref = o?.displayOrderId
                        ? `/view-order/${encodeURIComponent(o.displayOrderId)}`
                        : undefined;

                      return (
                        <motion.div
                          key={o._id || o.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="rounded border p-3 hover:bg-muted/30 transition-colors"
                        >
                          {/* Top row: ID + status + date */}
                          <div className="flex flex-wrap items-center gap-2">
                            {o.displayOrderId ? (
                              <Link
                                href={viewHref}
                                className="hover:opacity-90"
                                title="View order"
                              >
                                <Chip icon={Hash}>{o.displayOrderId}</Chip>
                              </Link>
                            ) : null}
                            <Badge
                              variant="outline"
                              className="capitalize"
                              title="Status"
                            >
                              {o.status || "—"}
                            </Badge>

                            {/* Optional tiny hint when pending */}
                            {isKhaltiPending(o) ? (
                              <span className="text-xs text-muted-foreground">
                                • Payment pending
                              </span>
                            ) : null}

                            <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5 ml-auto">
                              <CalendarDays className="h-4 w-4" />
                              {niceDate(o.createdAt)}
                            </div>
                          </div>

                          {/* Second row: summary + count + total + actions */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium">
                              {o.summary || `${o.itemsCount || 0} item(s)`}
                            </span>
                            <Separator
                              orientation="vertical"
                              className="h-4 hidden sm:block"
                            />
                            <span className="text-muted-foreground">
                              {o.itemsCount} item{o.itemsCount === 1 ? "" : "s"}
                            </span>

                            <div className="ml-auto flex items-center gap-2">
                              <span className="font-semibold">
                                {formatNpr(o.total)} {o.currency || ""}
                              </span>

                              {isKhaltiPending(o) ? (
                                <Button
                                  size="sm"
                                  className="h-8"
                                  style={{
                                    backgroundColor: PRIMARY,
                                    color: "#111",
                                  }}
                                  onClick={() => initiateKhalti(o)}
                                  disabled={
                                    khaltiLoadingId ===
                                    String(o._id || o.id || o.displayOrderId)
                                  }
                                  title="Pay now with Khalti"
                                >
                                  {khaltiLoadingId ===
                                  String(o._id || o.id || o.displayOrderId)
                                    ? "Opening Khalti…"
                                    : "Pay with Khalti"}
                                </Button>
                              ) : null}

                              {viewHref ? (
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                >
                                  <Link href={viewHref}>View details</Link>
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warranties */}
        <TabsContent value="warranty" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader
                title="Registered Warranties"
                sub="Linked to your phone number"
              />
            </CardHeader>
            <CardContent>
              {warrantyLoading ? (
                <div className="space-y-3">
                  <SmallSkeleton className="h-16 w-full" />
                  <SmallSkeleton className="h-16 w-full" />
                </div>
              ) : registrations.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No warranty records found.{" "}
                  <Link
                    className="underline"
                    href={`/warranty/check${
                      user.phone ? `?phone=${digits10(user.phone)}` : ""
                    }`}
                  >
                    Check here
                  </Link>
                  .
                </div>
              ) : (
                <div className="space-y-4">
                  {registrations.map((reg) => (
                    <div
                      key={reg.registrationId}
                      className="rounded border p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {reg.displayOrderId ? (
                          <Chip icon={Hash}>{reg.displayOrderId}</Chip>
                        ) : null}
                        <Badge
                          variant="secondary"
                          className="uppercase tracking-wide text-black"
                          style={{
                            backgroundColor: `${PRIMARY}33`,
                            borderColor: `${PRIMARY}55`,
                          }}
                        >
                          {reg.channel}
                        </Badge>
                        {reg.shopName ? (
                          <Badge variant="outline">{reg.shopName}</Badge>
                        ) : null}
                        <div className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          {niceDate(reg.createdAt)}
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-muted-foreground">
                        {reg.customer?.name || "Customer"} • {reg.itemsCount}{" "}
                        item{reg.itemsCount === 1 ? "" : "s"}
                      </div>

                      <Separator className="my-3" />

                      <ul className="space-y-2">
                        {reg.items?.map((it, idx) => (
                          <li
                            key={idx}
                            className="rounded-md border p-3 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-medium">
                                {it.productName}
                                {it.variantName ? ` (${it.variantName})` : ""}
                              </div>
                              <div className="ml-auto text-xs">
                                {it.daysLeft > 0 ? (
                                  <span
                                    className="rounded px-2 py-0.5"
                                    style={{ backgroundColor: `${PRIMARY}26` }}
                                  >
                                    {it.daysLeft} day
                                    {it.daysLeft === 1 ? "" : "s"} left
                                  </span>
                                ) : (
                                  <span className="rounded px-2 py-0.5 bg-red-600 text-white">
                                    Expired
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Serial: {it.serialMasked || "—"} • Warranty:{" "}
                              {typeof it.warrantyMonths === "number"
                                ? `${it.warrantyMonths} months`
                                : "—"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Requests */}
        <TabsContent value="service" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader
                title="Service Requests"
                sub="Your repair/support tickets"
              />
            </CardHeader>
            <CardContent>
              {serviceLoading ? (
                <div className="space-y-3">
                  <SmallSkeleton className="h-16 w-full" />
                  <SmallSkeleton className="h-16 w-full" />
                </div>
              ) : serviceReqs.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No service requests yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceReqs.map((s) => (
                    <div
                      key={s._id || s.id}
                      className="rounded border p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip icon={Wrench}>
                          {s.type || s.source || "Request"}
                        </Chip>
                        <div className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          {niceDate(s.createdAt)}
                        </div>
                      </div>
                      <div className="mt-1 text-sm">
                        {s.summary || s.status || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Addresses */}
        <TabsContent value="addresses" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <SectionHeader
                  title="Saved Addresses"
                  sub="Shipping & billing"
                />
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit default address
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {addrLoading ? (
                <div className="space-y-3">
                  <SmallSkeleton className="h-20 w-full" />
                  <SmallSkeleton className="h-20 w-full" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No saved addresses.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {addresses.map((a) => {
                    const parts = [
                      a.line1 || "",
                      a.line2 || "",
                      a.city || "",
                      a.state || "",
                      a.zip || "",
                    ].filter(Boolean);
                    const composed = parts.join(", ");

                    return (
                      <div
                        key={a._id || a.id || a.label}
                        className="rounded border p-3"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <MapPin className="h-4 w-4" />
                          {a.label || "Address"}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {composed || "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit address dialog */}
      <EditAddressDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initialUser={user}
        onSaved={reloadAddresses}
      />
    </div>
  );
}
