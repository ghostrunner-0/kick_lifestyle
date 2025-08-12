import { z } from "zod";

/** ---------- Internals ---------- **/
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const imageObject = z.object({
  _id: objectId, // media _id as ObjectId string
  alt: z.string().optional(),
  path: z.string().min(1, "Image path is required"),
});

const additionalInfoRow = z.object({
  label: z.string().trim().min(1, "Label is required"),
  value: z.string().trim().min(1, "Value is required"),
});

/** ---------- Coupon schema (export & reuse) ---------- **/
export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .transform((v) => v.toUpperCase()),
  discountType: z.enum(["percentage", "fixed"]),
  discountAmount: z.coerce
    .number()
    .min(0, "Discount amount cannot be negative"),

  individualUse: z.coerce.boolean().optional().default(false),

  // Free item targeting a specific variant (main target is the variant)
  freeItem: z
    .object({
      variant: objectId.nullable().optional(),
      qty: z.coerce.number().min(1).optional().default(1),
    })
    .nullable()
    .optional(),

  // Targeting specific products/variants (multiple)
  specificProducts: z.array(objectId).optional().default([]),
  specificVariants: z.array(objectId).optional().default([]),

  // Limits
  perUserLimit: z.coerce.number().min(0).optional().default(0),
  totalLimit: z.coerce.number().min(0).optional().default(0),
  redemptionsTotal: z.coerce.number().min(0).optional().default(0),

  // Post-usage change
  changeAfterUsage: z.coerce.number().min(0).optional().default(0),
  newDiscountType: z.enum(["percentage", "fixed"]).nullable().optional(),
  newDiscountAmount: z.coerce.number().min(0).nullable().optional(),

  deletedAt: z.coerce.date().nullable().optional(),
});

/**
 * ---------- Master schema ----------
 * NOTE: Only keep this export if you really intend to house *everything* here.
 * If you already have a `zSchema` elsewhere in your project, import `couponSchema`
 * and compose it there instead of redefining `zSchema` here.
 */
export const zSchema = z
  .object({
    coupons: z.array(couponSchema).optional().default([]),

    // Existing fields
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be at most 50 characters"),
    otp: z
      .string()
      .length(6, "OTP must be exactly 6 digits")
      .regex(/^\d{6}$/, "OTP must contain only digits"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password is too long")
      .regex(/[A-Z]/, "Must include at least one uppercase letter")
      .regex(/[a-z]/, "Must include at least one lowercase letter")
      .regex(/[0-9]/, "Must include at least one number")
      .regex(/[^A-Za-z0-9]/, "Must include at least one special character"),
    slug: z
      .string()
      .trim()
      .min(3, { message: "Slug is required" })
      .regex(
        /^[a-z0-9-]+$/,
        "Slug must be lowercase letters, numbers, and hyphens only"
      ),

    warrantyMonths: z.coerce
      .number()
      .min(0, "Warranty cannot be negative")
      .optional(),
    _id: z.string().min(3, { message: "id is required" }),
    showInWebsite: z.coerce.boolean().default(true).optional(),
    phone: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .max(15, "Phone number must be no more than 15 digits")
      .regex(/^[0-9]+$/, "Phone number must contain only digits"),

    // Single/array image (back-compat)
    image: z
      .union([
        imageObject,
        z
          .array(imageObject)
          .min(1, { message: "Please select at least one image" }),
      ])
      .refine(
        (val) =>
          Array.isArray(val)
            ? val.length > 0
            : val !== undefined && val !== null,
        { message: "Please select at least one image" }
      ),

    // Product fields
    shortDesc: z
      .string()
      .trim()
      .max(300, "Short description must be at most 300 characters")
      .optional(),
    category: objectId, // ref: "Category"
    mrp: z.coerce.number().positive("MRP must be > 0"),
    specialPrice: z.coerce.number().positive().optional(),

    productMedia: z
      .array(imageObject)
      .min(1, "At least one product media is required"),
    descImages: z
      .array(imageObject)
      .min(1, "At least one desc image is required"),
    heroImage: imageObject,
    additionalInfo: z
      .array(additionalInfoRow)
      .min(1, "At least one additional info entry is required"),

    deletedAt: z.coerce.date().nullable().optional(),
  })
  .refine((v) => v.specialPrice == null || v.specialPrice <= v.mrp, {
    message: "Special price must be less than or equal to MRP",
    path: ["specialPrice"],
  });
