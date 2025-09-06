"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/application/ButtonLoading";
import MediaSelector from "@/components/application/admin/MediaSelector";
import { showToast } from "@/lib/ShowToast";

// ---- Zod schema (single image + url) ----
const ImageSchema = z.object({
  _id: z.string().min(1, "Image id is required"),
  path: z.string().min(1, "Image path is required"),
  alt: z.string().optional().default(""),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

const FormSchema = z.object({
  image: ImageSchema,
});

export default function HomePageBannerForm() {
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      image: {
        _id: "",
        path: "",
        alt: "",
        url: "",
      },
    },
    mode: "onChange",
  });

  const { control, setValue, handleSubmit, reset, watch } = form;
  const image = watch("image");

  // Load existing banner (if any)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/homepage-banner");
        const doc = data?.data;
        if (doc?.image) {
          reset({
            image: {
              _id: doc.image._id || "",
              path: doc.image.path || "",
              alt: doc.image.alt || "",
              url: doc.image.url || "",
            },
          });
        }
      } catch (e) {
        // non-fatal: if not found, stay with defaults
      } finally {
        setInitializing(false);
      }
    })();
  }, [reset]);

  const onSubmit = async (vals) => {
    try {
      setLoading(true);
      const payload = {
        image: {
          _id: vals.image._id,
          path: vals.image.path,
          alt: vals.image.alt || "",
          url: vals.image.url || "",
        },
      };
      const { data } = await axios.put("/api/homepage-banner", payload);
      if (!data?.success) throw new Error(data?.message || "Save failed");
      showToast("success", "Homepage banner saved.");
    } catch (e) {
      showToast("error", e?.message || "Failed to save banner");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="py-0 rounded shadow-sm">
      <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-semibold mt-3">Home Page Banner</h4>
        </div>
      </CardHeader>

      <CardContent className="pb-5">
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Image picker — same pattern as product heroImage */}
            <FormField
              control={control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banner Image</FormLabel>
                  <MediaSelector
                    multiple={false}
                    triggerLabel={field.value?._id ? "Change Banner Image" : "Select Banner Image"}
                    onSelect={(selected) => {
                      if (!selected) {
                        field.onChange({ _id: "", path: "", alt: "", url: field.value?.url || "" });
                        return;
                      }
                      field.onChange({
                        _id: selected._id,
                        path: selected.path,
                        alt: field.value?.alt || selected.alt || "",
                        url: field.value?.url || "", // preserve any typed URL
                      });
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Alt text (edits the nested image.alt) */}
            <FormField
              control={control}
              name="image.alt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alt Text</FormLabel>
                  <FormControl>
                    <Input placeholder="Describe the banner image" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Click-through URL (edits the nested image.url) */}
            <FormField
              control={control}
              name="image.url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Click-through URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/landing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Read-only preview */}
            {image?.path ? (
              <div className="rounded-md border p-3">
                <div className="text-sm mb-2 text-muted-foreground">Preview</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.path}
                  alt={image.alt || "Homepage banner preview"}
                  className="w-full max-w-3xl rounded"
                />
                {image.url ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Link: <span className="underline">{image.url}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="pt-2">
              <ButtonLoading
                type="submit"
                text={initializing ? "Loading..." : "Save Banner"}
                loading={loading || initializing}
                className="w-full"
              />
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
