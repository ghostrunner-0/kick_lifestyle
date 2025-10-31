"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, ExternalLink } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export default function OrderClient() {
  const prefersReduced = useReducedMotion();

  // --- tracking state ---
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [error, setError] = useState("");

  const fadeUp = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  const normalize10 = (v) =>
    String(v || "")
      .replace(/[^\d]/g, "")
      .slice(-10);
  const validPhone = (v) => /^\d{10}$/.test(normalize10(v));

  const track = async (e) => {
    e?.preventDefault?.();
    setError("");
    setResp(null);

    const id = orderId.trim();
    const p = normalize10(phone);

    if (!id) return setError("Please enter your Order ID.");
    if (!validPhone(p))
      return setError("Please enter a valid 10-digit phone number.");

    setLoading(true);
    try {
      const r = await fetch(
        `/api/website/support/track/${encodeURIComponent(
          id
        )}?phone=${encodeURIComponent(p)}`,
        { method: "GET", cache: "no-store" }
      );
      const json = await r.json();
      if (!json?.success) {
        setError(json?.message || "Could not fetch your order.");
        setResp(null);
      } else {
        setResp(json);
      }
    } catch (err) {
      setError(err?.message || "Network error");
      setResp(null);
    } finally {
      setLoading(false);
    }
  };

  const data = resp?.data || null;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-5xl px-0 py-8 space-y-8"
    >
      <motion.header variants={fadeUp}>
        <h1 className="text-xl md:text-2xl font-semibold">Orders & Delivery</h1>
        <p className="text-muted-foreground">
          Track delivery and learn how shipping works.
        </p>
      </motion.header>

      {/* Track your order */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader className="font-medium">Track your order</CardHeader>
          <CardContent>
            <form onSubmit={track} className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Order ID (e.g. AXC-2042)"
                className="h-11"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
              <Input
                placeholder="Phone (10 digits)"
                className="h-11"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Button className="h-11" type="submit" disabled={loading}>
                {loading ? "Checking…" : "Track"}
              </Button>
            </form>

            {error ? (
              <div className="mt-2 text-sm text-red-600">{error}</div>
            ) : null}

            {/* Result */}
            {data ? (
              <Card className="mt-4 border">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Order</div>
                    <div className="text-base font-medium">
                      {data.displayOrderId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Placed on {new Date(data.placedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {data.status}
                    </Badge>
                    <Badge className="capitalize">
                      {data.payment?.method || "—"} •{" "}
                      {data.payment?.status || "unpaid"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-4 md:grid-cols-3">
                  {/* Shipping & Tracking */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Shipping</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      Carrier: {data.shipping?.carrier || "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tracking ID: {data.shipping?.trackingId || "—"}
                    </div>
                    {data.shipping?.tracking?.url ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="mt-1"
                      >
                        <a
                          href={data.shipping.tracking.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Track on Pathao{" "}
                          <ExternalLink className="ml-1 h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Delivery Address</div>
                    <div className="text-sm text-muted-foreground">
                      {[
                        data.shipping?.address?.area,
                        data.shipping?.address?.zone,
                        data.shipping?.city || data.shipping?.address?.city,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                    {data.shipping?.address?.landmark ? (
                      <div className="text-sm text-muted-foreground">
                        Landmark: {data.shipping.address.landmark}
                      </div>
                    ) : null}
                    <div className="text-xs text-muted-foreground">
                      {data.customer?.fullName || "Customer"} •{" "}
                      {data.customer?.phoneMasked || "**********"}
                    </div>
                  </div>

                  {/* Items & Total */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Summary</div>
                    <div className="text-sm text-muted-foreground">
                      Items:{" "}
                      {Array.isArray(data.items)
                        ? data.items.reduce((n, it) => n + (it.qty || 0), 0)
                        : 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total:{" "}
                      {data.amounts?.total != null
                        ? `NPR ${data.amounts.total}`
                        : "—"}
                    </div>

                    {/* Khalti CTA if unpaid */}
                    {data.khaltiPayment?.available &&
                    data.khaltiPayment?.payment_url ? (
                      <Button asChild size="sm" className="mt-1">
                        <a
                          href={data.khaltiPayment.payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Complete Payment{" "}
                          <ExternalLink className="ml-1 h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>

      {/* Shipping timeline */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader className="font-medium">Shipping timeline</CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <div>
                <span className="font-medium">Processing:</span> 0–24 hours on
                business days.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <div>
                <span className="font-medium">Delivery:</span> Inside valley 1–2
                days, outside 2–4 days.
              </div>
            </div>
            <Separator />
            <p className="text-muted-foreground">
              You’ll receive email updates when your order status changes.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
