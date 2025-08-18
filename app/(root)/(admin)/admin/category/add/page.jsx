"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { zSchema } from "@/lib/zodSchema";
import { Switch } from "@/components/ui/switch";

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

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_ALL, label: "Category" },
  { href: "", label: "Add" },
];

/* --------- Zod: add optional banner (same shape as image) --------- */
const formSchema = zSchema
  .pick({
    name: true,
    slug: true,
    image: true,
  })
  .extend({
    // Optional banner image (same shape as `image`)
    banner: zSchema.shape?.image ? zSchema.shape.image.optional() : z
      .object({
        _id: z.string(),
        alt: z.string().optional().default(""),
        path: z.string(),
      })
      .optional(),
    showInWebsite: z.boolean().optional().default(true),
  });

const AddCategory = () => {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      image: undefined,
      banner: undefined, // <-- new
      showInWebsite: true,
    },
  });

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
      // console.log(values);
      const { data: response } = await axios.post("/api/category/create", values);

      if (!response?.success) throw new Error(response?.message || "Failed");

      showToast("success", "Category added successfully!");
      form.reset({
        name: "",
        slug: "",
        image: undefined,
        banner: undefined, // <-- reset banner too
        showInWebsite: true,
      });
    } catch (error) {
      showToast("error", error?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // helper to sanitize a media item coming from MediaSelector
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
          <h4 className="text-xl font-semibold mt-3">Add Category</h4>
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
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
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
                        onSelect={(selected) => {
                          if (Array.isArray(selected) && selected.length > 0) {
                            field.onChange(sanitizeMedia(selected[0]));
                          } else if (selected) {
                            field.onChange(sanitizeMedia(selected));
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                        triggerLabel={field.value ? "Change Image" : "Select Image"}
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
                        onSelect={(selected) => {
                          if (Array.isArray(selected) && selected.length > 0) {
                            field.onChange(sanitizeMedia(selected[0]));
                          } else if (selected) {
                            field.onChange(sanitizeMedia(selected));
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                        triggerLabel={field.value ? "Change Banner" : "Select Banner"}
                      />

                      {/* helper text / clear */}
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

              {/* Submit Button */}
              <div className="mb-5">
                <ButtonLoading
                  type="submit"
                  text="Create Category"
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

export default AddCategory;
