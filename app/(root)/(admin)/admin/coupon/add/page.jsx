"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import BreadCrumb from "@/components/application/admin/BreadCrumb";
import { ADMIN_DASHBOARD, ADMIN_Product_ALL } from "@/routes/AdminRoutes"; // change to your coupons list if needed
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/application/ButtonLoading";
import { showToast } from "@/lib/ShowToast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// shadcn accordion for Advanced sections
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

// MUI (with dark mode support)
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { ThemeProvider } from "@mui/material";
import { useTheme } from "next-themes";
import { darkTheme, lightTheme } from "@/lib/MaterialTheme";

/* ---------------- Zod (local, aligned with your model) ---------------- */
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const couponZod = z.object({
  code: z.string().trim().min(1, "Code is required").transform((v) => v.toUpperCase()),
  discountType: z.enum(["percentage", "fixed"]),
  discountAmount: z.coerce.number().min(0, "Discount cannot be negative"),
  individualUse: z.coerce.boolean().default(false),

  // Advanced: free item (nullable in DB, use "none" sentinel in UI)
  freeItem: z.object({
    variant: z.union([objectId, z.literal("none")]).optional().default("none"),
    qty: z.coerce.number().min(1).optional().default(1),
  }).optional().default({ variant: "none", qty: 1 }),

  // Applicability (multiple)
  specificProducts: z.array(objectId).optional().default([]),
  specificVariants: z.array(objectId).optional().default([]),

  // Limits
  perUserLimit: z.coerce.number().min(0).optional().default(0),
  totalLimit: z.coerce.number().min(0).optional().default(0),

  // System field (we’ll not render an input; server defaults to 0)
  // redemptionsTotal: z.coerce.number().min(0).optional().default(0),

  // Advanced: switch discount after usage
  changeAfterUsage: z.coerce.number().min(0).optional().default(0),
  newDiscountType: z.union([z.enum(["percentage", "fixed"]), z.literal("none")]).optional().default("none"),
  newDiscountAmount: z.union([z.coerce.number().min(0), z.literal("none")]).optional().default("none"),
})
.refine((v) => {
  // If newDiscountType is set (not "none"), newDiscountAmount must be a number > 0
  if (v.newDiscountType !== "none") {
    return typeof v.newDiscountAmount === "number" && v.newDiscountAmount >= 0;
  }
  return true;
}, { path: ["newDiscountAmount"], message: "Provide an amount for the new discount type" })
.transform((v) => {
  // Normalize sentinels to DB shape
  return {
    ...v,
    freeItem: {
      variant: v.freeItem?.variant === "none" ? null : v.freeItem?.variant || null,
      qty: v.freeItem?.qty ?? 1,
    },
    newDiscountType: v.newDiscountType === "none" ? null : v.newDiscountType,
    newDiscountAmount: v.newDiscountAmount === "none" ? null : v.newDiscountAmount,
  };
});

/* ---------------- UI ---------------- */

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_Product_ALL, label: "Coupons" }, // swap this to your coupons index route if different
  { href: "", label: "Add" },
];

const defaultValues = {
  code: "",
  discountType: "percentage",
  discountAmount: 0,
  individualUse: true,

  freeItem: { variant: "none", qty: 1 }, // advanced

  specificProducts: [],
  specificVariants: [],

  perUserLimit: 0,
  totalLimit: 0,

  changeAfterUsage: 0, // advanced
  newDiscountType: "none",
  newDiscountAmount: "none",
};

export default function AddCoupon() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const theme = resolvedTheme === "dark" ? darkTheme : lightTheme;

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]); // [{_id,name}]
  const [variants, setVariants] = useState([]); // [{_id,variantName}]

  useEffect(() => setMounted(true), []);

  const form = useForm({
    resolver: zodResolver(couponZod),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    (async () => {
      try {
        const [productsRes, variantsRes] = await Promise.all([
          axios.get("/api/product?start=0&size=1000&deleType=SD"),
          axios.get("/api/product-variant?start=0&size=1000&deleType=SD"),
        ]);

        const productRows = Array.isArray(productsRes?.data?.data) ? productsRes.data.data : [];
        const variantRows = Array.isArray(variantsRes?.data?.data) ? variantsRes.data.data : [];

        setProducts(productRows.map((p) => ({ _id: String(p._id), name: p.name })));
        setVariants(
          variantRows.map((v) => ({
            _id: String(v._id),
            variantName: v.variantName || v.name || v._id,
          }))
        );
      } catch {
        showToast("error", "Failed to load products or variants");
      }
    })();
  }, []);

  const onSubmit = async (values) => {
    try {
      setLoading(true);
      const { data } = await axios.post("/api/coupons/create", values); // adjust endpoint if needed
      if (!data?.success) throw new Error(data?.message || "Failed to create coupon");
      showToast("success", "Coupon created!");
      form.reset(defaultValues);
    } catch (err) {
      showToast("error", err?.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <ThemeProvider theme={theme}>
      <div>
        <BreadCrumb BreadCrumbData={BreadCrumbData} />

        <Card className="py-0 rounded shadow-sm">
          <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-semibold mt-3">Add Coupon</h4>

              {/* Top bar: Individual Use */}
              <Form {...form}>
                <form>
                  <FormField
                    control={form.control}
                    name="individualUse"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <FormLabel className="m-0">Individual Use</FormLabel>
                        <FormControl>
                          <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
          </CardHeader>

          <CardContent className="pb-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                {/* Code + Discount Type + Amount */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coupon Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="COUPON2025"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            style={{ textTransform: "uppercase" }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Type</FormLabel>
                        <FormControl>
                          <Select value={field.value ?? "percentage"} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discountAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Applicability: products + variants */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="specificProducts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specific Products</FormLabel>
                        <Autocomplete
                          multiple
                          options={products}
                          value={products.filter((p) => (field.value || []).includes(p._id))}
                          onChange={(_, newValue) => field.onChange(newValue.map((p) => p._id))}
                          isOptionEqualToValue={(opt, val) => opt._id === val._id}
                          getOptionLabel={(option) => option.name || option._id}
                          renderInput={(params) => <TextField {...params} placeholder="Select products" />}
                          disableCloseOnSelect
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specificVariants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specific Variants</FormLabel>
                        <Autocomplete
                          multiple
                          options={variants}
                          value={variants.filter((v) => (field.value || []).includes(v._id))}
                          onChange={(_, newValue) => field.onChange(newValue.map((v) => v._id))}
                          isOptionEqualToValue={(opt, val) => opt._id === val._id}
                          getOptionLabel={(option) => option.variantName || option._id}
                          renderInput={(params) => <TextField {...params} placeholder="Select variants" />}
                          disableCloseOnSelect
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Limits */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="perUserLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Per User Limit (0 = unlimited)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Limit (0 = unlimited)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Advanced (collapsible) */}
                <Accordion type="single" collapsible className="mb-6">
                  {/* Free Item */}
                  <AccordionItem value="free-item">
                    <AccordionTrigger>Advanced: Free Item</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="freeItem.variant"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Variant</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value ?? "none"}
                                  onValueChange={(val) => field.onChange(val)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select variant" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {variants.map((v) => (
                                      <SelectItem key={v._id} value={v._id}>
                                        {v.variantName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="freeItem.qty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  step="1"
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value === "" ? 1 : Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Switch Discount After Usage */}
                  <AccordionItem value="switch-discount">
                    <AccordionTrigger>Advanced: Switch Discount After Usage</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="changeAfterUsage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Change After Usage</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="newDiscountType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Discount Type</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value ?? "none"}
                                  onValueChange={(val) => field.onChange(val)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select new type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="percentage">Percentage</SelectItem>
                                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="newDiscountAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Discount Amount</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  value={
                                    typeof field.value === "number"
                                      ? field.value
                                      : "" // show blank when "none"
                                  }
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    field.onChange(v === "" ? "none" : Number(v));
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Submit */}
                <div className="mb-5">
                  <ButtonLoading type="submit" text="Create Coupon" loading={loading} className="w-full" />
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </ThemeProvider>
  );
}
