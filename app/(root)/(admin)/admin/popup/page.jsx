"use client";

import axios from "axios";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

import ButtonLoading from "@/components/application/ButtonLoading";
import MediaSelector from "@/components/application/admin/MediaSelector";
import { showToast } from "@/lib/ShowToast";
import { zSchema } from "@/lib/zodSchema"; // expects .shape.image -> {_id, alt, path}

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "/admin/popup", label: "Popups" },
  { href: "", label: "Configure" },
];

const imageZ = zSchema.shape.image; // {_id, alt, path}

const formSchema = z.object({
  variant: z.enum(["simple", "coupon", "launch"]),
  enabled: z.boolean().default(true),
  title: z.string().trim().min(1, "Title is required"),
  message: z.string().optional().default(""),

  couponCode: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().url("Enter a valid URL").optional(),

  image: imageZ.nullable().optional(),

  priority: z.coerce.number().int().default(0),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
});

const sanitizeMedia = (file) =>
  file ? { _id: file._id, alt: file.alt || "", path: file.path } : undefined;

export default function AdminPopupConfigPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variant: "simple",
      enabled: true,
      title: "",
      message: "",
      couponCode: "",
      ctaLabel: "",
      ctaHref: "",
      image: undefined,
      priority: 0,
      startAt: "",
      endAt: "",
    },
  });

  // load latest popup (single-entry style)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get("/api/admin/popup", {
          withCredentials: true,
        });
        const first = Array.isArray(data) ? data[0] : null;
        if (mounted && first) {
          setExistingId(first._id);
          form.reset({
            variant: first.variant || "simple",
            enabled: !!first.enabled,
            title: first.title || "",
            message: first.message || "",
            couponCode: first.couponCode || "",
            ctaLabel: first.ctaLabel || "",
            ctaHref: first.ctaHref || "",
            image: first.image || undefined,
            priority: typeof first.priority === "number" ? first.priority : 0,
            startAt: first.startAt ? toLocalInputValue(first.startAt) : "",
            endAt: first.endAt ? toLocalInputValue(first.endAt) : "",
          });
        }
      } catch {
        // ignore if none
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

  const variant = form.watch("variant");

  const onSubmit = async (values) => {
    try {
      setSaving(true);

      // client-side variant rules
      if (values.variant === "coupon" && !values.couponCode?.trim()) {
        throw new Error("Coupon code is required for the Coupon variant.");
      }
      if (values.variant === "launch") {
        if (!values.ctaLabel?.trim())
          throw new Error("CTA Label is required for Launch.");
        if (!values.ctaHref?.trim())
          throw new Error("CTA Link is required for Launch.");
      }

      const payload = {
        variant: values.variant,
        enabled: values.enabled,
        title: values.title,
        message: values.message || "",
        couponCode: values.variant === "coupon" ? values.couponCode : undefined,
        ctaLabel: values.variant === "launch" ? values.ctaLabel : undefined,
        ctaHref: values.variant === "launch" ? values.ctaHref : undefined,
        image: values.image?.path ? values.image : undefined,
        priority: Number(values.priority || 0),
        startAt: values.startAt || undefined,
        endAt: values.endAt || undefined,
      };

      if (existingId) {
        const { data } = await axios.patch(
          "/api/admin/popup",
          { _id: existingId, ...payload },
          { withCredentials: true }
        );
        if (!data?.success) throw new Error(data?.message || "Update failed");
        showToast("success", "Popup updated.");
      } else {
        const { data } = await axios.post("/api/admin/popup/create", payload, {
          withCredentials: true,
        });
        if (!data?.success) throw new Error(data?.message || "Create failed");
        setExistingId(data?.data?._id || null);
        showToast("success", "Popup created.");
      }
    } catch (e) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "Save failed"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
          <h4 className="text-xl font-semibold mt-3">Marketing Popup</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Simple / Coupon / Launch — single image via MediaSelector.
          </p>
        </CardHeader>
        <CardContent className="pb-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Enabled / Priority / Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
                      <FormLabel className="m-0">Enabled</FormLabel>
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
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start At</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
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
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Variant tabs */}
              <div className="mb-5">
                <Tabs
                  value={variant}
                  onValueChange={(v) => form.setValue("variant", v)}
                >
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="simple">Simple</TabsTrigger>
                    <TabsTrigger value="coupon">Coupon</TabsTrigger>
                    <TabsTrigger value="launch">Launch</TabsTrigger>
                  </TabsList>

                  {/* Common fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Popup title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="sm:col-span-2">
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                              <Textarea
                                rows={3}
                                placeholder="Optional message..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Simple */}
                  <TabsContent value="simple" className="mt-4 space-y-4">
                    <ImageField
                      form={form}
                      name="image"
                      label="Optional Image"
                      imagePreview={imagePreview}
                    />
                  </TabsContent>

                  {/* Coupon */}
                  <TabsContent value="coupon" className="mt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="couponCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Coupon Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., KICK20" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <ImageField
                      form={form}
                      name="image"
                      label="Promo Image"
                      imagePreview={imagePreview}
                      requiredHint="Recommended for coupon variant"
                    />
                  </TabsContent>

                  {/* Launch */}
                  <TabsContent value="launch" className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ctaLabel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CTA Label</FormLabel>
                            <FormControl>
                              <Input placeholder="Shop Now" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ctaHref"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CTA Link</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://kick.com.np/products/xyz"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <ImageField
                      form={form}
                      name="image"
                      label="Launch Image"
                      imagePreview={imagePreview}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <ButtonLoading
                type="submit"
                text={existingId ? "Update" : "Save"}
                loading={saving || (loading && !existingId)}
                className="w-full"
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function ImageField({ form, name, label, imagePreview, requiredHint }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
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
          <div className="mt-3">
            {imagePreview ? (
              <div className="inline-block rounded-lg border bg-white p-2">
                <Image
                  src={imagePreview}
                  alt={form.getValues("title") || "Popup"}
                  width={280}
                  height={180}
                  className="rounded-md object-contain"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No image selected.
              </p>
            )}
          </div>
          {requiredHint ? (
            <p className="text-xs text-muted-foreground">{requiredHint}</p>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function toLocalInputValue(date) {
  try {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}
