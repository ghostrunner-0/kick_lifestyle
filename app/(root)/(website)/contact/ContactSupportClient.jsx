"use client";

import { useState } from "react";
import axios from "axios";

import { motion, useReducedMotion } from "framer-motion";
import TitleCard from "@/components/application/TitleCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const PRIMARY = "#fcba17";

export default function ContactSupportClient() {
  const prefersReduced = useReducedMotion();

  const container = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: "easeOut",
        staggerChildren: prefersReduced ? 0 : 0.06,
      },
    },
  };
  const item = {
    hidden: {
      opacity: 0,
      y: prefersReduced ? 0 : 12,
      scale: prefersReduced ? 1 : 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.45, ease: "easeOut" },
    },
  };

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  const validEmail = (v) => /\S+@\S+\.\S+/.test(v);
  const canSend =
    name.trim() && validEmail(email) && message.trim().length >= 10;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk(false);

    if (!canSend) {
      setErr(
        "Please complete the required fields (Name, Email, Message ≥ 10 chars)."
      );
      return;
    }

    setSending(true);
    try {
      const res = await axios.post("/api/website/support/contact", {
        name,
        email,
        phone,
        message,
      });
      if (res.status !== 200 || !res.data.success) {
        throw new Error("Failed to send your message.");
      }
      setOk(true);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (e) {
      setErr(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <TitleCard
        title="Contact & Support"
        subtitle="Reach our team via email or phone — or send a message using the form. We’ll get back to you as soon as we can."
        badge="We’re here to help"
        accent={PRIMARY}
        variant="solid" // try "image" with imageUrl, or "glass"/"soft"
        pattern="grid" // "dots" | "none"
        align="left" // or "center"
        size="md" // "sm" | "md" | "lg"
        className="text-black"
        actions={
          <>
            <Button
              size="sm"
              asChild
              style={{ backgroundColor: PRIMARY, color: "#111" }}
            >
              <a href="mailto:info@kick.com.np">Email support</a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="text-neutral-900 bg-white hover:bg-white/90 border-transparent"
            >
              <a href="/support/faq">View FAQs</a>
            </Button>
          </>
        }
      />

      <motion.section
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid gap-5 md:grid-cols-2"
      >
        {/* Contact details */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader className="font-medium">Contact details</CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <span className="grid h-9 w-9 place-items-center rounded-md border bg-muted/30">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <a
                    href="mailto:info@kick.com.np"
                    className="font-medium hover:underline break-all"
                  >
                    info@kick.com.np
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-3">
                <span className="grid h-9 w-9 place-items-center rounded-md border bg-muted/30">
                  <Phone className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <a
                    href="tel:+9779820810020"
                    className="font-medium hover:underline"
                  >
                    +977 9820810020
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-3">
                <span className="grid h-9 w-9 place-items-center rounded-md border bg-muted/30">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Hours (NPT)
                  </div>
                  <div className="font-medium">
                    Sun–Fri, 10:00 AM – 05:00 PM
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-3 bg-muted/40 text-xs text-muted-foreground">
                Tip: Include your order ID (if any) so we can help faster.
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Form */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader className="font-medium">Send us a message</CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name *"
                    className="h-11"
                  />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="Email *"
                    className="h-11"
                  />
                </div>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="h-11"
                />
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="How can we help? *"
                />

                {err ? (
                  <div className="flex items-center gap-2 text-sm text-rose-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{err}</span>
                  </div>
                ) : null}
                {ok ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Thanks! Your message has been sent.</span>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={!canSend || sending}
                  className="w-full h-11"
                  style={{
                    backgroundColor: PRIMARY,
                    color: "#111",
                    borderColor: PRIMARY,
                  }}
                >
                  {sending ? "Sending…" : "Send message"}
                </Button>
                <div className="text-xs text-muted-foreground">
                  * Required fields
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>
    </div>
  );
}
