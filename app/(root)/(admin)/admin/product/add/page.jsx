"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import MediaSelector from "@/components/application/admin/MediaSelector";
import ButtonLoading from "@/components/application/ButtonLoading";
import { showToast } from "@/lib/ShowToast";

// shadcn/ui select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// shadcn/ui switch
import { Switch } from "@/components/ui/switch";

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_Product_ALL, label: "Products" },
  { href: "", label: "Add" },
];

// NOTE: zSchema must have `showInWebsite` as a boolean.
const formSchema = zSchema.pick({
  name: true,
  slug: true,
  shortDesc: true,
  category: true,
  mrp: true,
  specialPrice: true,
  productMedia: true, // array of image objects
  descImages: true,   // array of image objects
  heroImage: true,    // image object
  additionalInfo: true,
  showInWebsite: true, // <-- new
});

export default function AddProduct() {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      shortDesc: "",
      category: "",
      mrp: "",
      specialPrice: "",
      productMedia: [],     // [{_id, alt, path}]
      descImages: [],       // [{_id, alt, path}]
      heroImage: undefined, // {_id, alt, path}
      additionalInfo: [{ label: "", value: "" }],
      showInWebsite: true,
    },
  });

  const { control } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "additionalInfo",
  });

  // Fetch categories (adjust endpoint if needed)
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

  // Auto-generate slug from name
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

  const onSubmit = async (values) => {
    try {
      setLoading(true);

      // Coerce number fields (inputs return strings)
      const payload = {
        ...values,
        mrp: values.mrp === "" ? undefined : Number(values.mrp),
        specialPrice:
          values.specialPrice === "" ? undefined : Number(values.specialPrice),
      };

      const { data: res } = await axios.post("/api/product/create", payload);
      if (!res?.success) throw new Error(res?.message || "Failed to create product");

      showToast("success", "Product created!");
      form.reset({ showInWebsite: true });
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
              {/* Top bar: visibility toggle */}
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Configure core details and media below.
                </div>

                <FormField
                  control={form.control}
                  name="showInWebsite"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormLabel className="m-0">Show on website</FormLabel>
                      <FormControl>
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      </FormControl>
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
                        <Input placeholder="Brief summary (max 300 chars)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category + Pricing */}
              <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category (shadcn/ui Select) */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Hero Image (single) */}
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
                          if (!selected) {
                            field.onChange(undefined);
                            return;
                          }
                          const img = { _id: selected._id, alt: selected.alt || "", path: selected.path };
                          field.onChange(img);
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Product Media (multiple) */}
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

              {/* Description Images (multiple) */}
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
                          field.value?.length ? "Change Description Images" : "Select Description Images"
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

              {/* Additional Info (table-like) */}
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
