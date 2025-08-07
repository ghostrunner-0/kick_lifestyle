import { z } from "zod";

const imageObject = z.object({
  _id: z.string().nonempty(),
  alt: z.string().optional(),
  path: z.string().nonempty(),
});

export const zSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .regex(/^[A-Za-z\s]+$/, "Name can only contain letters and spaces"),
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
  slug: z.string().min(3, { message: "Slug is required" }),
  _id: z.string().min(3, { message: "id is required" }),
  // ✅ Required image field
  image: z.union([
    imageObject,
    z.array(imageObject).min(1, { message: "Please select at least one image" }),
  ]).refine(
    (val) => (Array.isArray(val) ? val.length > 0 : val !== undefined && val !== null),
    { message: "Please select at least one image" }
  ),
});
