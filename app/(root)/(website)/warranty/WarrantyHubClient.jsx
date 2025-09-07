"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NotebookPen, ShieldCheck, MessageCircle, ArrowRight } from "lucide-react";

const PRIMARY = "#fcba17";

/* ---- animations ---- */
const container = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut",
      when: "beforeChildren",
      staggerChildren: 0.08,
    },
  },
};
const item = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};
const tap = { scale: 0.98 };
const hover = { y: -2 };

export default function WarrantyHubClient() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Header */}
      <motion.header
        variants={container}
        initial="hidden"
        animate="visible"
        className="text-center space-y-3"
      >
        <div className="flex justify-center">
          <Badge
            variant="secondary"
            className="text-[10px] font-medium"
            style={{
              backgroundColor: `${PRIMARY}33`,
              borderColor: `${PRIMARY}55`,
              color: "#111",
            }}
          >
            Warranty Center
          </Badge>
        </div>
        <motion.h1
          variants={item}
          className="text-3xl sm:text-4xl font-semibold"
        >
          Warranty Center
        </motion.h1>
        <motion.p
          variants={item}
          className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          Register your warranty (online or in-store) and check remaining
          coverage with just your phone number. Fast, simple, and secure.
        </motion.p>
      </motion.header>

      <Separator />

      {/* Top row: two cards (as before) */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2"
      >
        {/* Register */}
        <motion.div
          variants={item}
          whileHover={hover}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <Card
            className="group h-full hover:bg-muted/30 transition-colors"
            style={{ borderTop: `3px solid ${PRIMARY}` }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${PRIMARY}26` }}
                >
                  <NotebookPen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-tight truncate">
                    Register Warranty
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Add warranty for your purchase in a few steps.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>Register your offline/online warranty</li>
              </ul>
            </CardContent>
            <CardFooter className="pt-0">
              <motion.div whileTap={tap} className="w-full md:w-auto">
                <Button
                  asChild
                  className="w-full md:w-auto inline-flex items-center gap-2"
                  style={{ backgroundColor: PRIMARY, color: "#111" }}
                >
                  <Link
                    href="/warranty/offline-register"
                    aria-label="Open Warranty Registration"
                  >
                    <NotebookPen className="h-4 w-4" />
                    <span>Open Registration</span>
                    <ArrowRight className="h-4 w-4 opacity-80" />
                  </Link>
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Check */}
        <motion.div
          variants={item}
          whileHover={hover}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <Card
            className="group h-full hover:bg-muted/30 transition-colors"
            style={{ borderTop: `3px solid ${PRIMARY}` }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${PRIMARY}26` }}
                >
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-tight truncate">
                    Check Warranty
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    See coverage and days left by phone number.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>Start warranty check</li>
              </ul>
            </CardContent>
            <CardFooter className="pt-0">
              <motion.div whileTap={tap} className="w-full md:w-auto">
                <Button
                  asChild
                  className="w-full md:w-auto inline-flex items-center gap-2"
                  style={{ backgroundColor: PRIMARY, color: "#111" }}
                >
                  <Link href="/warranty/check" aria-label="Start Warranty Check">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Start Warranty Check</span>
                    <ArrowRight className="h-4 w-4 opacity-80" />
                  </Link>
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>

      {/* Bottom: single full-width WhatsApp claim card */}
      <motion.div variants={container} initial="hidden" animate="visible">
        <motion.div
          variants={item}
          whileHover={hover}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <Card
            className="group w-full hover:bg-muted/30 transition-colors"
            style={{ borderTop: `3px solid ${PRIMARY}` }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${PRIMARY}26` }}
                >
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-tight">
                    Warranty Claim (WhatsApp)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Start a claim instantly — our team will guide you step by step.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>WhatsApp: +977 9820810020</li>
                <li>Share your serial number & invoice/warranty card photo</li>
              </ul>
            </CardContent>
            <CardFooter className="pt-0">
              <motion.div whileTap={tap} className="w-full md:w-auto">
                <Button
                  asChild
                  className="w-full md:w-auto inline-flex items-center gap-2"
                  style={{ backgroundColor: PRIMARY, color: "#111" }}
                >
                  <a
                    href="https://wa.me/9779820810020?text=Hi%20Kick%20Lifestyle%2C%20I%20need%20help%20with%20a%20warranty%20claim."
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open WhatsApp to claim warranty"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Claim via WhatsApp</span>
                    <ArrowRight className="h-4 w-4 opacity-80" />
                  </a>
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
