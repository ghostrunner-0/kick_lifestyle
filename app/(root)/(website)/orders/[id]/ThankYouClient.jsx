"use client";

import React, { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2, Copy, ShoppingBag } from "lucide-react";
import { showToast } from "@/lib/ShowToast";
import { trackPurchase } from "@/lib/analytics";

export default function ThankYouClient({ params }) {
  const displayId = useMemo(
    () => decodeURIComponent(params?.id || "").trim(),
    [params?.id]
  );

  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!displayId) return;

    const loadOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${displayId}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (json.success && json.data) {
          setOrder(json.data);
          trackPurchase(json.data); // ✅ fire purchase event
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
      }
    };

    loadOrder();
  }, [displayId]);

  const copyId = async () => {
    if (!displayId) return;
    try {
      await navigator.clipboard.writeText(displayId);
      showToast("success", "Order ID copied");
    } catch {
      showToast("info", "Copy failed. Long-press to copy.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="border-0 shadow-none">
        <CardHeader className="text-center space-y-2">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="text-2xl font-semibold">Thank you for your order!</h1>
          <p className="text-slate-600">
            We’ve received your order and sent a confirmation to your email.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {displayId ? (
            <div className="rounded-xl bg-slate-50 border p-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-slate-500">
                  Your Order ID
                </div>
                <div className="text-lg font-mono font-semibold tracking-wide">
                  {displayId}
                </div>
              </div>
              <Button variant="secondary" onClick={copyId} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800">
              We couldn’t read your order ID. If you just placed an order,
              please check your email.
            </div>
          )}

          {/* Optional: show small summary if order loaded */}
          {order && (
            <div className="rounded-xl bg-white border p-4 text-sm text-slate-700 space-y-1">
              <div>
                <span className="font-medium">Total:</span>{" "}
                {order.amounts?.total} {order.amounts?.currency || "NPR"}
              </div>
              <div>
                <span className="font-medium">Items:</span>{" "}
                {order.items?.length}
              </div>
              <div>
                <span className="font-medium">Payment:</span>{" "}
                {order.paymentMethod?.toUpperCase()}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Link href="/">
              <Button className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Continue shopping
              </Button>
            </Link>
            <Link href="/account">
              <Button variant="outline">View my orders</Button>
            </Link>
          </div>

          <div className="text-center text-sm text-slate-500">
            Keep your Order ID handy when contacting support.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
