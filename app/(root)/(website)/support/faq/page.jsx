"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { motion, useReducedMotion } from "framer-motion";

const FAQ = [
  { q: "How do I track my order?", a: "Use your Order ID (e.g. AXC-2042) and phone number on the Orders page. We also send updates via SMS/email.", tag: "orders" },
  { q: "Delivery time inside/outside valley?", a: "Inside valley: 1–2 business days. Outside valley: 2–4 business days.", tag: "delivery" },
  { q: "What is covered under warranty?", a: "Manufacturing defects for 12 months. Physical and liquid damage are not covered.", tag: "warranty" },
  { q: "How to start a warranty/repair request?", a: "Go to Warranty page and follow the claim steps. Keep your order ID and proof ready.", tag: "warranty" },
  { q: "Can I change my delivery address after placing an order?", a: "If the order is not shipped yet, contact support and we’ll update it.", tag: "orders" },
];

export default function FAQSupport() {
  const sp = useSearchParams();
  const q = (sp.get("q") || "").toLowerCase().trim();
  const prefersReduced = useReducedMotion();

  const list = useMemo(() => {
    if (!q) return FAQ;
    return FAQ.filter(
      (f) =>
        f.q.toLowerCase().includes(q) ||
        f.a.toLowerCase().includes(q) ||
        f.tag.toLowerCase().includes(q)
    );
  }, [q]);

  const fadeUp = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-4xl px-4 py-8 space-y-6"
    >
      <motion.header variants={fadeUp} className="space-y-2">
        <h1 className="text-xl md:text-2xl font-semibold">FAQ</h1>
        <p className="text-muted-foreground">
          Click a question to view the answer. Use search to narrow down.
        </p>
        <Input
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const val = e.currentTarget.value.trim();
              const url = `/support/faq${val ? `?q=${encodeURIComponent(val)}` : ""}`;
              window.history.replaceState({}, "", url);
            }
          }}
          placeholder="Search FAQs…"
          className="h-11"
        />
      </motion.header>

      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader className="font-medium">Top questions</CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              {list.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
              {list.length === 0 && (
                <div className="text-sm text-muted-foreground py-4">
                  No results. Try a different keyword.
                </div>
              )}
            </Accordion>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
