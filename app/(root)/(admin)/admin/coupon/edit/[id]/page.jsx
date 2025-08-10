"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";

import BreadCrumb from "@/components/application/admin/BreadCrumb";
import { ADMIN_DASHBOARD, ADMIN_Product_ALL } from "@/routes/AdminRoutes";
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
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { ThemeProvider } from "@mui/material";
import { useTheme } from "next-themes";
import { darkTheme, lightTheme } from "@/lib/MaterialTheme";

/* ---------------- Zod ---------------- */
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const couponZod = z.object({
  _id: objectId.optional(),
  code: z.string().trim().min(1, "Code is required").transform((v) => v.toUpperCase()),
  discountType: z.enum(["percentage", "fixed"]),
  discountAmount: z.coerce.number().min(0, "Discount cannot be negative"),
  individualUse: z.coerce.boolean().default(false),

  freeItem: z.object({
    variant: z.union([objectId, z.literal("none")]).optional().default("none"),
    qty: z.coerce.number().min(1).optional().default(1),
  }).optional().default({ variant: "none", qty: 1 }),

  specificProducts: z.array(objectId).optional().default([]),
  specificVariants: z.array(objectId).optional().default([]),

  perUserLimit: z.coerce.number().min(0).optional().default(0),
  totalLimit: z.coerce.number().min(0).optional().default(0),

  changeAfterUsage: z.coerce.number().min(0).optional().default(0),
  newDiscountType: z.union([z.enum(["percentage", "fixed"]), z.literal("none")]).optional().default("none"),
  newDiscountAmount: z.union([z.coerce.number().min(0), z.literal("none")]).optional().default("none"),
})
.refine((v) => {
  if (v.newDiscountType !== "none") {
    return typeof v.newDiscountAmount === "number" && v.newDiscountAmount >= 0;
  }
  return true;
}, { path: ["newDiscountAmount"], message: "Provide an amount for the new discount type" })
.transform((v) => ({
  ...v,
  freeItem: {
    variant: v.freeItem?.variant === "none" ? null : v.freeItem?.variant || null,
    qty: v.freeItem?.qty ?? 1,
  },
  newDiscountType: v.newDiscountType === "none" ? null : v.newDiscountType,
  newDiscountAmount: v.newDiscountAmount === "none" ? null : v.newDiscountAmount,
}));

/* ---------------- Helpers ---------------- */
const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_Product_ALL, label: "Coupons" },
  { href: "", label: "Edit" },
];

const toUiFromDb = (c) => ({
  ...c,
  freeItem: {
    variant: c?.freeItem?.variant ? String(c.freeItem.variant) : "none",
    qty: c?.freeItem?.qty ?? 1,
  },
  newDiscountType: c?.newDiscountType ?? "none",
  newDiscountAmount: c?.newDiscountAmount ?? "none",
  specificProducts: Array.isArray(c?.specificProducts) ? c.specificProducts.map(String) : [],
  specificVariants: Array.isArray(c?.specificVariants) ? c.specificVariants.map(String) : [],
  individualUse: !!c?.individualUse,
  perUserLimit: c?.perUserLimit ?? 0,
  totalLimit: c?.totalLimit ?? 0,
  changeAfterUsage: c?.changeAfterUsage ?? 0,
});

const defaultValues = {
  _id: "",
  code: "",
  discountType: "percentage",
  discountAmount: 0,
  individualUse: true,
  freeItem: { variant: "none", qty: 1 },
  specificProducts: [],
  specificVariants: [],
  perUserLimit: 0,
  totalLimit: 0,
  changeAfterUsage: 0,
  newDiscountType: "none",
  newDiscountAmount: "none",
};

/* ---------------- Component ---------------- */
export default function EditCoupon() {
  const params = useParams(); // { id: '...' }
  const id = params?.id;

  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? darkTheme : lightTheme;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCoupon, setLoadingCoupon] = useState(true);

  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);

  useEffect(() => setMounted(true), []);

  const form = useForm({
    resolver: zodResolver(couponZod),
    defaultValues,
    mode: "onChange",
  });

  // Fetch products & variants
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

  // Fetch coupon details
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoadingCoupon(true);
      try {
        const { data } = await axios.get(`/api/coupons/get/${id}`);
        if (!data?.success || !data?.data) throw new Error("Failed to fetch coupon");
        const ui = toUiFromDb(data.data);
        form.reset({ ...defaultValues, _id: String(ui._id || id), ...ui });
      } catch (err) {
        showToast("error", err?.response?.data?.message || err.message || "Failed to fetch coupon");
      } finally {
        setLoadingCoupon(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const selectedProducts = useMemo(
    () => products.filter((p) => (form.getValues("specificProducts") || []).includes(p._id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, form.watch("specificProducts")]
  );

  const selectedVariants = useMemo(
    () => variants.filter((v) => (form.getValues("specificVariants") || []).includes(v._id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variants, form.watch("specificVariants")]
  );

  const onSubmit = async (values) => {
    try {
      setLoading(true);
      const { data } = await axios.put(`/api/coupons/update`, values);
      if (!data?.success) throw new Error(data?.message || "Failed to update coupon");
      showToast("success", "Coupon updated!");
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
              <h4 className="text-xl font-semibold mt-3">Edit Coupon</h4>

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
                          value={selectedProducts}
                          onChange={(_, newValue) => field.onChange(newValue.map((p) => p._id))}
                          isOptionEqualToValue={(opt, val) => opt._id === (val?._id ?? val)}
                          getOptionLabel={(option) => option.name || option._id}
                          renderInput={(params) => <TextField {...params} placeholder="Select products" />}
                          disableCloseOnSelect
                          loading={loadingCoupon}
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
                          value={selectedVariants}
                          onChange={(_, newValue) => field.onChange(newValue.map((v) => v._id))}
                          isOptionEqualToValue={(opt, val) => opt._id === (val?._id ?? val)}
                          getOptionLabel={(option) => option.variantName || option._id}
                          renderInput={(params) => <TextField {...params} placeholder="Select variants" />}
                          disableCloseOnSelect
                          loading={loadingCoupon}
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
                                  value={typeof field.value === "number" ? field.value : ""}
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
                  <ButtonLoading
                    type="submit"
                    text="Update Coupon"
                    loading={loading || loadingCoupon}
                    className="w-full"
                  />
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </ThemeProvider>
  );
}
