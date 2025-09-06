"use client";

import { useState } from "react";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { showToast } from "@/lib/ShowToast";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// Title
import TitleCard from "@/components/application/TitleCard";

// shadcn/ui
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

// --- Validation ---
const schema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phoneNumber: z.string().trim().min(7, "Enter a valid phone number").max(20, "Enter a valid phone number"),
  collegeName: z.string().trim().min(2, "College name is required"),
  collegePhoneNumber: z.string().trim().min(7, "Enter a valid college phone number").max(20, "Enter a valid college phone number"),
});

const PRIMARY = "#fcba17";
const DUPLICATE_MSG = "This phone number has already been used for an application.";

export default function StudentDiscountClient() {
  const prefersReduced = useReducedMotion();

  // --- Motion variants ---
  const v = {
    container: {
      hidden: {},
      show: { transition: { staggerChildren: prefersReduced ? 0 : 0.07, delayChildren: prefersReduced ? 0 : 0.03 } },
    },
    headerDown: {
      hidden: { opacity: 0, y: prefersReduced ? 0 : -16, filter: prefersReduced ? "none" : "blur(6px)" },
      show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: "easeOut" } },
    },
    cardPop: {
      hidden: { opacity: 0, scale: prefersReduced ? 1 : 0.98 },
      show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
    },
    fieldRise: {
      hidden: { opacity: 0, y: prefersReduced ? 0 : 14 },
      show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
    },
    helpFade: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.28 } } },
    previewZoom: {
      hidden: { opacity: 0, scale: prefersReduced ? 1 : 0.98 },
      show: { opacity: 1, scale: 1, transition: { duration: 0.22 } },
      exit: { opacity: 0, scale: prefersReduced ? 1 : 0.98, transition: { duration: 0.18 } },
    },
    submitSpring: {
      hidden: { opacity: 0, y: prefersReduced ? 0 : 10 },
      show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 340, damping: 24 } },
    },
  };
  const buttonHover = prefersReduced ? {} : { whileHover: { scale: 1.015 }, whileTap: { scale: 0.985 } };

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      collegeName: "",
      collegePhoneNumber: "",
    },
  });

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSelectFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      setPreviewUrl("");
      return;
    }
    if (!f.type.startsWith("image/")) {
      showToast("warning", "Please choose an image file.");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onSubmit = async (values) => {
    if (!file) {
      showToast("warning", "Please upload your college ID card photo.");
      return;
    }
    try {
      setSubmitting(true);
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => fd.append(k, v ?? ""));
      fd.append("idCardPhoto", file);

      const res = await axios.post("/api/website/student-discount", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      const data = res?.data;
      if (data?.success) {
        showToast("success", "Submitted! You’ll receive a flat 5% discount once verified.");
        form.reset();
        setFile(null);
        setPreviewUrl("");
        return;
      }

      // Non-success but 200 OK — respect server message
      const msg = data?.message || "Submission failed";
      const type = msg === DUPLICATE_MSG ? "warning" : "error";
      showToast(type, msg);
    } catch (err) {
      // Axios error branch — show specific duplicate warning, otherwise generic error
      const msg = err?.response?.data?.message || err?.message || "Could not submit. Try again.";
      const type = msg === DUPLICATE_MSG ? "warning" : "error";
      showToast(type, msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 md:px-8">
        {/* Title block */}
        <TitleCard
          title="Student Discount"
          subtitle="Verify your student status and unlock a flat 5% discount on all products."
          badge="Flat 5% off"
          accent={PRIMARY}
          variant="solid"
          pattern="grid"
          align="left"
          size="md"
          className="text-black"
        />

        {/* Animated form section */}
        <motion.section
          className="mt-8"
          variants={v.container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={v.cardPop}>
            <Card className="rounded-2xl">
              <CardHeader className="pb-0">
                <motion.h2 variants={v.headerDown} className="text-lg font-medium">
                  Your details
                </motion.h2>
              </CardHeader>
              <CardContent className="pt-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <motion.div
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      variants={v.container}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.2 }}
                    >
                      <motion.div variants={v.fieldRise}>
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>

                      <motion.div variants={v.fieldRise}>
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="you@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>

                      <motion.div variants={v.fieldRise}>
                        <FormField
                          control={form.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone number</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="98XXXXXXXX" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>

                      <motion.div variants={v.fieldRise}>
                        <FormField
                          control={form.control}
                          name="collegeName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>College name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your college" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>

                      <motion.div variants={v.fieldRise}>
                        <FormField
                          control={form.control}
                          name="collegePhoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>College phone number</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="01-XXXXXXX" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>
                    </motion.div>

                    {/* ID Card Photo */}
                    <motion.div className="grid grid-cols-1 gap-3" variants={v.fieldRise}>
                      <FormLabel>ID card photo</FormLabel>
                      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                        <label className="inline-flex items-center gap-3">
                          <Input type="file" accept="image/*" onChange={onSelectFile} className="cursor-pointer" />
                        </label>

                        <AnimatePresence mode="wait">
                          {previewUrl ? (
                            <motion.div
                              key={previewUrl}
                              variants={v.previewZoom}
                              initial="hidden"
                              animate="show"
                              exit="exit"
                              className="relative w-40 h-24 rounded-md overflow-hidden border bg-muted shrink-0"
                            >
                              <Image src={previewUrl} alt="ID Card preview" fill sizes="160px" className="object-cover" />
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>

                      <motion.div variants={v.helpFade}>
                        <FormDescription className="mt-0.5">
                          Clear photo of your valid student ID card (front). PNG or JPG preferred.
                        </FormDescription>
                      </motion.div>
                    </motion.div>

                    {/* Submit */}
                    <motion.div variants={v.submitSpring}>
                      <motion.div {...buttonHover}>
                        <Button
                          type="submit"
                          className="w-full md:w-auto"
                          disabled={submitting}
                          style={{ backgroundColor: PRIMARY, color: "#111", borderColor: PRIMARY }}
                        >
                          {submitting ? "Submitting..." : "Submit application"}
                        </Button>
                      </motion.div>
                    </motion.div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.section>
      </div>
    </main>
  );
}
