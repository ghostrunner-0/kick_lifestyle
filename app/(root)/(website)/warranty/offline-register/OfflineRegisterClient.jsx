"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Upload } from "lucide-react";

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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { showToast } from "@/lib/ShowToast";

// ------------------------------------
// Helpers
// ------------------------------------
const PRIMARY = "#fcba17";
const digits10 = (s) =>
  (String(s || "").match(/\d+/g) || []).join("").slice(0, 10);

const CHANNELS = [
  { value: "kick", label: "Kick Lifestyle" },
  { value: "daraz", label: "Daraz" },
  { value: "offline", label: "Others" },
];

const DUP_MSGS = new Set([
  "A request for this phone & serial already exists.",
  "This serial is already registered for this phone number.",
]);

// ------------------------------------
// Validation schema (Zod)
// (variantId required will be enforced in onSubmit based on selected product)
// ------------------------------------
const schema = z
  .object({
    name: z.string().trim().min(2, "Name is required"),
    email: z.string().trim().email("Enter a valid email"),
    phoneNumber: z
      .string()
      .trim()
      .refine(
        (v) => digits10(v).length === 10,
        "Enter a valid 10-digit phone number"
      ),
    productId: z.string().trim().min(1, "Product is required"),
    variantId: z.string().trim().optional(), // dynamically required if product has variants
    serialNumber: z.string().trim().min(3, "Serial number is required"),
    purchaseDate: z.date({ required_error: "Purchase date is required" }),
    purchasedFrom: z.enum(["kick", "daraz", "offline"], {
      required_error: "Purchased from is required",
    }),
    shopName: z.string().trim().optional(),
  })
  .superRefine((vals, ctx) => {
    if (vals.purchasedFrom === "offline" && !vals.shopName) {
      ctx.addIssue({
        path: ["shopName"],
        code: z.ZodIssueCode.custom,
        message: "Shop name is required for Others.",
      });
    }
  });

// ------------------------------------
// Component
// ------------------------------------
export default function OfflineRegisterClient() {
  const prefersReduced = useReducedMotion();

  // Animations
  const v = {
    container: {
      hidden: {},
      show: {
        transition: {
          staggerChildren: prefersReduced ? 0 : 0.06,
          delayChildren: prefersReduced ? 0 : 0.02,
        },
      },
    },
    headerDown: {
      hidden: {
        opacity: 0,
        y: prefersReduced ? 0 : -14,
        filter: prefersReduced ? "none" : "blur(4px)",
      },
      show: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.38, ease: "easeOut" },
      },
    },
    cardPop: {
      hidden: { opacity: 0, scale: prefersReduced ? 1 : 0.985 },
      show: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.28, ease: "easeOut" },
      },
    },
    fieldRise: {
      hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.28, ease: "easeOut" },
      },
    },
    previewZoom: {
      hidden: { opacity: 0, scale: prefersReduced ? 1 : 0.985 },
      show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
      exit: {
        opacity: 0,
        scale: prefersReduced ? 1 : 0.985,
        transition: { duration: 0.16 },
      },
    },
  };
  const hoverScale = prefersReduced
    ? {}
    : { whileHover: { scale: 1.01 }, whileTap: { scale: 0.99 } };

  // Form
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      productId: "",
      variantId: "",
      serialNumber: "",
      purchaseDate: undefined, // Date | undefined
      purchasedFrom: undefined, // "kick" | "daraz" | "offline"
      shopName: "",
    },
  });

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const purchasedFrom = form.watch("purchasedFrom");
  const selectedProductId = form.watch("productId");
  const selectedVariantId = form.watch("variantId");

  // File
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Load products (WITH variants, regardless of showInWebsite)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingProducts(true);
        const { data } = await axios.get(
          "/api/website/offline-registration/products?includeVariants=1",
          { withCredentials: true }
        );

        const arr = Array.isArray(data?.data) ? data.data : [];
        if (!cancelled) {
          setProducts(
            arr.map((p) => ({
              _id: String(p._id),
              name: p.name || "Unnamed",
              modelNumber: p.modelNumber || "",
              heroImage: p.heroImage || null,
              hasVariants: !!p.hasVariants,
              variants: Array.isArray(p.variants)
                ? p.variants.map((v) => ({
                    _id: String(v._id),
                    variantName: v.variantName || "Variant",
                    sku: v.sku || "",
                  }))
                : [],
            }))
          );
        }
      } catch (e) {
        if (!cancelled) {
          showToast(
            "error",
            e?.response?.data?.message || "Failed to load products"
          );
        }
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When product changes, clear variantId and force reselect if needed
  useEffect(() => {
    // Clear variant if current selected doesn't belong to this product
    form.setValue("variantId", "");
  }, [selectedProductId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      setPreviewUrl("");
      return;
    }
    if (!(f.type || "").startsWith("image/")) {
      showToast("warning", "Please choose an image file (PNG/JPG/WEBP).");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  // currently selected product (drives variant UI)
  const selectedProduct = useMemo(
    () => (products || []).find((p) => p._id === selectedProductId) || null,
    [products, selectedProductId]
  );
  const selectedHasVariants = !!(
    selectedProduct &&
    selectedProduct.variants &&
    selectedProduct.variants.length
  );

  const onSubmit = async (vals) => {
    if (!file) {
      showToast("warning", "Please upload the warranty card image.");
      return;
    }

    // Enforce variant selection if product has variants
    if (selectedHasVariants && !vals.variantId) {
      showToast("error", "Please choose a variant.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("name", vals.name);
      fd.append("email", vals.email);
      fd.append("phoneNumber", vals.phoneNumber);
      fd.append("productId", vals.productId);
      if (vals.variantId) fd.append("variantId", vals.variantId);
      fd.append("serialNumber", (vals.serialNumber || "").toUpperCase());
      fd.append("purchasedFrom", vals.purchasedFrom);
      fd.append(
        "shopName",
        vals.purchasedFrom === "offline" ? vals.shopName || "" : ""
      );
      fd.append("purchaseDate", vals.purchaseDate?.toISOString?.() || "");
      // send under BOTH names (API accepts either)
      fd.append("warrantyCard", file);
      fd.append("warrantyCardImage", file);

      const res = await axios.post("/api/website/offline-registration", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      const ok = !!res?.data?.success;
      const msg =
        res?.data?.message || (ok ? "Submitted!" : "Submission failed");
      showToast(
        ok ? "success" : DUP_MSGS.has(msg) ? "warning" : "error",
        ok ? "Thanks! We’ll review your registration shortly." : msg
      );

      if (ok) {
        form.reset();
        setFile(null);
        setPreviewUrl("");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not submit. Try again.";
      showToast(DUP_MSGS.has(msg) ? "warning" : "error", msg);
    }
  };

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 md:px-8">
        {/* Title */}
        <TitleCard
          title="Offline Warranty Registration"
          subtitle="Register your product purchased from Kick Lifestyle, Daraz, or other retail partners."
          badge="Warranty & Support"
          accent={PRIMARY}
          variant="solid"
          pattern="grid"
          align="left"
          size="md"
          className="text-black"
        />

        {/* Form Card */}
        <motion.section
          className="mt-8"
          variants={v.container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={v.cardPop}>
            <Card className="rounded-2xl">
              <CardHeader className="pb-0">
                <motion.h2
                  variants={v.headerDown}
                  className="text-lg font-medium"
                >
                  Your details
                </motion.h2>
              </CardHeader>
              <CardContent className="pt-4">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    {/* Row 1 */}
                    <motion.div
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      variants={v.container}
                    >
                      <motion.div variants={v.fieldRise}>
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Your full name"
                                  {...field}
                                />
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
                                <Input
                                  type="email"
                                  placeholder="you@example.com"
                                  {...field}
                                />
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
                                <Input
                                  type="tel"
                                  placeholder="98XXXXXXXX"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>

                      {/* Product with image dropdown */}
                      <motion.div variants={v.fieldRise}>
                        <FormField
                          control={form.control}
                          name="productId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value ?? ""}
                                  onValueChange={(val) => {
                                    field.onChange(val);
                                    // variant cleared in useEffect tied to selectedProductId
                                  }}
                                >
                                  <SelectTrigger className="h-11">
                                    {selectedProduct ? (
                                      <div className="flex items-center gap-2 truncate">
                                        <span className="relative h-6 w-6 rounded border bg-muted overflow-hidden shrink-0">
                                          {selectedProduct?.heroImage?.path ? (
                                            <Image
                                              src={
                                                selectedProduct.heroImage.path
                                              }
                                              alt={selectedProduct.name}
                                              fill
                                              sizes="24px"
                                              className="object-contain"
                                            />
                                          ) : null}
                                        </span>
                                        <span className="truncate">
                                          {selectedProduct.name}
                                        </span>
                                        {selectedProduct.modelNumber ? (
                                          <span className="ml-2 text-xs text-muted-foreground truncate">
                                            {selectedProduct.modelNumber}
                                          </span>
                                        ) : null}
                                        {selectedProduct.hasVariants ? (
                                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                            {selectedProduct.variants.length}{" "}
                                            variants
                                          </span>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <SelectValue
                                        placeholder={
                                          loadingProducts
                                            ? "Loading…"
                                            : "Select product"
                                        }
                                      />
                                    )}
                                  </SelectTrigger>

                                  <SelectContent className="max-h-80">
                                    {(products || []).map((p) => (
                                      <SelectItem key={p._id} value={p._id}>
                                        <div className="flex items-center gap-2">
                                          <span className="relative h-6 w-6 rounded border bg-muted overflow-hidden shrink-0">
                                            {p?.heroImage?.path ? (
                                              <Image
                                                src={p.heroImage.path}
                                                alt={p.name}
                                                fill
                                                sizes="24px"
                                                className="object-contain"
                                              />
                                            ) : null}
                                          </span>
                                          <span className="truncate">
                                            {p.name}
                                          </span>
                                          {p.modelNumber ? (
                                            <span className="ml-2 text-xs text-muted-foreground truncate">
                                              {p.modelNumber}
                                            </span>
                                          ) : null}
                                          {p.hasVariants ? (
                                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                              {p.variants.length} variants
                                            </span>
                                          ) : null}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>
                    </motion.div>

                    {/* Variant (only when selected product has variants) */}
                    <AnimatePresence initial={false} mode="wait">
                      {selectedHasVariants ? (
                        <motion.div
                          key="variantRow"
                          variants={v.fieldRise}
                          initial="hidden"
                          animate="show"
                          exit={{ opacity: 0, y: 8 }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          <FormField
                            control={form.control}
                            name="variantId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Variant</FormLabel>
                                <FormControl>
                                  <Select
                                    value={field.value ?? ""}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger className="h-11">
                                      <SelectValue placeholder="Select variant" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72">
                                      {(selectedProduct?.variants || []).map(
                                        (v) => (
                                          <SelectItem key={v._id} value={v._id}>
                                            <div className="flex items-center justify-between gap-2 w-full">
                                              <span className="truncate">
                                                {v.variantName}
                                              </span>
                                              {v.sku ? (
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                  {v.sku}
                                                </span>
                                              ) : null}
                                            </div>
                                          </SelectItem>
                                        )
                                      )}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    {/* Row 2 */}
                    <motion.div
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      variants={v.container}
                    >
                      {/* Purchase date (shadcn date picker) */}
                      <motion.div variants={v.fieldRise}>
                        <FormField
                          control={form.control}
                          name="purchaseDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Purchase date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={`justify-start text-left font-normal h-11 ${
                                      !field.value
                                        ? "text-muted-foreground"
                                        : ""
                                    }`}
                                    type="button"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value
                                      ? format(field.value, "PPP")
                                      : "Pick a date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    disabled={(date) => date > new Date()}
                                    toDate={new Date()}
                                    onSelect={(d) => {
                                      if (d && d <= new Date())
                                        field.onChange(d);
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>

                      {/* Serial number */}
                      <motion.div variants={v.fieldRise}>
                        <FormField
                          control={form.control}
                          name="serialNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Serial number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="E.g., KBS220053-XYZ"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(e.target.value.toUpperCase())
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>
                    </motion.div>

                    {/* Row 3 */}
                    <motion.div
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      variants={v.container}
                    >
                      {/* Purchased from */}
                      <motion.div variants={v.fieldRise}>
                        <FormField
                          control={form.control}
                          name="purchasedFrom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Purchased from</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value ?? ""}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select channel" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CHANNELS.map((c) => (
                                      <SelectItem key={c.value} value={c.value}>
                                        {c.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>

                      {/* Shop name (only when Others) */}
                      <AnimatePresence initial={false} mode="wait">
                        {purchasedFrom === "offline" ? (
                          <motion.div
                            key="shopName"
                            variants={v.fieldRise}
                            initial="hidden"
                            animate="show"
                            exit={{ opacity: 0, y: 8 }}
                          >
                            <FormField
                              control={form.control}
                              name="shopName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Shop name</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Shop / Retailer name"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </motion.div>
                        ) : (
                          <motion.div key="shopName-empty" />
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Warranty card image + Sample */}
                    <motion.div
                      variants={v.container}
                      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                      {/* Upload & preview */}
                      <motion.div variants={v.fieldRise}>
                        <FormLabel>Warranty card image</FormLabel>
                        <div className="mt-2 flex flex-col sm:flex-row gap-4 sm:items-center">
                          <label className="inline-flex items-center gap-3">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={onPickFile}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-muted-foreground hidden sm:block">
                              PNG/JPG/WEBP
                            </span>
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
                                <Image
                                  src={previewUrl}
                                  alt="Warranty card preview"
                                  fill
                                  sizes="160px"
                                  className="object-cover"
                                />
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                        <FormDescription className="mt-1">
                          Clear photo of your warranty card or invoice where the
                          serial is visible.
                        </FormDescription>
                      </motion.div>

                      {/* Sample shown inline */}
                      <motion.div
                        variants={v.fieldRise}
                        className="rounded-lg border p-3 bg-muted/30"
                      >
                        <div className="text-sm font-medium mb-2">
                          Sample (for reference)
                        </div>
                        <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden bg-white">
                          <Image
                            src="/assets/images/warranty.png"
                            alt="Warranty sample"
                            fill
                            sizes="(max-width: 1024px) 100vw, 480px"
                            className="object-contain"
                            priority={false}
                          />
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* Submit */}
                    <motion.div variants={v.fieldRise} className="pt-2">
                      <motion.div {...hoverScale}>
                        <Button
                          type="submit"
                          className="h-11 px-5"
                          style={{
                            backgroundColor: PRIMARY,
                            color: "#111",
                            borderColor: PRIMARY,
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {form.formState.isSubmitting
                            ? "Submitting…"
                            : "Submit registration"}
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
