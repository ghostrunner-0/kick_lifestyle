"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import NextImage from "next/image";
import { useParams, useRouter } from "next/navigation";

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

/* --- Required dimensions (same as create) --- */
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

// HEX color: normalize and validate (#abc or #aabbcc)
const hexColorRegex = /^#(?:[A-Fa-f0-9]{3}){1,2}$/;
const bgColorZ = z
  .string()
  .trim()
  .transform((v) => (v?.startsWith("#") ? v : `#${v || ""}`))
  .refine((v) => hexColorRegex.test(v), {
    message: "Enter a valid HEX color, e.g. #fcba17",
  })
  .default("#ffffff");

const formSchema = z.object({
  desktopImage: imageZ,
  mobileImage: imageZ,
  href: hrefZ.default("#"),
  active: z.boolean().default(true),
  order: z.coerce.number().int().min(0, "Order must be 0 or greater"),
  bgColor: bgColorZ, // NEW
});

/* --- helpers --- */
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
    const img = new window.Image();
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

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "#", label: "Banners" },
  { href: "", label: "Edit" },
];

export default function EditBannerPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deskMeta, setDeskMeta] = useState({ width: undefined, height: undefined });
  const [mobMeta, setMobMeta] = useState({ width: undefined, height: undefined });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      desktopImage: undefined,
      mobileImage: undefined,
      href: "#",
      active: true,
      order: 0,
      bgColor: "#ffffff",
    },
  });

  const values = form.watch();

  // Load existing banner
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get(`/api/banners/${id}`);
        const b = data?.data || data; // your response() already wraps in data
        if (!b?._id) throw new Error("Banner not found");

        const payload = {
          desktopImage: b.desktopImage,
          mobileImage: b.mobileImage,
          href: b.href || "#",
          active: !!b.active,
          order: Number.isFinite(b.order) ? b.order : 0,
          bgColor: b.bgColor || "#ffffff", // NEW
        };

        if (!alive) return;
        form.reset(payload);

        // Probe sizes for badges
        if (b.desktopImage?.path) {
          const meta = await probeImageSize(b.desktopImage.path);
          if (alive) setDeskMeta(meta);
        }
        if (b.mobileImage?.path) {
          const meta = await probeImageSize(b.mobileImage.path);
          if (alive) setMobMeta(meta);
        }
      } catch (e) {
        showToast("error", e?.message || "Failed to load banner");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, form]);

  const onSubmit = async (vals) => {
    try {
      setSaving(true);
      const payload = {
        desktopImage: vals.desktopImage,
        mobileImage: vals.mobileImage,
        href: resolveHref(vals.href),
        active: !!vals.active,
        order: Number(vals.order),
        bgColor: vals.bgColor, // NEW — make sure your PUT route accepts this field
      };
      const { data: res } = await axios.put(`/api/banners/${id}`, payload);
      if (!res?.success) throw new Error(res?.message || "Update failed");
      showToast("success", "Banner updated!");
      router.refresh();
    } catch (err) {
      showToast("error", err?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const previewHref = useMemo(() => resolveHref(values.href), [values.href]);

  const desktopOK = ratioOK(deskMeta.width, deskMeta.height, DESKTOP_W, DESKTOP_H);
  const mobileOK = ratioOK(mobMeta.width, mobMeta.height, MOBILE_W, MOBILE_H);

  const gradientPreviewStyle = {
    backgroundImage: `linear-gradient(180deg, ${values.bgColor || "#ffffff"} 0%, ${
      values.bgColor || "#ffffff"
    } 50%, #ffffff 100%)`,
  };

  return (
    <div className="space-y-4">
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Form */}
        <Card className="lg:col-span-2 rounded shadow-sm">
          <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
            <h4 className="text-xl font-semibold mt-3">Edit Banner</h4>
          </CardHeader>

          <CardContent className="pb-5">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Row: Active / Order / Href / Color */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between gap-3">
                          <div>
                            <FormLabel className="m-0">Active</FormLabel>
                            <FormDescription className="text-xs">
                              Show this banner on the site.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
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
                            <Input type="number" min="0" step="1" placeholder="e.g., 0" {...field} />
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
                              placeholder={`${MAIN_DOMAIN || "https://example.com"}/path or #`}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Enter <code>#</code>, a full URL, or a relative path (e.g., <code>/sale</code>).
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* bgColor (HEX) + native picker */}
                    <FormField
                      control={form.control}
                      name="bgColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Top BG Color (HEX)</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="#fcba17"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <input
                              type="color"
                              className="h-9 w-9 rounded border"
                              value={hexColorRegex.test(field.value || "") ? field.value : "#ffffff"}
                              onChange={(e) => field.onChange(e.target.value)}
                              aria-label="Pick color"
                            />
                          </div>
                          <FormDescription className="text-xs">
                            Used for the header-half gradient behind the banner.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Images Section */}
                  <div className="space-y-6 rounded-md border p-3">
                    {/* Desktop */}
                    <FormField
                      control={form.control}
                      name="desktopImage"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Desktop Image</FormLabel>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline">
                                {DESKTOP_W}×{DESKTOP_H}
                              </Badge>
                              {deskMeta.width && (
                                <span className="ml-1">
                                  Actual: {prettySize(deskMeta.width, deskMeta.height)}
                                </span>
                              )}
                            </div>
                          </div>

                          <MediaSelector
                            multiple={false}
                            triggerLabel={field.value ? "Change Desktop Image" : "Select Desktop Image"}
                            onSelect={async (selected) => {
                              if (!selected) {
                                field.onChange(undefined);
                                setDeskMeta({ width: undefined, height: undefined });
                                return;
                              }
                              const file = Array.isArray(selected) ? selected[0] : selected;
                              const clean = sanitize(file);
                              field.onChange(clean);
                              const meta = await probeImageSize(clean.path);
                              setDeskMeta(meta);
                            }}
                          />

                          <FormDescription className="text-xs">
                            Recommended: <strong>{DESKTOP_W}×{DESKTOP_H}</strong> (≈ {(DESKTOP_W / DESKTOP_H).toFixed(2)}:1)
                          </FormDescription>

                          {deskMeta.width && (
                            <div className="pt-1">
                              {ratioOK(deskMeta.width, deskMeta.height, DESKTOP_W, DESKTOP_H) ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Looks good</Badge>
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
                            <FormLabel>Mobile Image</FormLabel>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline">
                                {MOBILE_W}×{MOBILE_H}
                              </Badge>
                              {mobMeta.width && (
                                <span className="ml-1">
                                  Actual: {prettySize(mobMeta.width, mobMeta.height)}
                                </span>
                              )}
                            </div>
                          </div>

                          <MediaSelector
                            multiple={false}
                            triggerLabel={field.value ? "Change Mobile Image" : "Select Mobile Image"}
                            onSelect={async (selected) => {
                              if (!selected) {
                                field.onChange(undefined);
                                setMobMeta({ width: undefined, height: undefined });
                                return;
                              }
                              const file = Array.isArray(selected) ? selected[0] : selected;
                              const clean = sanitize(file);
                              field.onChange(clean);
                              const meta = await probeImageSize(clean.path);
                              setMobMeta(meta);
                            }}
                          />

                          <FormDescription className="text-xs">
                            Recommended: <strong>{MOBILE_W}×{MOBILE_H}</strong> (≈ {(MOBILE_W / MOBILE_H).toFixed(2)}:1)
                          </FormDescription>

                          {mobMeta.width && (
                            <div className="pt-1">
                              {ratioOK(mobMeta.width, mobMeta.height, MOBILE_W, MOBILE_H) ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Looks good</Badge>
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
                    <ButtonLoading type="submit" text="Update Banner" loading={saving} />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => form.reset(form.getValues())}
                      title="Reset changes"
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              </Form>
            )}
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
                <Badge className={values.active ? "" : "bg-gray-200 text-gray-700 hover:bg-gray-200"}>
                  {values.active ? "Active" : "Inactive"}
                </Badge>
                <span className="inline-flex items-center gap-2 text-xs">
                  <span>Color:</span>
                  <span
                    className="inline-block h-4 w-6 rounded border"
                    style={{ backgroundColor: values.bgColor || "#ffffff" }}
                    title={values.bgColor}
                  />
                  <code className="text-muted-foreground">{values.bgColor || "#ffffff"}</code>
                </span>
              </div>

              <div className="text-sm">
                <span className="font-medium">Href:</span>{" "}
                <span className="text-muted-foreground break-all">{previewHref || "#"}</span>
              </div>

              {/* gradient preview */}
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Header-half gradient preview</div>
                <div className="h-10 w-full rounded border" style={gradientPreviewStyle} />
              </div>

              {/* Desktop preview */}
              <div>
                <div className="mb-1 text-xs text-muted-foreground">
                  Desktop preview ({DESKTOP_W}×{DESKTOP_H})
                </div>
                <div className="relative h-32 w-full overflow-hidden rounded border bg-muted">
                  {values.desktopImage?.path ? (
                    <NextImage
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
                    <NextImage
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
                Tip: Upload images at the exact sizes for the crispest rendering.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
