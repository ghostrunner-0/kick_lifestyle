"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { zSchema } from "@/lib/zodSchema";
import { useParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";

import BreadCrumb from "@/components/application/admin/BreadCrumb";
import { ADMIN_CATEGORY_ALL, ADMIN_DASHBOARD } from "@/routes/AdminRoutes";
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
import slugify from "slugify";
import useFetch from "@/hooks/useFetch";

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_ALL, label: "Category" },
  { href: "", label: "Edit" },
];

/* --------- Zod: add optional banner (same shape as image) --------- */
const bannerSchema =
  zSchema.shape?.image ??
  z.object({
    _id: z.string(),
    alt: z.string().optional().default(""),
    path: z.string(),
  });

const formSchema = zSchema
  .pick({
    _id: true,
    name: true,
    slug: true,
    image: true,
  })
  .extend({
    banner: bannerSchema.optional(),                 // <-- NEW
    showInWebsite: z.boolean().optional().default(false),
  });

const EditCategory = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);

  const {
    data: categoryData,
    isLoading,
    isError,
  } = useFetch("category", id ? `/api/category/get/${id}` : null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      _id: id,
      name: "",
      slug: "",
      image: undefined,
      banner: undefined, // <-- NEW
      showInWebsite: false,
    },
  });

  // Pre-fill form when categoryData is available
  useEffect(() => {
    if (categoryData?.success) {
      const { _id, name, slug, image, banner, showOnWebsite } = categoryData.data;
      form.reset({
        _id,
        name,
        slug,
        image: image || undefined,
        banner: banner || undefined, // <-- NEW
        showInWebsite: typeof showOnWebsite === "boolean" ? showOnWebsite : false,
      });
    }
  }, [categoryData, form]);

  // Slug sync on name change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "name") {
        const newName = value.name || "";
        const slugified = newName.trim()
          ? slugify(newName, { lower: true, strict: true })
          : "";
        form.setValue("slug", slugified);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleCategoryFormSubmit = async (values) => {
    try {
      setLoading(true);
      const { data: response } = await axios.put("/api/category/update", values);
      if (!response.success) throw new Error(response.message);
      showToast("success", "Category updated successfully!");
    } catch (error) {
      showToast("error", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const sanitizeMedia = (file) =>
    file
      ? {
          _id: file._id,
          alt: file.alt || "",
          path: file.path,
        }
      : undefined;

  return (
    <div>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
          <h4 className="text-xl font-semibold mt-3">Edit Category</h4>
        </CardHeader>
        <CardContent className="pb-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCategoryFormSubmit)}>
              {/* Name */}
              <div className="mb-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Category Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Slug */}
              <div className="mb-5">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="category-slug" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Show on website switch */}
              <div className="mb-5">
                <FormField
                  control={form.control}
                  name="showInWebsite"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormLabel className="m-0">Show on website</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value === true}
                          onCheckedChange={(checked) => field.onChange(checked)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Category Image (required) */}
              <div className="mb-5">
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Image</FormLabel>
                      <MediaSelector
                        multiple={false}
                        selectedMedia={field.value}
                        triggerLabel={field.value ? "Change Image" : "Select Image"}
                        onSelect={(selected) => {
                          if (Array.isArray(selected) && selected.length > 0) {
                            field.onChange(sanitizeMedia(selected[0]));
                          } else if (selected) {
                            field.onChange(sanitizeMedia(selected));
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category Banner (optional) */}
              <div className="mb-5">
                <FormField
                  control={form.control}
                  name="banner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Banner (optional)</FormLabel>
                      <MediaSelector
                        multiple={false}
                        selectedMedia={field.value}
                        triggerLabel={field.value ? "Change Banner" : "Select Banner"}
                        onSelect={(selected) => {
                          if (Array.isArray(selected) && selected.length > 0) {
                            field.onChange(sanitizeMedia(selected[0]));
                          } else if (selected) {
                            field.onChange(sanitizeMedia(selected));
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Recommended ratio: <span className="font-medium">~4:1</span> (e.g. 1600×400).
                        </p>
                        {field.value ? (
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => field.onChange(undefined)}
                          >
                            Remove banner
                          </button>
                        ) : null}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit */}
              <div className="mb-5">
                <ButtonLoading
                  type="submit"
                  text="Update Category"
                  loading={loading}
                  className="w-full"
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditCategory;
