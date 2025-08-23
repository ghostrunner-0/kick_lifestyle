// app/corporate-orders/page.jsx
"use client";

import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

/* shadcn/ui */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

/* icons */
import {
  Building2,
  User,
  Mail,
  Phone,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  MessageSquare,
} from "lucide-react";
import TitleCard from "@/components/application/TitleCard";

const PRIMARY = "#fcba17";
const digits10 = (s) =>
  (String(s || "").match(/\d+/g) || []).join("").slice(-10);

/* ---- framer-motion variants ---- */
const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const sectionStagger = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const fadeItem = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export default function CorporateOrdersPage() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredContact, setPreferredContact] = useState("email");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [budgetTotal, setBudgetTotal] = useState("");

  const [items, setItems] = useState([
    { key: `li-0`, productName: "", quantity: 10, targetPrice: "", note: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState("");
  const [error, setError] = useState("");

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        key: `li-${Date.now()}`,
        productName: "",
        quantity: 1,
        targetPrice: "",
        note: "",
      },
    ]);

  const delItem = (idx) =>
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)
    );

  const setItem = (idx, patch) =>
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    setSubmitting(true);
    setError("");
    setSuccessId("");

    try {
      const payload = {
        companyName,
        contactName,
        email,
        phone: digits10(phone),
        preferredContact,
        address,
        message,
        budgetTotal: budgetTotal ? Number(budgetTotal) : null,
        items: items
          .map((it) => ({
            productName: it.productName,
            quantity: Number(it.quantity || 0),
            targetPrice: it.targetPrice ? Number(it.targetPrice) : null,
            note: it.note || "",
          }))
          .filter((it) => it.productName && it.quantity > 0),
      };

      const { data } = await axios.post(
        "/api/website/corporate-orders",
        payload
      );
      if (data?.success) {
        setSuccessId(data?.data?.id || "");
        // reset light
        setCompanyName("");
        setContactName("");
        setEmail("");
        setPhone("");
        setPreferredContact("email");
        setAddress("");
        setMessage("");
        setBudgetTotal("");
        setItems([
          {
            key: `li-0`,
            productName: "",
            quantity: 10,
            targetPrice: "",
            note: "",
          },
        ]);
      } else {
        setError(data?.message || "Failed to submit");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.main
      initial="hidden"
      animate="show"
      variants={pageVariants}
      className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8"
    >
      {/* Header */}
      <motion.header
        variants={sectionStagger}
        initial="hidden"
        animate="show"
        className="text-center space-y-2"
      >
        <TitleCard
          title="Corporate / Bulk Orders"
          subtitle="Tell us what you need—products, quantities, timelines—and our team will get back with a custom quote."
          badge="B2B Program"
          accent={PRIMARY}
          variant="solid" // use "image" + imageUrl if you want a hero photo
          pattern="grid"
          align="center"
          size="md"
          className="mx-auto max-w-5xl"
          rounded="rounded-2xl"
        />
      </motion.header>

      <Separator />

      {/* Form */}
      <motion.div variants={fadeItem}>
        <Card className="w-full">
          <CardHeader className="pb-2">
            <div className="font-semibold">Request a Quote</div>
          </CardHeader>
          <CardContent className="sm:p-6">
            <form onSubmit={onSubmit} className="space-y-8">
              {/* Company & Contact */}
              <motion.div
                variants={sectionStagger}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-12 gap-4"
              >
                <motion.div
                  variants={fadeItem}
                  className="md:col-span-6 space-y-1"
                >
                  <Label>Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Pvt. Ltd."
                    />
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeItem}
                  className="md:col-span-6 space-y-1"
                >
                  <Label>Contact Person</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your Name"
                    />
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeItem}
                  className="md:col-span-5 space-y-1"
                >
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeItem}
                  className="md:col-span-3 space-y-1"
                >
                  <Label>Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98XXXXXXXX"
                      inputMode="numeric"
                    />
                  </div>
                </motion.div>

                <motion.div
                  variants={fadeItem}
                  className="md:col-span-4 space-y-1"
                >
                  <Label>Preferred Contact</Label>
                  <Select
                    value={preferredContact}
                    onValueChange={setPreferredContact}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>

                <motion.div
                  variants={fadeItem}
                  className="md:col-span-12 space-y-1"
                >
                  <Label>Address (optional)</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="City, Country"
                  />
                </motion.div>
              </motion.div>

              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-sm font-medium">Requested Items</h3>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button type="button" variant="outline" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-1" /> Add item
                    </Button>
                  </motion.div>
                </div>

                <AnimatePresence initial={false}>
                  {items.map((it, idx) => (
                    <motion.div
                      key={it.key}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { duration: 0.22 },
                      }}
                      exit={{
                        opacity: 0,
                        y: -6,
                        scale: 0.98,
                        transition: { duration: 0.15 },
                      }}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 rounded-md border p-3 md:p-4"
                    >
                      <div className="md:col-span-7 space-y-1">
                        <Label>Product / Description</Label>
                        <Input
                          value={it.productName}
                          onChange={(e) =>
                            setItem(idx, { productName: e.target.value })
                          }
                          placeholder="e.g., Kick Buds S2 Pro, 200 units"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) =>
                            setItem(idx, { quantity: e.target.value })
                          }
                          placeholder="50"
                        />
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <Label>Target Price (optional)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={it.targetPrice}
                          onChange={(e) =>
                            setItem(idx, { targetPrice: e.target.value })
                          }
                          placeholder="Per unit"
                        />
                      </div>
                      <div className="md:col-span-12 space-y-1">
                        <Label>Note (optional)</Label>
                        <Input
                          value={it.note}
                          onChange={(e) =>
                            setItem(idx, { note: e.target.value })
                          }
                          placeholder="Any specific color/variant/brand preference"
                        />
                      </div>
                      <div className="md:col-span-12 flex justify-end">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => delItem(idx)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Budget + Message */}
              <motion.div
                variants={sectionStagger}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-12 gap-4"
              >
                <motion.div
                  variants={fadeItem}
                  className="md:col-span-4 space-y-1"
                >
                  <Label>Estimated Total Budget (optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={budgetTotal}
                    onChange={(e) => setBudgetTotal(e.target.value)}
                    placeholder="e.g., 500000"
                  />
                </motion.div>

                <motion.div
                  variants={fadeItem}
                  className="md:col-span-12 space-y-1"
                >
                  <Label>Additional Details (optional)</Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      className="pl-9"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Timeline, delivery location, invoicing details, etc."
                    />
                  </div>
                </motion.div>
              </motion.div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <motion.div
                  variants={fadeItem}
                  className="text-xs text-muted-foreground"
                >
                  We usually respond within 1–2 business days.
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                >
                  <Button
                    type="submit"
                    style={{ backgroundColor: PRIMARY, color: "#111" }}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                        Sending…
                      </>
                    ) : (
                      "Request Quote"
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {successId ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 text-emerald-600 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      Your request has been submitted. Ref: {successId}
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence>
                {error ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-red-600 text-sm"
                  >
                    {error}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.main>
  );
}
