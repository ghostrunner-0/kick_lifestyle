"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Package, Truck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export default function OrdersSupport() {
  const prefersReduced = useReducedMotion();
  const fadeUp = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-5xl px-4 py-8 space-y-8"
    >
      <motion.header variants={fadeUp}>
        <h1 className="text-xl md:text-2xl font-semibold">Orders & Delivery</h1>
        <p className="text-muted-foreground">
          Track delivery and learn how shipping works.
        </p>
      </motion.header>

      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader className="font-medium">Track your order</CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Order ID (e.g. AXC-2042)" className="h-11" />
            <Input placeholder="Phone (10 digits)" className="h-11" />
            <Button className="h-11">Track</Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader className="font-medium">Shipping timeline</CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <div>
                <span className="font-medium">Processing:</span> 0–24 hours on business days.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <div>
                <span className="font-medium">Delivery:</span> Inside valley 1–2 days, outside 2–4 days.
              </div>
            </div>
            <Separator />
            <p className="text-muted-foreground">
              You’ll receive SMS/email updates when your order status changes.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
