"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Wrench, RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export default function WarrantySupport() {
  const prefersReduced = useReducedMotion();
  const fadeUp = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };
  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: prefersReduced ? 0 : 0.07 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-5xl px-4 py-8 space-y-8"
    >
      <motion.header variants={fadeUp}>
        <h1 className="text-xl md:text-2xl font-semibold">
          Warranty, Repair & Replacement
        </h1>
        <p className="text-muted-foreground">
          What’s covered and how to start a claim.
        </p>
      </motion.header>

      <motion.div
        variants={stagger}
        className="grid gap-4 md:grid-cols-2"
      >
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-5 w-5" />
              Coverage overview
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Standard warranty: <b>12 months</b> on manufacturing defects.</p>
              <p>Physical damage and liquid damage are not covered.</p>
              <p>Keep your order ID and purchase proof ready.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="flex items-center gap-2 font-medium">
              <Wrench className="h-5 w-5" />
              Repair / Replacement process
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1) Submit a claim with issue detail & images/video.</p>
              <p>2) Our team verifies within 24–48 hours.</p>
              <p>3) We arrange repair or replacement as per policy.</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-xl border p-4 flex flex-wrap items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        <div className="text-sm">Ready to begin?</div>
        <Button asChild className="ml-auto">
          <Link href="/support/contact">Start a warranty claim</Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
