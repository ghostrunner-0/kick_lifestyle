"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import slugify from "slugify";
import { z } from "zod";

import { zSchema } from "@/lib/zodSchema";
import BreadCrumb from "@/components/application/admin/BreadCrumb";
import { ADMIN_DASHBOARD, ADMIN_Product_ALL } from "@/routes/AdminRoutes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import MediaSelector from "@/components/application/admin/MediaSelector";
import ButtonLoading from "@/components/application/ButtonLoading";
import { showToast } from "@/lib/ShowToast";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_Product_ALL, label: "Products" },
  { href: "", label: "Add" },
];

/** ---------- Schema ----------
 * We take your base zSchema and:
 * - make specialPrice optional
 * - add hasVariants (boolean)
 * - add stock (number, required when hasVariants=false)
 */
const basePick = zSchema.pick({
  name: true,
  slug: true,
  shortDesc: true,
  category: true,
  mrp: true,
  // NOTE: we'll re-define specialPrice to be optional below
  warrantyMonths: true,
  productMedia: true,
  descImages: true,
  heroImage: true,
  additionalInfo: true,
  showInWebsite: true,
});

const formSchema = basePick
  .extend({
    modelNumber: z.string().trim().min(1, "Model number is required"),
    hasVariants: z.boolean().default(false),
    // specialPrice optional (accept string or number; empty string => handled in submit)
    specialPrice: z.union([z.string(), z.number()]).optional(),
    // stock only used when hasVariants=false (we validate in superRefine)
    stock: z.union([z.string(), z.number()]).optional(),
  })
  .superRefine((vals, ctx) => {
    // If product has NO variants, require a non-negative stock number
    if (!vals.hasVariants) {
      const s = vals.stock;
      const n = Number(s);
      if (s === undefined || s === "" || Number.isNaN(n) || n < 0) {
        ctx.addIssue({
          path: ["stock"],
          code: z.ZodIssueCode.custom,
          message: "Stock is required and must be 0 or greater.",
        });
      }
    }
    // If specialPrice provided, it must be <= mrp and >= 0
    if (vals.specialPrice !== undefined && vals.specialPrice !== "") {
      const sp = Number(vals.specialPrice);
      const mrp = Number(vals.mrp);
      if (Number.isNaN(sp) || sp < 0) {
        ctx.addIssue({
          path: ["specialPrice"],
          code: z.ZodIssueCode.custom,
          message: "Special price must be a valid non-negative number.",
        });
      } else if (!Number.isNaN(mrp) && sp > mrp) {
        ctx.addIssue({
          path: ["specialPrice"],
          code: z.ZodIssueCode.custom,
          message: "Special price cannot be greater than MRP.",
        });
      }
    }
  });

export default function AddProduct() {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      modelNumber: "",
      shortDesc: "",
      category: "",
      mrp: "",
      specialPrice: "", // optional
      hasVariants: false, // 🔹 default: no variants, allow direct stock entry
      stock: "0", // 🔹 visible when hasVariants=false
      warrantyMonths: "",
      productMedia: [],
      descImages: [],
      heroImage: undefined,
      additionalInfo: [{ label: "", value: "" }],
      showInWebsite: true,
    },
  });

  const { control, watch, setValue } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "additionalInfo",
  });

  const hasVariants = watch("hasVariants");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/category/");
        const items = Array.isArray(data?.data) ? data.data : data;
        setCategories(items || []);
      } catch {
        showToast("error", "Failed to load categories");
      }
    })();
  }, []);

  useEffect(() => {
    const sub = form.watch((value, { name }) => {
      if (name === "name") {
        const s = value.name?.trim()
          ? slugify(value.name, { lower: true, strict: true })
          : "";
        form.setValue("slug", s);
      }
    });
    return () => sub.unsubscribe();
  }, [form]);

  // If toggling hasVariants ON, disable stock entry (UI) and keep value but ignore on submit
  useEffect(() => {
    if (hasVariants) {
      // optional UX: grey out stock by keeping it but not required
      // setValue("stock", "");
    } else if (watch("stock") === "" || watch("stock") === undefined) {
      setValue("stock", "0");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasVariants]);

  const onSubmit = async (values) => {
    try {
      setLoading(true);

      // Extra runtime checks (in addition to zod) for friendly toasts
      if (values.specialPrice !== "" && values.specialPrice !== undefined) {
        const sp = Number(values.specialPrice);
        const mrp = Number(values.mrp);
        if (sp > mrp) {
          showToast("warning", "Special price cannot be greater than MRP.");
          setLoading(false);
          return;
        }
      }

      const payload = {
        ...values,
        modelNumber: values.modelNumber.trim(),
        mrp: values.mrp === "" ? undefined : Number(values.mrp),
        // ✅ optional specialPrice (omit if empty)
        specialPrice:
          values.specialPrice === "" || values.specialPrice === undefined
            ? undefined
            : Number(values.specialPrice),
        warrantyMonths:
          values.warrantyMonths === "" ? 0 : Number(values.warrantyMonths),
        hasVariants: !!values.hasVariants,
        // ✅ stock: only send when hasVariants=false; backend will auto-sum when true
        stock:
          values.hasVariants
            ? undefined
            : Number(values.stock === "" ? 0 : values.stock),
      };

      const { data: res } = await axios.post("/api/product/create", payload);
      if (!res?.success) throw new Error(res?.message || "Failed to create product");

      showToast("success", "Product created!");
      form.reset({
        name: "",
        slug: "",
        modelNumber: "",
        shortDesc: "",
        category: "",
        mrp: "",
        specialPrice: "",
        hasVariants: false,
        stock: "0",
        warrantyMonths: "",
        productMedia: [],
        descImages: [],
        heroImage: undefined,
        additionalInfo: [{ label: "", value: "" }],
        showInWebsite: true,
      });
    } catch (err) {
      showToast("error", err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-semibold mt-3">Add Product</h4>
          </div>
        </CardHeader>
        <CardContent className="pb-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Top bar: visibility + hasVariants */}
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="showInWebsite"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
                      <div>
                        <FormLabel className="m-0">Show on website</FormLabel>
                        <FormDescription>Make this product visible on your storefront.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasVariants"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
                      <div>
                        <FormLabel className="m-0">This product has variants</FormLabel>
                        <FormDescription>
                          If enabled, total stock will be calculated from variant stocks.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Name + Slug + Model Number */}
              <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Product Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="product-slug" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modelNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., PBX-1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Short Desc */}
              <div className="mb-5">
                <FormField
                  control={form.control}
                  name="shortDesc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief summary (max 300 chars)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category + Pricing + Warranty (+ Stock) */}
              <div className="mb-5 grid grid-cols-1 md:grid-cols-5 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c._id} value={c._id}>
                                {c.name}
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
                  name="mrp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MRP</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Optional" {...field} />
                      </FormControl>
                      <FormDescription>Leave blank if there is no discount.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Stock (only meaningful when hasVariants = false) */}
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder={hasVariants ? "Calculated from variants" : "0"}
                          disabled={hasVariants}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {hasVariants
                          ? "This value is auto-calculated from variant stocks."
                          : "Total available quantity for this product."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="warrantyMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warranty (months)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="1" placeholder="e.g., 12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Hero Image */}
              <div className="mb-5">
                <FormField
                  control={form.control}
                  name="heroImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hero Image</FormLabel>
                      <MediaSelector
                        multiple={false}
                        triggerLabel={field.value ? "Change Hero Image" : "Select Hero Image"}
                        onSelect={(selected) => {
                          if (!selected) return field.onChange(undefined);
                          field.onChange({
                            _id: selected._id,
                            alt: selected.alt || "",
                            path: selected.path,
                          });
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Product Media */}
              <div className="mb-5">
                <FormField
                  control={form.control}
                  name="productMedia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Media (Gallery)</FormLabel>
                      <MediaSelector
                        multiple
                        selectedMedia={field.value}
                        triggerLabel={field.value?.length ? "Change Gallery" : "Select Gallery"}
                        onSelect={(selected) => {
                          if (!selected || !Array.isArray(selected)) return field.onChange([]);
                          field.onChange(
                            selected.map((f) => ({
                              _id: f._id,
                              alt: f.alt || "",
                              path: f.path,
                            }))
                          );
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description Images */}
              <div className="mb-5">
                <FormField
                  control={form.control}
                  name="descImages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description Images</FormLabel>
                      <MediaSelector
                        multiple
                        selectedMedia={field.value}
                        triggerLabel={
                          field.value?.length
                            ? "Change Description Images"
                            : "Select Description Images"
                        }
                        onSelect={(selected) => {
                          if (!selected || !Array.isArray(selected)) return field.onChange([]);
                          field.onChange(
                            selected.map((f) => ({
                              _id: f._id,
                              alt: f.alt || "",
                              path: f.path,
                            }))
                          );
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Info */}
              <div className="mb-6">
                <FormLabel>Additional Info</FormLabel>
                <div className="mt-2 space-y-3">
                  {fields.map((row, idx) => (
                    <div key={row.id} className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`additionalInfo.${idx}.label`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Label (e.g., Color)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`additionalInfo.${idx}.value`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Value (e.g., Black)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2 flex gap-2">
                        <ButtonLoading
                          type="button"
                          text="+"
                          loading={false}
                          onClick={() => append({ label: "", value: "" })}
                        />
                        <ButtonLoading
                          type="button"
                          text="−"
                          loading={false}
                          onClick={() => remove(idx)}
                          disabled={fields.length === 1}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="mb-5">
                <ButtonLoading type="submit" text="Create Product" loading={loading} className="w-full" />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
