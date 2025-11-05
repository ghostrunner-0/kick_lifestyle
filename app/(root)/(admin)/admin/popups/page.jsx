"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import BreadCrumb from "@/components/application/admin/BreadCrumb";
import { ADMIN_DASHBOARD } from "@/routes/AdminRoutes";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ButtonLoading from "@/components/application/ButtonLoading";
import MediaSelector from "@/components/application/admin/MediaSelector";
import { showToast } from "@/lib/ShowToast";
import { zSchema } from "@/lib/zodSchema";

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "/admin/popups", label: "Popups" },
  { href: "", label: "Configure" },
];

const formZ = z.object({
  _id: z.string().optional(),
  type: z.enum(["image-link", "discount"]),
  image: zSchema.shape.image,

  // conditional
  linkHref: z
    .string()
    .url({ message: "Enter full URL e.g. https://kick.com.np/deals" })
    .optional()
    .or(z.literal(""))
    .default(""),
  couponCode: z.string().optional().default(""),

  // controls
  isActive: z.boolean().default(true),
  startAt: z.coerce.date().nullable().optional(),
  endAt: z.coerce.date().nullable().optional(),
  priority: z.number().int().default(10),
  pages: z.string().optional().default(""), // CSV in UI, will split before submit

  frequencyScope: z
    .enum(["once", "daily", "session", "always"])
    .default("session"),
  frequencyMax: z.coerce.number().int().min(0).default(1),

  uiLayout: z.enum(["centered", "edge", "sheet"]).optional(),
});

const sanitizeMedia = (file) =>
  file ? { _id: file._id, alt: file.alt || "", path: file.path } : undefined;

export default function AdminPopupConfigPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    resolver: zodResolver(formZ),
    defaultValues: {
      type: "image-link",
      image: undefined,
      linkHref: "",
      couponCode: "",
      isActive: true,
      startAt: null,
      endAt: null,
      priority: 10,
      pages: "",
      frequencyScope: "session",
      frequencyMax: 1,
      uiLayout: undefined,
    },
  });

  // Load existing
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get("/api/admin/popups/config", {
          withCredentials: true,
        });
        if (mounted && data?.success && data?.data) {
          const d = data.data;
          form.reset({
            _id: d._id,
            type: d.type,
            image: d.image,
            linkHref: d.linkHref || "",
            couponCode: d.couponCode || "",
            isActive: !!d.isActive,
            startAt: d.startAt ? new Date(d.startAt) : null,
            endAt: d.endAt ? new Date(d.endAt) : null,
            priority: d.priority ?? 10,
            pages:
              Array.isArray(d.pages) && d.pages.length
                ? d.pages.join(", ")
                : "",
            frequencyScope: d.frequency?.scope || "session",
            frequencyMax: d.frequency?.maxShows ?? 1,
            uiLayout: d.ui?.layout || undefined,
          });
        }
      } catch {
        // no config yet—ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [form]);

  const imagePreview = useMemo(() => {
    const img = form.getValues("image");
    return img?.path || "";
  }, [form.watch("image")]);

  const submit = async (values) => {
    try {
      setSaving(true);

      // Prepare payload
      const pagesArr = (values.pages || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        _id: values._id,
        type: values.type,
        image: values.image,
        linkHref: values.type === "image-link" ? values.linkHref || "" : "",
        couponCode: values.type === "discount" ? values.couponCode || "" : "",

        isActive: values.isActive,
        startAt: values.startAt || null,
        endAt: values.endAt || null,
        priority: Number(values.priority ?? 10),
        pages: pagesArr,
        frequency: {
          scope: values.frequencyScope,
          maxShows: Number(values.frequencyMax ?? 1),
        },
        ui: { layout: values.uiLayout || undefined },
      };

      const method = values._id ? "put" : "post";
      const { data } = await axios({
        method,
        url: "/api/admin/popups/config",
        data: payload,
        withCredentials: true,
      });

      if (!data?.success) throw new Error(data?.message || "Save failed");
      // reflect _id after create
      if (data?.data?._id) form.setValue("_id", data.data._id);

      showToast("success", "Popup configuration saved.");
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "Save failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const type = form.watch("type");

  return (
    <div>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
          <h4 className="text-xl font-semibold mt-3">Popup Configuration</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Configure a single website popup. Choose type and content. This will
            be used across the site (with optional page targeting).
          </p>
        </CardHeader>
        <CardContent className="pb-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Popup Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image-link">
                          Image with Link
                        </SelectItem>
                        <SelectItem value="discount">
                          Coupon (no redirect)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image */}
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Popup Image</FormLabel>
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
                      triggerLabel={
                        field.value ? "Change Image" : "Select Image"
                      }
                    />
                    <div className="mt-3">
                      {imagePreview ? (
                        <div className="inline-block rounded-lg border bg-white p-2">
                          <Image
                            src={imagePreview}
                            alt={field.value?.alt || "popup"}
                            width={260}
                            height={260}
                            className="rounded-md object-contain"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No image selected.
                        </p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditionally show fields */}
              {type === "image-link" && (
                <FormField
                  control={form.control}
                  name="linkHref"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link (on click)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://kick.com.np/deals"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {type === "discount" && (
                <FormField
                  control={form.control}
                  name="couponCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. KICK11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Targeting & Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="mb-0">Active</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start At</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 16)
                              : ""
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? new Date(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End At</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 16)
                              : ""
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? new Date(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="pages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pages (comma separated)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. "/", "/product/*", "/deals"'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Frequency & UI */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="frequencyScope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency Scope</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="session" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="session">session</SelectItem>
                          <SelectItem value="daily">daily</SelectItem>
                          <SelectItem value="once">once</SelectItem>
                          <SelectItem value="always">always</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frequencyMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Shows</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uiLayout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UI Layout (optional)</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Auto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="centered">centered</SelectItem>
                          <SelectItem value="edge">edge</SelectItem>
                          <SelectItem value="sheet">sheet</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <ButtonLoading
                type="submit"
                text={form.getValues("_id") ? "Update" : "Save"}
                loading={saving || loading}
                className="w-full"
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
