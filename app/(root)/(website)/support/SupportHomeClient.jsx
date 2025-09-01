"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  PackageSearch,
  Truck,
  ShieldCheck,
  PhoneCall,
  MessageCircleQuestion,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const tiles = [
  {
    href: "/support/orders",
    title: "Orders & Delivery Tracking",
    desc: "Track orders, delivery timelines, and shipping FAQs.",
    icon: <Truck className="h-6 w-6" />,
  },
  {
    href: "/support/warranty",
    title: "Warranty, Repair & Replacement",
    desc: "Coverage details and how to start a claim.",
    icon: <ShieldCheck className="h-6 w-6" />,
  },
  {
    href: "/contact",
    title: "Contact & Additional Info",
    desc: "Talk to a human—email, phone, hours, and policies.",
    icon: <PhoneCall className="h-6 w-6" />,
  },
  {
    href: "/support/faq",
    title: "FAQ",
    desc: "Quick answers to the most common questions.",
    icon: <MessageCircleQuestion className="h-6 w-6" />,
  },
];

export default function SupportHomeClient() {
  const router = useRouter();
  const prefersReduced = useReducedMotion();

  /* ---------- Search form ---------- */
  const onSearch = (e) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim() || "";
    router.push(`/support/faq${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  /* ---------- Quick Track state ---------- */
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null); // API json
  const [error, setError] = useState("");

  const validPhone = (v) => /^\d{10}$/.test(String(v).replace(/[^\d]/g, "").slice(-10));

  const track = async () => {
    setError("");
    setResp(null);

    const id = orderId.trim();
    const p = String(phone || "").replace(/[^\d]/g, "").slice(-10);

    if (!id) return setError("Please enter your Order ID.");
    if (!validPhone(p)) return setError("Please enter a valid 10-digit phone number.");

    setLoading(true);
    try {
      const res = await fetch(
        `/api/website/support/track/${encodeURIComponent(id)}?phone=${encodeURIComponent(p)}`,
        { method: "GET", cache: "no-store" }
      );
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Could not fetch your order.");
        setResp(null);
      } else {
        setResp(json);
      }
    } catch (e) {
      setError(e?.message || "Network error");
      setResp(null);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Animations ---------- */
  const fadeUp = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: prefersReduced ? 0 : 0.06 } },
  };

  const data = resp?.data || null;

  return (
    <motion.div initial="hidden" animate="visible" className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <motion.header variants={fadeUp} className="space-y-3 text-center">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Help Center</h1>
        <p className="text-muted-foreground">
          Find your order, manage warranty, or get in touch with us.
        </p>

        <form onSubmit={onSearch} className="mx-auto mt-4 flex w-full max-w-xl items-center gap-2">
          <Input name="q" placeholder="Search FAQs (e.g. refund, delivery time, warranty)…" className="h-11" />
          <Button type="submit" className="h-11">Search</Button>
        </form>
      </motion.header>

      {/* Tiles */}
      <motion.section variants={stagger} className="grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <motion.div
              variants={fadeUp}
              whileHover={{ y: prefersReduced ? 0 : -3, scale: prefersReduced ? 1 : 1.01 }}
              whileTap={{ scale: prefersReduced ? 1 : 0.997 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
              <Card className="h-full transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="grid place-items-center h-10 w-10 rounded-lg border">
                    {t.icon}
                  </div>
                  <div className="font-medium">{t.title}</div>
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <p className="text-sm text-muted-foreground max-w-[34ch]">{t.desc}</p>
                  <ArrowRight className="h-5 w-5 opacity-60" />
                </CardContent>
              </Card>
            </motion.div>
          </Link>
        ))}
      </motion.section>

      {/* Quick Track */}
      <motion.section variants={fadeUp} className="rounded-xl border p-4 md:p-5 bg-background space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5" />
            <div className="font-medium">Quick Track</div>
          </div>
          <div className="ml-auto w-full md:w-auto flex gap-2">
            <Input
              className="h-10"
              placeholder="Order ID (e.g. AXC-2042)"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
            <Input
              className="h-10"
              placeholder="Phone (10 digits)"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button className="h-10" onClick={track} disabled={loading}>
              {loading ? "Checking…" : "Track"}
            </Button>
          </div>
        </div>

        {/* Error */}
        {error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : null}

        {/* Result */}
        {data ? (
          <Card className="border">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Order</div>
                <div className="text-base font-medium">{data.displayOrderId}</div>
                <div className="text-xs text-muted-foreground">
                  Placed on {new Date(data.placedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {data.status}
                </Badge>
                <Badge className="capitalize">
                  {data.payment?.method || "—"} • {data.payment?.status || "unpaid"}
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
                  <Button asChild variant="outline" size="sm" className="mt-1">
                    <a href={data.shipping.tracking.url} target="_blank" rel="noopener noreferrer">
                      Track on Pathao <ExternalLink className="ml-1 h-4 w-4" />
                    </a>
                  </Button>
                ) : null}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Delivery Address</div>
                <div className="text-sm text-muted-foreground">
                  {[data.shipping?.address?.area, data.shipping?.address?.zone, data.shipping?.address?.city]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </div>
                {data.shipping?.address?.landmark ? (
                  <div className="text-sm text-muted-foreground">
                    Landmark: {data.shipping.address.landmark}
                  </div>
                ) : null}
                <div className="text-xs text-muted-foreground">
                  {data.customer?.fullName || "Customer"} • {data.customer?.phoneMasked || "**********"}
                </div>
              </div>

              {/* Items & Total */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Summary</div>
                <div className="text-sm text-muted-foreground">
                  Items: {Array.isArray(data.items) ? data.items.reduce((n, it) => n + (it.qty || 0), 0) : 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: {data.amounts?.total != null ? `NPR ${data.amounts.total}` : "—"}
                </div>

                {/* Khalti CTA if unpaid */}
                {data.khaltiPayment?.available && data.khaltiPayment?.payment_url ? (
                  <Button asChild size="sm" className="mt-1">
                    <a href={data.khaltiPayment.payment_url} target="_blank" rel="noopener noreferrer">
                      Complete Payment <ExternalLink className="ml-1 h-4 w-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </motion.section>
    </motion.div>
  );
}
