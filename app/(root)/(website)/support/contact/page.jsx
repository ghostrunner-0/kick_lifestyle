"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Clock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export default function ContactSupport() {
  const prefersReduced = useReducedMotion();
  const fadeUp = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };
  const hover = { whileHover: { y: prefersReduced ? 0 : -2 } };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-5xl px-4 py-8 space-y-8"
    >
      <motion.header variants={fadeUp}>
        <h1 className="text-xl md:text-2xl font-semibold">Contact & Info</h1>
        <p className="text-muted-foreground">
          Reach our support team or send a message.
        </p>
      </motion.header>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={fadeUp} {...hover}>
          <Card>
            <CardHeader className="font-medium">Contact details</CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:support@example.com" className="hover:underline">
                  support@example.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href="tel:+9779800000000" className="hover:underline">
                  +977 98XXXXXXXX
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Sun–Fri, 10:00–18:00 NPT</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="font-medium">Send us a message</CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Your name" className="h-11" />
              <Input placeholder="Email" type="email" className="h-11" />
              <Textarea placeholder="How can we help?" rows={5} />
              <Button className="w-full h-11">Send</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
