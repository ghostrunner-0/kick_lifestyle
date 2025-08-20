"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PackageSearch,
  Truck,
  ShieldCheck,
  PhoneCall,
  MessageCircleQuestion,
  ArrowRight,
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
    href: "/support/contact",
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

export default function SupportHome() {
  const router = useRouter();
  const prefersReduced = useReducedMotion();

  const onSearch = (e) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim() || "";
    router.push(`/support/faq${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  const fadeUp = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  const stagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReduced ? 0 : 0.06,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-6xl px-4 py-8 space-y-8"
    >
      <motion.header variants={fadeUp} className="space-y-3 text-center">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Help Center
        </h1>
        <p className="text-muted-foreground">
          Find your order, manage warranty, or get in touch with us.
        </p>

        <form
          onSubmit={onSearch}
          className="mx-auto mt-4 flex w-full max-w-xl items-center gap-2"
        >
          <Input
            name="q"
            placeholder="Search FAQs (e.g. refund, delivery time, warranty)…"
            className="h-11"
          />
          <Button type="submit" className="h-11">
            Search
          </Button>
        </form>
      </motion.header>

      {/* Tiles */}
      <motion.section
        variants={stagger}
        className="grid gap-4 sm:grid-cols-2"
      >
        {tiles.map((t, i) => (
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
                  <p className="text-sm text-muted-foreground max-w-[34ch]">
                    {t.desc}
                  </p>
                  <ArrowRight className="h-5 w-5 opacity-60" />
                </CardContent>
              </Card>
            </motion.div>
          </Link>
        ))}
      </motion.section>

      {/* Quick Track */}
      <motion.section variants={fadeUp} className="rounded-xl border p-4 md:p-5 bg-background">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5" />
            <div className="font-medium">Quick Track</div>
          </div>
          <div className="ml-auto w-full md:w-auto flex gap-2">
            <Input className="h-10" placeholder="Order ID (e.g. AXC-2042)" />
            <Input className="h-10" placeholder="Phone (10 digits)" />
            <Button className="h-10">Track</Button>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
