// app/view-order/[displayId]/orderdetails.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* icons */
import {
  ArrowLeft,
  CalendarDays,
  Hash,
  Truck,
  Receipt,
  Package,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  Wallet,
} from "lucide-react";

const PRIMARY = "#fcba17";
const cn = (...a) => a.filter(Boolean).join(" ");
const niceDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
const niceDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
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
const buildPathaoTrackUrl = (consignmentId, phone) => {
  if (!consignmentId || !phone) return null;
  const qs = new URLSearchParams({
    consignment_id: consignmentId,
    phone: String(phone),
  });
  return `https://parcel.pathao.com/tracking?${qs.toString()}`;
};
const SmallSkeleton = ({ className = "" }) => (
  <div className={cn("animate-pulse rounded-md bg-muted", className)} />
);

export default function OrderDetails({ displayId, initialOrder = null }) {
  const router = useRouter();
  const params = useParams();

  const effectiveId =
    displayId ||
    (typeof params?.displayId === "string" ? params.displayId : undefined) ||
    (typeof params?.id === "string" ? params.id : undefined) ||
    "";

  const [loading, setLoading] = useState(!initialOrder);
  const [order, setOrder] = useState(initialOrder);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [launchingPay, setLaunchingPay] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!effectiveId) {
      setError("Invalid order URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `/api/website/orders/${encodeURIComponent(effectiveId)}`
      );
      const o = res?.data?.data || null;
      if (!o) throw new Error("Order not found");
      setOrder(o);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        router.replace("/auth/login");
        return;
      }
      setError(
        e?.response?.data?.message || e?.message || "Failed to load order."
      );
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [effectiveId, router]);

  useEffect(() => {
    if (!initialOrder) fetchOrder();
  }, [initialOrder, fetchOrder]);

  const totals = useMemo(() => {
    const t = order?.amounts || {};
    const sub = Number(t.subtotal ?? 0);
    const ship = Number(t.shippingCost ?? 0);
    const disc = Number(t.discount ?? 0);
    const tax = Number(t.tax ?? 0);
    const grand = Number(t.total ?? sub + ship + tax - Math.abs(disc));
    return { sub, ship, disc, tax, grand };
  }, [order]);

  // Address (using your schema shape)
  const address = useMemo(() => {
    const a = order?.address || {};
    return {
      name:
        order?.customer?.fullName ||
        order?.customer?.name ||
        order?.user?.name ||
        "",
      landmark: a.landmark || "",
      city: a.cityLabel || "",
      zone: a.zoneLabel || "",
      area: a.areaLabel || "",
      phone: order?.customer?.phone || "",
      email: order?.user?.email || "",
    };
  }, [order]);

  const items = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),
    [order]
  );

  // Shipping / tracking
  const tracking = useMemo(() => {
    if (order?.tracking) return order.tracking;
    const carrier =
      order?.shipping?.carrier || order?.metadata?.carrier || "pathao";
    const number = order?.shipping?.trackingId || null;
    const phone =
      order?.customer?.phone || order?.address?.phone || order?.user?.phone;
    const url = buildPathaoTrackUrl(number, phone);
    return number && phone ? { carrier, number, url } : null;
  }, [order]);

  // --- KHALTI ---
  const paymentMethod = order?.paymentMethod || "";
  const paymentStatus =
    order?.payment?.status || order?.paymentStatus || "unpaid";
  const storedKhaltiUrl =
    order?.khaltiPayment?.payment_url ||
    order?.metadata?.khalti?.payment_url ||
    null;
  const khaltiPidx =
    order?.khaltiPayment?.pidx || order?.metadata?.khalti?.pidx || null;

  const isKhaltiUnpaid =
    paymentMethod === "khalti" &&
    String(paymentStatus).toLowerCase() !== "paid";

  // ✅ NEW: Initiate Khalti using only the existing order's display id
  const openOrInitiateKhalti = async () => {
    try {
      setLaunchingPay(true);

      // if we already have a saved payment_url on the order, just open it
      if (storedKhaltiUrl) {
        window.location.href = storedKhaltiUrl;
        return;
      }

      const displayOrderId =
        order?.display_order_id || order?.displayOrderId || effectiveId;

      if (!displayOrderId) {
        alert("Missing order id. Please reload the page.");
        return;
      }

      const { data } = await axios.post(
        "/api/website/payments/khalti/initiate",
        { display_order_id: displayOrderId },
        { withCredentials: true }
      );

      if (data?.success && data?.payment_url) {
        window.location.href = data.payment_url;
        return;
      }
      alert(data?.message || "Failed to open Khalti payment.");
    } catch (e) {
      alert(
        e?.response?.data?.message || e?.message || "Failed to open Khalti payment."
      );
    } finally {
      setLaunchingPay(false);
    }
  };

  // ✅ Include purchase_order_id when verifying (helps backend find the order)
  const handleVerify = async () => {
    if (!khaltiPidx && !order?.display_order_id && !effectiveId) return;
    try {
      setVerifying(true);
      const displayOrderId =
        order?.display_order_id || order?.displayOrderId || effectiveId;

      await axios.post("/api/website/payments/khalti/verify", {
        pidx: khaltiPidx || undefined,
        purchase_order_id: displayOrderId || undefined,
      });
      await fetchOrder();
    } catch {
      // user can retry
    } finally {
      setVerifying(false);
    }
  };

  // Animations
  const fadeUp = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25 },
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8">
      {/* Top actions */}
      <motion.div {...fadeUp} className="mb-4 flex items-center justify-between">
        <Button asChild variant="outline" className="gap-2">
          <Link href="/account">
            <ArrowLeft className="h-4 w-4" /> Back to account
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {/* KHALTI: show pay button whenever unpaid */}
          {isKhaltiUnpaid && (
            <Button
              onClick={openOrInitiateKhalti}
              className="gap-2"
              style={{ backgroundColor: PRIMARY, color: "#111" }}
              disabled={launchingPay}
              title="Complete payment with Khalti"
            >
              <Wallet className="h-4 w-4" />
              {launchingPay ? "Opening…" : "Pay with Khalti"}
            </Button>
          )}

          {/* Optional: allow refreshing the status by pidx (if present) */}
          {khaltiPidx && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleVerify}
              disabled={verifying}
              title="Check latest payment status"
            >
              {verifying ? "Verifying…" : "Refresh payment status"}
            </Button>
          )}

          {order?.invoiceUrl ? (
            <Button asChild variant="outline" className="gap-2">
              <Link href={order.invoiceUrl} target="_blank" rel="noreferrer">
                <Receipt className="h-4 w-4" /> Invoice
              </Link>
            </Button>
          ) : null}

          {tracking?.url ? (
            <Button
              asChild
              className="gap-2"
              style={{ backgroundColor: PRIMARY, color: "#111" }}
            >
              <Link href={tracking.url} target="_blank" rel="noreferrer">
                <Truck className="h-4 w-4" /> Track shipment
              </Link>
            </Button>
          ) : null}
        </div>
      </motion.div>

      {/* Card */}
      <Card>
        <CardHeader className="pb-2">
          <AnimatePresence initial={false} mode="wait">
            {loading ? (
              <motion.div
                key="hdr-skel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <SmallSkeleton className="h-6 w-48" />
                <SmallSkeleton className="h-4 w-64" />
              </motion.div>
            ) : error ? (
              <motion.div
                key="hdr-err"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-red-600"
              >
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">{error}</span>
              </motion.div>
            ) : (
              <motion.div
                key="hdr-ok"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap items-center gap-2"
              >
                {(order?.display_order_id ||
                  order?.displayOrderId ||
                  effectiveId) && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs"
                    style={{ borderColor: PRIMARY }}
                  >
                    <Hash className="h-3.5 w-3.5" />
                    {order?.display_order_id ||
                      order?.displayOrderId ||
                      effectiveId}
                  </span>
                )}
                <Badge variant="outline" className="capitalize">
                  {order?.status || "—"}
                </Badge>
                <div className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {niceDate(order?.createdAt)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Summary blocks */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Address */}
            <div className="rounded-md border p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" /> Shipping address
              </div>
              {loading ? (
                <>
                  <SmallSkeleton className="h-4 w-40 mb-2" />
                  <SmallSkeleton className="h-4 w-56 mb-1" />
                  <SmallSkeleton className="h-4 w-48 mb-1" />
                  <SmallSkeleton className="h-4 w-28" />
                </>
              ) : (
                <>
                  <div className="text-sm font-medium">
                    {address.name || "—"}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {address.landmark || "—"}
                    <br />
                    {[address.area, address.zone, address.city]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground flex flex-col gap-1">
                    {address.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {address.phone}
                      </span>
                    )}
                    {address.email && (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {address.email}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Meta */}
            <div className="rounded-md border p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4" /> Order details
              </div>
              {loading ? (
                <>
                  <SmallSkeleton className="h-4 w-32 mb-1" />
                  <SmallSkeleton className="h-4 w-40 mb-1" />
                  <SmallSkeleton className="h-4 w-28" />
                </>
              ) : (
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">Placed on: </span>
                    {niceDateTime(order?.createdAt)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment: </span>
                    {paymentMethod || "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Payment status:{" "}
                    </span>
                    {paymentStatus || "—"}
                  </div>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="rounded-md border p-3">
              <div className="mb-2 text-sm font-medium">Summary</div>
              {loading ? (
                <>
                  <SmallSkeleton className="h-4 w-24 mb-1" />
                  <SmallSkeleton className="h-4 w-24 mb-1" />
                  <SmallSkeleton className="h-4 w-24 mb-1" />
                  <Separator className="my-2" />
                  <SmallSkeleton className="h-5 w-28" />
                </>
              ) : (
                <div className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatNpr(totals.sub)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{formatNpr(totals.ship)}</span>
                  </div>
                  {totals.tax ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatNpr(totals.tax)}</span>
                    </div>
                  ) : null}
                  {totals.disc ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span>-{formatNpr(Math.abs(totals.disc))}</span>
                    </div>
                  ) : null}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatNpr(totals.grand)}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Items */}
          <motion.div {...fadeUp} transition={{ duration: 0.25, delay: 0.1 }}>
            <div className="mb-2 text-sm font-medium">Items</div>
            {loading ? (
              <div className="space-y-2">
                <SmallSkeleton className="h-20 w-full" />
                <SmallSkeleton className="h-20 w-full" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">No items.</div>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {items.map((it, idx) => {
                    const name = it.name || it.productName || "Product";
                    const variant = it.variantName || null;
                    const qty = Number(it.qty ?? 1);
                    const unit = Number(it.price ?? 0) || 0;
                    const lineTotal = unit * qty;
                    const img =
                      it.image?.path ||
                      it.thumbnail?.path ||
                      it.productImage?.path ||
                      it.image ||
                      null;

                    return (
                      <motion.li
                        key={it._id || it.id || `${name}-${idx}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded border p-3"
                      >
                        <div className="flex gap-3">
                          <div className="relative h-16 w-16 rounded bg-muted overflow-hidden shrink-0">
                            {img && (
                              <Image
                                src={img}
                                alt={name}
                                fill
                                className="object-contain"
                                sizes="64px"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <div className="min-w-0">
                                <div className="font-medium leading-tight line-clamp-2">
                                  {name}
                                </div>
                                {variant && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {variant}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Qty: {qty}
                                </div>
                              </div>
                              <div className="ml-auto text-right">
                                <div className="text-sm font-semibold">
                                  {formatNpr(lineTotal)}
                                </div>
                                {unit && qty > 1 ? (
                                  <div className="text-xs text-muted-foreground">
                                    {formatNpr(unit)} × {qty}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </motion.div>

          {/* Shipment */}
          {order && (tracking || (order.events && order.events.length > 0)) && (
            <motion.div {...fadeUp} transition={{ duration: 0.25, delay: 0.15 }}>
              <div className="mb-2 text-sm font-medium">Shipment</div>
              <div className="rounded-md border p-3">
                {tracking ? (
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                    <Badge
                      variant="secondary"
                      className="text-black"
                      style={{ backgroundColor: `${PRIMARY}33` }}
                    >
                      {tracking.carrier || "Carrier"}
                    </Badge>
                    {tracking.number ? (
                      <Badge variant="outline">#{tracking.number}</Badge>
                    ) : null}
                    {tracking.url ? (
                      <Button
                        asChild
                        size="sm"
                        className="ml-auto h-8"
                        style={{ backgroundColor: PRIMARY, color: "#111" }}
                      >
                        <Link href={tracking.url} target="_blank" rel="noreferrer">
                          Track
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {Array.isArray(order?.events) && order.events.length > 0 ? (
                  <ul className="space-y-2">
                    {order.events.map((ev, i) => (
                      <li
                        key={`${ev.status || ev.label || "ev"}-${i}`}
                        className="flex items-start gap-3"
                      >
                        <div
                          className="mt-0.5 h-2 w-2 rounded-full"
                          style={{ backgroundColor: PRIMARY }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            {ev.status || ev.label || "Update"}
                          </div>
                          {ev.note && (
                            <div className="text-sm text-muted-foreground">
                              {ev.note}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {niceDateTime(ev.timestamp || ev.date)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  !tracking && (
                    <div className="text-sm text-muted-foreground">
                      No timeline updates yet.
                    </div>
                  )
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
