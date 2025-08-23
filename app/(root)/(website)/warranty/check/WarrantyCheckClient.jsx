// app/warranty/check/page.jsx
"use client";

import React, { useMemo, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* icons */
import {
  AlertCircle,
  CalendarDays,
  Hash,
  PackageOpen,
  Phone,
  Search,
} from "lucide-react";

/* helpers */
const PRIMARY = "#fcba17";
const digits10 = (s) => (String(s || "").match(/\d+/g) || []).join("").slice(-10);
const cn = (...a) => a.filter(Boolean).join(" ");
const niceDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

/* ---- animations ---- */
const container = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut", staggerChildren: 0.06 },
  },
};
const item = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};
const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};
const tap = { scale: 0.98 };
const hoverLift = { y: -2 };

/* flat progress bar (no table, no glow) */
function RemainingBar({ months = 0, daysLeft = 0 }) {
  const totalDays = Math.max(0, Number(months || 0) * 30);
  const left = Math.max(0, Number(daysLeft || 0));
  const pctRemain =
    totalDays > 0 ? Math.max(0, Math.min(100, Math.round((left / totalDays) * 100))) : 0;
  const expired = left <= 0;

  return (
    <div className="mt-2">
      <div className="h-1.5 w-full rounded bg-muted">
        <div
          className="h-1.5 rounded transition-all"
          style={{
            width: `${pctRemain}%`,
            backgroundColor: expired ? "#dc2626" : PRIMARY,
          }}
        />
      </div>
    </div>
  );
}

/* a compact “chip” with icon and border in primary */
function Chip({ icon: Icon, children }) {
  return (
    <motion.span
      variants={item}
      className="inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs"
      style={{ borderColor: PRIMARY }}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </motion.span>
  );
}

/* one warranty item row as a compact card */
function ItemRow({ it }) {
  const days = Number(it.daysLeft ?? 0);
  const expired = days <= 0;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-lg border p-3 md:p-4 hover:bg-muted/30 transition-colors"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        {/* Left: product & variant */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {it.productName}
            {it.variantName ? ` (${it.variantName})` : ""}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              Warranty: {Number(it.warrantyMonths) > 0 ? `${it.warrantyMonths} months` : "—"}
            </span>
            <Separator orientation="vertical" className="h-3 hidden md:block" />
            <span className="truncate">Serial: {it.serialMasked || "—"}</span>
          </div>
        </div>

        {/* Right: days left pill */}
        <div
          className={cn(
            "self-start md:self-center rounded px-2 py-0.5 text-xs",
            expired ? "bg-red-600 text-white" : "text-black"
          )}
          style={!expired ? { backgroundColor: `${PRIMARY}26` } : undefined}
        >
          {expired ? "Expired" : `${days} day${days === 1 ? "" : "s"} left`}
        </div>
      </div>

      {/* flat progress bar */}
      <RemainingBar months={it.warrantyMonths} daysLeft={days} />
    </motion.li>
  );
}

export default function WarrantyLookupPage() {
  const [phone, setPhone] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // API meta + registrations
  const [meta, setMeta] = useState({
    phone: "",
    totalRegistrations: 0,
    totalItems: 0,
  });
  const [registrations, setRegistrations] = useState([]);

  const validPhone = useMemo(() => digits10(phone).length === 10, [phone]);

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    setError("");
    setRegistrations([]);
    setMeta({ phone: "", totalRegistrations: 0, totalItems: 0 });

    if (!validPhone) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.get("/api/website/warranty-lookup", {
        params: { phone: digits10(phone), hint: hint || "" },
      });

      if (data?.success) {
        const payload = data?.data || {};
        const regs = Array.isArray(payload.registrations) ? payload.registrations : [];
        const totalItems =
          typeof payload.totalItems === "number"
            ? payload.totalItems
            : regs.reduce(
                (n, r) => n + (r.itemsCount ?? (Array.isArray(r.items) ? r.items.length : 0)),
                0
              );

        setMeta({
          phone: payload.phone || digits10(phone),
          totalRegistrations: Number(payload.totalRegistrations || regs.length),
          totalItems,
        });
        setRegistrations(regs);
        if (!regs.length) setError("No warranty records found for this phone.");
      } else {
        setError(data?.message || "Failed to fetch warranty records.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8"
    >
      {/* Heading */}
      <motion.div variants={item}>
        <h1 className="text-xl sm:text-2xl font-semibold">Warranty Lookup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your phone number. Optionally add your Order ID or the last 4 digits of your serial
          to narrow results.
        </p>
      </motion.div>

      {/* Search */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2">
            <div className="font-semibold">Find Warranty</div>
          </CardHeader>
          <CardContent>
            <motion.form
              onSubmit={onSubmit}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3"
            >
              <div className="sm:col-span-5 space-y-1">
                <Label>Phone (required)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    inputMode="numeric"
                    maxLength={14}
                  />
                </div>
              </div>
              <div className="sm:col-span-5 space-y-1">
                <Label>Order ID or Last 4 of Serial (optional)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="e.g., KICK-001234 or 1234"
                  />
                </div>
              </div>
              <div className="sm:col-span-2 flex items-end">
                <motion.div className="w-full" whileTap={tap}>
                  <Button
                    type="submit"
                    className="w-full"
                    style={{ backgroundColor: PRIMARY, color: "#111", borderColor: PRIMARY }}
                    disabled={loading || !validPhone}
                  >
                    {loading ? "Checking…" : "Check"}
                  </Button>
                </motion.div>
              </div>
            </motion.form>

            <AnimatePresence>
              {error ? (
                <motion.div
                  variants={fade}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="mt-4 flex items-center gap-2 text-red-600 text-sm"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Meta chips (flat) */}
            {!error && (meta.totalRegistrations > 0 || meta.totalItems > 0) ? (
              <motion.div
                variants={container}
                initial="hidden"
                animate="visible"
                className="mt-4 flex flex-wrap items-center gap-2 text-sm"
              >
                <Chip icon={Phone}>{meta.phone}</Chip>
                <Chip icon={PackageOpen}>
                  {meta.totalRegistrations} registration{meta.totalRegistrations === 1 ? "" : "s"}
                </Chip>
                <Chip icon={PackageOpen}>
                  {meta.totalItems} item{meta.totalItems === 1 ? "" : "s"}
                </Chip>
              </motion.div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>

      {/* Results (no tables; stacked, compact item cards) */}
      <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
        <AnimatePresence>
          {registrations.map((reg) => {
            const itemCount = reg.itemsCount ?? (Array.isArray(reg.items) ? reg.items.length : 0);
            return (
              <motion.div
                key={reg.registrationId}
                variants={item}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                whileHover={hoverLift}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Display order id chip */}
                      {reg.displayOrderId ? <Chip icon={Hash}>{reg.displayOrderId}</Chip> : null}

                      <Badge
                        variant="secondary"
                        className="uppercase tracking-wide text-black"
                        style={{ backgroundColor: `${PRIMARY}33`, borderColor: `${PRIMARY}55` }}
                      >
                        {reg.channel || ""}
                      </Badge>

                      {reg.shopName ? <Badge variant="outline">{reg.shopName}</Badge> : null}

                      <div className="text-sm text-muted-foreground ml-auto flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        {niceDate(reg.createdAt)}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="font-medium">
                        {reg.customer?.name || "Customer"}
                        {reg.customer?.phone ? ` (${reg.customer.phone})` : ""}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {itemCount} item{itemCount === 1 ? "" : "s"}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {Array.isArray(reg.items) && reg.items.length ? (
                      <AnimatePresence initial={false}>
                        <ul className="space-y-2">
                          {reg.items.map((it, idx) => (
                            <ItemRow key={`${reg.registrationId}-${idx}`} it={it} />
                          ))}
                        </ul>
                      </AnimatePresence>
                    ) : (
                      <div className="text-sm text-muted-foreground">No items found.</div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        <AnimatePresence>
          {!loading && !error && registrations.length === 0 && meta.totalItems === 0 ? (
            <motion.div
              variants={fade}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="rounded-md border p-8 text-center"
            >
              <div
                className="mx-auto mb-2 h-8 w-8 rounded-full"
                style={{ backgroundColor: `${PRIMARY}22` }}
              />
              <h3 className="text-sm font-medium">No results yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your phone number above to see your warranty details.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
