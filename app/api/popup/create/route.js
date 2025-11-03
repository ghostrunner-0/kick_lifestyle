// app/api/popup/create/route.js
import { z } from "zod";
import Popup from "@/models/Popup.model";
import { connectDB } from "@/lib/DB"; // your existing helper
import { isAuthenticated } from "@/lib/Authentication"; // your existing helper
import { response, catchError } from "@/lib/helperFunctions"; // your existing helper

const imageZ = z.object({
  _id: z.string(),
  alt: z.string().optional().default(""),
  path: z.string(),
});

const variantZ = z.enum(["simple", "coupon", "launch"]);

const payloadZ = z
  .object({
    variant: variantZ,
    title: z.string().min(1, "Title is required"),
    message: z.string().optional().default(""),

    couponCode: z.string().optional(),
    image: imageZ.nullable().optional(),

    ctaLabel: z.string().optional(),
    ctaHref: z
      .string()
      .url({ message: "Enter full URL e.g. https://kick.com.np/p/xyz" })
      .optional(),

    enabled: z.boolean().optional().default(true),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    priority: z.number().int().optional().default(0),
  })
  .superRefine((val, ctx) => {
    if (val.variant === "coupon") {
      if (!val.couponCode || !val.couponCode.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["couponCode"],
          message: "couponCode required for coupon variant",
        });
      }
    }
    if (val.variant === "launch") {
      if (!val.ctaLabel)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ctaLabel"],
          message: "ctaLabel required for launch",
        });
      if (!val.ctaHref)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ctaHref"],
          message: "ctaHref required for launch",
        });
    }
  });

const normalizeImage = (img) =>
  img
    ? { _id: String(img._id), alt: img.alt ?? "", path: String(img.path) }
    : null;

export async function POST(req) {
  try {
    const allowed = await isAuthenticated(["admin", "editor"]);
    if (!allowed) return response(false, 401, "User Not Allowed");

    await connectDB();

    const raw = await req.json();
    const parsed = payloadZ.safeParse(raw);
    if (!parsed.success) {
      return response(
        false,
        400,
        "Invalid or missing fields",
        parsed.error.format()
      );
    }

    const d = parsed.data;
    const doc = {
      variant: d.variant,
      title: d.title.trim(),
      message: (d.message || "").trim(),
      couponCode: d.couponCode || "",
      image: normalizeImage(d.image ?? null),
      ctaLabel: d.ctaLabel || "",
      ctaHref: d.ctaHref || "",
      enabled: typeof d.enabled === "boolean" ? d.enabled : true,
      startAt: d.startAt || new Date(),
      endAt: d.endAt || undefined,
      priority: Number(d.priority ?? 0),
    };

    const created = await Popup.create(doc);
    return response(true, 201, "Popup created successfully", created);
  } catch (err) {
    return catchError(err, "Failed to create popup");
  }
}
