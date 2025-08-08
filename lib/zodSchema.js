import { z } from "zod";

// === Internals (kept inside the file) ===
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const imageObject = z.object({
  _id: objectId, // must be a valid ObjectId
  alt: z.string().optional(),
  path: z.string().min(1, "Image path is required"),
});

const additionalInfoRow = z.object({
  label: z.string().trim().min(1, "Label is required"),
  value: z.string().trim().min(1, "Value is required"),
});

// === Single master schema ===
export const zSchema = z
  .object({
    // ---------- Existing fields ----------
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
    showInWebsite: z.boolean().default(true).optional(),

    // Generic single/array image (kept for backward compatibility)
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
        {
          message: "Please select at least one image",
        }
      ),

    // ---------- Product fields ----------
    shortDesc: z
      .string()
      .trim()
      .max(300, "Short description must be at most 300 characters")
      .optional(),
    category: objectId, // ref: "category"
    mrp: z.coerce.number().positive("MRP must be > 0"),
    specialPrice: z.coerce.number().positive().optional(),

    // ✅ Now arrays of full image objects {_id, alt, path}
    productMedia: z
      .array(imageObject)
      .min(1, "At least one product media is required"),
    descImages: z
      .array(imageObject)
      .min(1, "At least one desc image is required"),

    // Embedded hero image
    heroImage: imageObject,

    // Additional Info (table rows)
    additionalInfo: z
      .array(additionalInfoRow)
      .min(1, "At least one additional info entry is required"),

    // Soft delete
    deletedAt: z.coerce.date().nullable().optional(),
  })
  // Cross-field rule: specialPrice <= mrp (only when specialPrice present)
  .refine((v) => v.specialPrice == null || v.specialPrice <= v.mrp, {
    message: "Special price must be less than or equal to MRP",
    path: ["specialPrice"],
  });
