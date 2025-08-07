"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { zSchema } from "@/lib/zodSchema";
import { useParams } from "next/navigation";

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

const formSchema = zSchema.pick({
  _id: true,
  name: true,
  slug: true,
  image: true,
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
    },
  });

  // Pre-fill form when categoryData is available
  useEffect(() => {
    if (categoryData?.success) {
      const { _id, name, slug, image } = categoryData.data;
      form.reset({
        _id,
        name,
        slug,
        image: image || undefined,
      });
    }
  }, [categoryData]);

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
      const { data: response } = await axios.put(
        "/api/category/update",
        values
      );

      if (!response.success) {
        throw new Error(response.message);
      }

      showToast("success", "Category updated successfully!");
    } catch (error) {
      showToast("error", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

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
                        <Input
                          type="text"
                          placeholder="Category Name"
                          {...field}
                        />
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
                        <Input
                          type="text"
                          placeholder="category-slug"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Media Selector */}
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
                        triggerLabel={
                          field.value ? "Change Image" : "Select Image"
                        }
                        onSelect={(selected) => {
                          const sanitize = (file) => ({
                            _id: file._id,
                            alt: file.alt || "",
                            path: file.path,
                          });

                          if (selected) {
                            field.onChange(sanitize(selected));
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
