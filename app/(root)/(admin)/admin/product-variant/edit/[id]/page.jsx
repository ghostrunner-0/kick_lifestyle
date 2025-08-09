"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";

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

// shadcn/ui select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------- Local zod schema (variant edit) ----------
const imageObject = z.object({
  _id: z.string().min(1, "_id is required"),
  alt: z.string().optional(),
  path: z.string().min(1, "Image path is required"),
});

const variantSchema = z
  .object({
    product: z.string().min(1, "Product is required"),
    variantName: z.string().trim().min(1, "Variant name is required"),
    mrp: z.coerce.number().positive("MRP must be > 0"),
    specialPrice: z.coerce.number().positive().optional(),
    sku: z.string().trim().min(1, "SKU is required"),
    productGallery: z
      .array(imageObject)
      .min(1, "At least one gallery image is required"),
    swatchImage: imageObject.optional(),
  })
  .refine((v) => v.specialPrice == null || v.specialPrice <= v.mrp, {
    path: ["specialPrice"],
    message: "Special price must be less than or equal to MRP",
  });
// ----------------------------------------------------

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_Product_ALL, label: "Products" },
  { href: "", label: "Edit Variant" },
];

export default function EditProductVariant() {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingFetch, setLoadingFetch] = useState(true);
  const [products, setProducts] = useState([]);

  const form = useForm({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      product: "",
      variantName: "",
      mrp: "",
      specialPrice: "",
      sku: "",
      productGallery: [],
      swatchImage: undefined,
    },
  });

  // Fetch products + existing variant
  useEffect(() => {
    (async () => {
      try {
        // Load product list
        const { data } = await axios.get(
          "/api/product?start=0&size=1000&deleType=SD"
        );
        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        setProducts(list.map((p) => ({ _id: p._id, name: p.name })));
      } catch {
        showToast("error", "Failed to load products");
      }

      try {
        // Load variant details
        if (!id) return;
        const { data: res } = await axios.get(`/api/product-variant/get/${id}`);
        if (!res?.success)
          throw new Error(res?.message || "Failed to fetch variant");

        const v = res.data;

        const toImg = (x) =>
          x ? { _id: String(x._id), alt: x.alt || "", path: String(x.path) } : undefined;

        const toImgArr = (arr) =>
          Array.isArray(arr)
            ? arr.map((f) => ({
                _id: String(f._id),
                alt: f.alt || "",
                path: String(f.path),
              }))
            : [];

        form.reset({
          product: String(v.product?._id || v.product),
          variantName: v.variantName || "",
          mrp: v.mrp ?? "",
          specialPrice: v.specialPrice ?? "",
          sku: v.sku || "",
          productGallery: toImgArr(v.productGallery),
          swatchImage: toImg(v.swatchImage),
        });
      } catch (err) {
        showToast("error", err?.message || "Failed to load variant");
      } finally {
        setLoadingFetch(false);
      }
    })();
  }, [id, form]);

  const onSubmit = async (values) => {
    try {
      setLoading(true);

      const payload = {
        _id: id,
        ...values,
        mrp: Number(values.mrp),
        specialPrice:
          values.specialPrice === "" ? undefined : Number(values.specialPrice),
      };

      const { data: res } = await axios.put(
        "/api/product-variant/update",
        payload
      );
      if (!res?.success)
        throw new Error(res?.message || "Failed to update variant");

      showToast("success", "Variant updated!");
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
          <h4 className="text-xl font-semibold mt-3">Edit Product Variant</h4>
        </CardHeader>

        <CardContent className="pb-5">
          {loadingFetch ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                {/* Product + Variant Name */}
                <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="product"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p._id} value={p._id}>
                                  {p.name}
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
                    name="variantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Variant Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Black / Blue / Green"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pricing + SKU */}
                <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="SKU (unique)"
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(e.target.value.toUpperCase())
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Product Gallery */}
                <div className="mb-5">
                  <FormField
                    control={form.control}
                    name="productGallery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Gallery</FormLabel>
                        <MediaSelector
                          multiple
                          selectedMedia={field.value}
                          triggerLabel={
                            field.value?.length
                              ? "Change Gallery"
                              : "Select Gallery"
                          }
                          onSelect={(selected) => {
                            if (!selected || !Array.isArray(selected)) {
                              field.onChange([]);
                              return;
                            }
                            const imgs = selected.map((f) => ({
                              _id: f._id,
                              alt: f.alt || "",
                              path: f.path,
                            }));
                            field.onChange(imgs);
                          }}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Swatch Image */}
                <div className="mb-8">
                  <FormField
                    control={form.control}
                    name="swatchImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Swatch Image (optional)</FormLabel>
                        <MediaSelector
                          multiple={false}
                          selectedMedia={field.value}
                          triggerLabel={
                            field.value ? "Change Swatch" : "Select Swatch"
                          }
                          onSelect={(selected) => {
                            if (!selected) {
                              field.onChange(undefined);
                              return;
                            }
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

                {/* Submit */}
                <ButtonLoading
                  type="submit"
                  text="Update Variant"
                  loading={loading}
                  className="w-full"
                />
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
