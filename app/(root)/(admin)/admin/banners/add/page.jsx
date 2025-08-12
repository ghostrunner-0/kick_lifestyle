"use client";

import axios from "axios";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";

import BreadCrumb from "@/components/application/admin/BreadCrumb";
import { ADMIN_DASHBOARD } from "@/routes/AdminRoutes";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ButtonLoading from "@/components/application/ButtonLoading";
import MediaSelector from "@/components/application/admin/MediaSelector";
import { showToast } from "@/lib/ShowToast";

/* ------------ ENV ------------ */
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_BASE_URL || ""; // e.g. http://localhost:3000

/* --- Required dimensions --- */
const DESKTOP_W = 1920;
const DESKTOP_H = 650;
const MOBILE_W = 600; // portrait
const MOBILE_H = 900; // portrait
const TOLERANCE = 0.03; // 3% aspect ratio tolerance

/* --- Zod --- */
const imageZ = z.object({
  _id: z.string(),
  alt: z.string().optional().default(""),
  path: z.string(),
});

// Allow '#', absolute (http/https), or relative path (e.g., /sale, sale)
const hrefZ = z
  .string()
  .trim()
  .min(1, "Href is required")
  .refine(
    (v) => v === "#" || /^https?:\/\//i.test(v) || /^[\/]?[^#\s]+/i.test(v),
    { message: "Use '#', an absolute URL, or a relative path" }
  );

const formSchema = z.object({
  desktopImage: imageZ,
  mobileImage: imageZ,
  href: hrefZ.default("#"),
  active: z.boolean().default(true),
  order: z.coerce.number().int().min(0, "Order must be 0 or greater"),
});

/* --- Helpers --- */
const sanitize = (file) => ({
  _id: file._id,
  alt: file.alt || "",
  path: file.path,
});

function prettySize(w, h) {
  if (!w || !h) return "—";
  return `${w} × ${h}`;
}

function ratioOK(actualW, actualH, targetW, targetH, tol = TOLERANCE) {
  if (!actualW || !actualH) return null;
  const rA = actualW / actualH;
  const rT = targetW / targetH;
  return Math.abs(rA - rT) / rT <= tol;
}

async function probeImageSize(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: undefined, height: undefined });
    img.src = src;
  });
}

// Resolve '#', absolute URLs, or relative paths against MAIN_DOMAIN
function resolveHref(input) {
  const v = (input || "").trim();
  if (!v || v === "#") return "#";
  if (/^https?:\/\//i.test(v)) return v;
  const base = MAIN_DOMAIN.replace(/\/+$/, "");
  const path = v.startsWith("/") ? v : `/${v}`;
  return `${base}${path}`;
}

/* --- Component --- */
const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "#", label: "Banners" },
  { href: "", label: "Add" },
];

export default function AddBanner() {
  const [loading, setLoading] = useState(false);
  const [deskMeta, setDeskMeta] = useState({
    width: undefined,
    height: undefined,
  });
  const [mobMeta, setMobMeta] = useState({
    width: undefined,
    height: undefined,
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      desktopImage: undefined,
      mobileImage: undefined,
      href: "",
      active: true,
      order: 1,
    },
  });

  const values = form.watch();

  const onSubmit = async (vals) => {
    try {
      setLoading(true);
      const payload = {
        ...vals,
        href: resolveHref(vals.href),
        order: Number(vals.order),
      };
      const { data: res } = await axios.post("/api/banners/create", payload);
      if (!res?.success)
        throw new Error(res?.message || "Failed to create banner");
      showToast("success", "Banner created!");
      form.reset({
        desktopImage: undefined,
        mobileImage: undefined,
        href: "",
        active: true,
        order: 1,
      });
      setDeskMeta({ width: undefined, height: undefined });
      setMobMeta({ width: undefined, height: undefined });
    } catch (err) {
      showToast("error", err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const previewHref = useMemo(() => resolveHref(values.href), [values.href]);

  const desktopOK = ratioOK(
    deskMeta.width,
    deskMeta.height,
    DESKTOP_W,
    DESKTOP_H
  );
  const mobileOK = ratioOK(mobMeta.width, mobMeta.height, MOBILE_W, MOBILE_H);

  return (
    <div className="space-y-4">
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Form */}
        <Card className="lg:col-span-2 rounded shadow-sm">
          <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
            <h4 className="text-xl font-semibold mt-3">Add Banner</h4>
          </CardHeader>
          <CardContent className="pb-5">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                {/* Row: Active / Order / Href */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-3 ">
                        <div>
                          <FormLabel className="m-0">Active</FormLabel>
                          <FormDescription className="text-xs">
                            Show this banner on the site.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order (0 = first)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="e.g., 0"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Lower numbers appear first.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="href"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Href</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder={`${
                              MAIN_DOMAIN || "https://example.com"
                            }/path or #`}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Enter <code>#</code>, a full URL, or a relative path
                          (e.g., <code>/sale</code>). It resolves against{" "}
                          <strong>{MAIN_DOMAIN || "your domain"}</strong>.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Images Section with Dark BG */}
                <div className=" space-y-6 rounded-md border p-3">
                  {/* Desktop */}
                  <FormField
                    control={form.control}
                    name="desktopImage"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between ">
                          <FormLabel className="text-white">
                            Desktop Image
                          </FormLabel>
                          <div className="flex items-center gap-2 text-xs text-gray-300">
                            <Badge variant="outline">
                              {DESKTOP_W}×{DESKTOP_H}
                            </Badge>
                            {deskMeta.width && (
                              <span className="ml-1">
                                Actual:{" "}
                                {prettySize(deskMeta.width, deskMeta.height)}
                              </span>
                            )}
                          </div>
                        </div>

                        <MediaSelector
                          multiple={false}
                          triggerLabel={
                            field.value
                              ? "Change Desktop Image"
                              : "Select Desktop Image"
                          }
                          onSelect={async (selected) => {
                            if (!selected) {
                              field.onChange(undefined);
                              setDeskMeta({
                                width: undefined,
                                height: undefined,
                              });
                              return;
                            }
                            const file = Array.isArray(selected)
                              ? selected[0]
                              : selected;
                            const clean = sanitize(file);
                            field.onChange(clean);
                            const meta = await probeImageSize(clean.path);
                            setDeskMeta(meta);
                          }}
                        />

                        <FormDescription className="text-xs text-gray-300 " >
                          Recommended:{" "}
                          <strong>
                            {DESKTOP_W}×{DESKTOP_H}
                          </strong>{" "}
                          (≈ {(DESKTOP_W / DESKTOP_H).toFixed(2)}:1)
                        </FormDescription>

                        {deskMeta.width && (
                          <div className="pt-1">
                            {desktopOK ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                Looks good
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                Aspect ratio mismatch — may crop
                              </Badge>
                            )}
                          </div>
                        )}

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Mobile */}
                  <FormField
                    control={form.control}
                    name="mobileImage"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-white">
                            Mobile Image
                          </FormLabel>
                          <div className="flex items-center gap-2 text-xs text-gray-300">
                            <Badge variant="outline">
                              {MOBILE_W}×{MOBILE_H}
                            </Badge>
                            {mobMeta.width && (
                              <span className="ml-1">
                                Actual:{" "}
                                {prettySize(mobMeta.width, mobMeta.height)}
                              </span>
                            )}
                          </div>
                        </div>

                        <MediaSelector
                          multiple={false}
                          triggerLabel={
                            field.value
                              ? "Change Mobile Image"
                              : "Select Mobile Image"
                          }
                          onSelect={async (selected) => {
                            if (!selected) {
                              field.onChange(undefined);
                              setMobMeta({
                                width: undefined,
                                height: undefined,
                              });
                              return;
                            }
                            const file = Array.isArray(selected)
                              ? selected[0]
                              : selected;
                            const clean = sanitize(file);
                            field.onChange(clean);
                            const meta = await probeImageSize(clean.path);
                            setMobMeta(meta);
                          }}
                        />

                        <FormDescription className="text-xs text-gray-300">
                          Recommended:{" "}
                          <strong>
                            {MOBILE_W}×{MOBILE_H}
                          </strong>{" "}
                          (≈ {(MOBILE_W / MOBILE_H).toFixed(2)}:1)
                        </FormDescription>

                        {mobMeta.width && (
                          <div className="pt-1">
                            {mobileOK ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                Looks good
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                Aspect ratio mismatch — may crop
                              </Badge>
                            )}
                          </div>
                        )}

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <ButtonLoading
                    type="submit"
                    text="Create Banner"
                    loading={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      form.reset({
                        desktopImage: undefined,
                        mobileImage: undefined,
                        href: "",
                        active: true,
                        order: 1,
                      })
                    }
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Right: Live Preview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4 rounded shadow-sm">
            <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
              <h4 className="text-lg font-semibold mt-3">Live Preview</h4>
            </CardHeader>
            <CardContent className="space-y-4 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Order: {values.order ?? 0}</Badge>
                <Badge
                  className={
                    values.active
                      ? ""
                      : "bg-gray-200 text-gray-700 hover:bg-gray-200"
                  }
                >
                  {values.active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="text-sm">
                <span className="font-medium">Href:</span>{" "}
                <span className="text-muted-foreground break-all">
                  {previewHref || "#"}
                </span>
              </div>

              {/* Desktop preview */}
              <div>
                <div className="mb-1 text-xs text-muted-foreground">
                  Desktop preview ({DESKTOP_W}×{DESKTOP_H})
                </div>
                <div className="relative h-32 w-full overflow-hidden rounded border bg-muted">
                  {values.desktopImage?.path ? (
                    <Image
                      src={values.desktopImage.path}
                      alt={values.desktopImage.alt || "desktop preview"}
                      fill
                      className="object-cover"
                      sizes="100vw"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                      No desktop image
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile preview */}
              <div>
                <div className="mb-1 text-xs text-muted-foreground">
                  Mobile preview ({MOBILE_W}×{MOBILE_H})
                </div>
                <div className="relative h-44 w-28 overflow-hidden rounded border bg-muted">
                  {values.mobileImage?.path ? (
                    <Image
                      src={values.mobileImage.path}
                      alt={values.mobileImage.alt || "mobile preview"}
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                      No mobile image
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Tip: Upload images at the exact sizes for the crispest
                rendering.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
