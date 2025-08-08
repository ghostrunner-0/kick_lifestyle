"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import slugify from "slugify";

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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/application/ButtonLoading";
import MediaSelector from "@/components/application/admin/MediaSelector";
import { showToast } from "@/lib/ShowToast";
import useFetch from "@/hooks/useFetch";

// shadcn/ui select & switch
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
  { href: "", label: "Edit" },
];

// ✅ Include warrantyMonths in validation
const formSchema = zSchema.pick({
  _id: true,
  name: true,
  slug: true,
  shortDesc: true,
  category: true,
  mrp: true,
  specialPrice: true,
  warrantyMonths: true,   // <-- added
  productMedia: true,
  descImages: true,
  heroImage: true,
  additionalInfo: true,
  showInWebsite: true,
});

const EditProduct = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);

  // Fetch product
  const {
    data: productRes,
    isLoading: isLoadingProduct,
    isError: isErrorProduct,
  } = useFetch("product", id ? `/api/product/get/${id}` : null);

  // Fetch categories
  const {
    data: categoriesRes,
    isLoading: isLoadingCats,
    isError: isErrorCats,
  } = useFetch("categories", "/api/category/");

  const categories = Array.isArray(categoriesRes?.data)
    ? categoriesRes.data
    : Array.isArray(categoriesRes)
    ? categoriesRes
    : [];

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      _id: id,
      name: "",
      slug: "",
      shortDesc: "",
      category: "",
      mrp: "",
      specialPrice: "",
      warrantyMonths: "",         // <-- added
      productMedia: [],
      descImages: [],
      heroImage: undefined,
      additionalInfo: [{ label: "", value: "" }],
      showInWebsite: true,
    },
  });

  const { control, setValue, getValues, reset, watch } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "additionalInfo",
  });

  // Prefill when product arrives
  useEffect(() => {
    if (productRes?.success && productRes.data) {
      const p = productRes.data;

      const toImgObj = (x) =>
        x
          ? { _id: String(x._id), alt: x.alt || "", path: String(x.path) }
          : undefined;

      const toImgArray = (arr) =>
        Array.isArray(arr)
          ? arr.map((f) => ({
              _id: String(f._id),
              alt: f.alt || "",
              path: String(f.path),
            }))
          : [];

      const catId =
        (p.category && (p.category._id || p.category))
          ? String(p.category._id || p.category)
          : "";

      reset({
        _id: p._id,
        name: p.name || "",
        slug: p.slug || "",
        shortDesc: p.shortDesc || "",
        category: catId,
        mrp: p.mrp ?? "",
        specialPrice: p.specialPrice ?? "",
        warrantyMonths: p.warrantyMonths ?? "",   // <-- added
        heroImage: toImgObj(p.heroImage),
        productMedia: toImgArray(p.productMedia),
        descImages: toImgArray(p.descImages),
        additionalInfo:
          Array.isArray(p.additionalInfo) && p.additionalInfo.length
            ? p.additionalInfo.map((r) => ({
                label: r.label || "",
                value: r.value || "",
              }))
            : [{ label: "", value: "" }],
        showInWebsite:
          typeof p.showInWebsite === "boolean" ? p.showInWebsite : true,
      });
    }
  }, [productRes, reset]);

  // Auto-select first category if empty
  useEffect(() => {
    const current = getValues("category");
    if (!current && categories.length > 0) {
      setValue("category", String(categories[0]._id), { shouldValidate: true });
    }
  }, [categories, getValues, setValue]);

  // Slug auto from name
  useEffect(() => {
    const sub = watch((value, { name }) => {
      if (name === "name") {
        const s = value.name?.trim()
          ? slugify(value.name, { lower: true, strict: true })
          : "";
        setValue("slug", s);
      }
    });
    return () => sub.unsubscribe();
  }, [watch, setValue]);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);

      const payload = {
        ...values,
        category: String(values.category),
        mrp: values.mrp === "" ? undefined : Number(values.mrp),
        specialPrice:
          values.specialPrice === "" ? undefined : Number(values.specialPrice),
        warrantyMonths:
          values.warrantyMonths === "" ? undefined : Number(values.warrantyMonths), // <-- added
      };

      const { data: res } = await axios.put("/api/product/update", payload);
      if (!res?.success) throw new Error(res?.message || "Update failed");

      showToast("success", "Product updated successfully!");
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
          <h4 className="text-xl font-semibold mt-3">Edit Product</h4>
        </CardHeader>
        <CardContent className="pb-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              {/* Top bar: visibility */}
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Update product details, pricing, media and visibility.
                </div>

                <FormField
                  control={form.control}
                  name="showInWebsite"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormLabel className="m-0">Show on website</FormLabel>
                      <FormControl>
                        <Switch
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Name + Slug */}
              <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <Input
                          placeholder="Brief summary (max 300 chars)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category + Pricing (+ Warranty) */}
              <div className="mb-5 grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value || ""}
                          onValueChange={(val) => field.onChange(String(val))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                isLoadingCats ? "Loading..." : "Select category"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c._id} value={String(c._id)}>
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
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
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
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Optional"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ✅ Warranty Months */}
                <FormField
                  control={form.control}
                  name="warrantyMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warranty (months)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="e.g., 12"
                          {...field}
                        />
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
                        selectedMedia={field.value}
                        triggerLabel={
                          field.value ? "Change Hero Image" : "Select Hero Image"
                        }
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
                        triggerLabel={
                          field.value?.length
                            ? "Change Gallery"
                            : "Select Gallery"
                        }
                        onSelect={(selected) => {
                          if (!selected || !Array.isArray(selected))
                            return field.onChange([]);
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
                          if (!selected || !Array.isArray(selected))
                            return field.onChange([]);
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
                    <div
                      key={row.id}
                      className="grid grid-cols-12 gap-3 items-end"
                    >
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`additionalInfo.${idx}.label`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="Label (e.g., Color)"
                                  {...field}
                                />
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
                                <Input
                                  placeholder="Value (e.g., Black)"
                                  {...field}
                                />
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
                <ButtonLoading
                  type="submit"
                  text="Update Product"
                  loading={loading}
                  className="w-full"
                />
              </div>
            </form>
          </Form>

          {(isLoadingProduct || isLoadingCats) && (
            <p className="text-sm text-muted-foreground mt-2">Loading data…</p>
          )}
          {(isErrorProduct || isErrorCats) && (
            <p className="text-sm text-red-500 mt-2">
              Failed to fetch required data.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProduct;
