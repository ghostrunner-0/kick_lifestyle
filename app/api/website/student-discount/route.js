// app/api/website/student-discount/route.js
import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

import { connectDB } from "@/lib/DB";
import StudentDiscount from "@/models/StudentDiscount.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// helper: keep only digits (use for uniqueness)
function normalizePhone(str = "") {
  return String(str).replace(/\D+/g, "");
}

// simple validators (tune for your region)
function isValidMobile10(n) {
  // 10 digits (e.g., Nepali mobile commonly 97/98xxxxxxx) – adjust if needed
  return /^\d{10}$/.test(n);
}
function isValidPhoneGeneric(n) {
  // at least 7 digits for landlines etc
  return /^\d{7,}$/.test(n);
}

/**
 * Persist image under a PRIVATE folder (NOT public):
 *   <projectRoot>/student-id-cards/<uuid>.<ext>
 *
 * Returns an object suitable for your image schema:
 *   { _id, path, alt }
 *
 * Note: 'path' here is a **disk path relative to project root**,
 * e.g. 'student-id-cards/6e0d2...-c9f7.png'. It's not a public URL.
 */
async function persistImage(file, altText = "") {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Private folder at project root
  const privateDir = path.join(process.cwd(), "student-id-cards");
  await fs.mkdir(privateDir, { recursive: true });

  const ext = path.extname(file.name || "").toLowerCase() || ".jpg";
  const id = crypto.randomUUID();
  const fileName = `${id}${ext}`;
  const absPath = path.join(privateDir, fileName);

  await fs.writeFile(absPath, buffer);

  // Store a relative path (not URL) so you know it's private
  const relPath = path.join("student-id-cards", fileName);

  return { _id: id, path: relPath, alt: altText || "Student ID" };
}

export async function POST(req) {
  try {
    await connectDB();

    const form = await req.formData();
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const phoneNumber = String(form.get("phoneNumber") || "").trim();
    const collegeName = String(form.get("collegeName") || "").trim();
    const collegePhoneNumber = String(form.get("collegePhoneNumber") || "").trim();
    const idCardPhoto = form.get("idCardPhoto");

    // ---------- Field validation ----------
    if (!name || name.length < 2) {
      return NextResponse.json(
        { success: false, message: "Name is required." },
        { status: 400 }
      );
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Valid email is required." },
        { status: 400 }
      );
    }

    const phoneNormalized = normalizePhone(phoneNumber);
    if (!isValidMobile10(phoneNormalized)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    const collegePhoneNormalized = normalizePhone(collegePhoneNumber);
    if (!isValidPhoneGeneric(collegePhoneNormalized)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid college phone number." },
        { status: 400 }
      );
    }

    if (!(idCardPhoto instanceof File)) {
      return NextResponse.json(
        { success: false, message: "ID card photo is required." },
        { status: 400 }
      );
    }
    if (!idCardPhoto.type?.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "ID card must be an image file." },
        { status: 400 }
      );
    }

    // ---------- Duplicate check (by normalized number) ----------
    const existing = await StudentDiscount.findOne({
      phoneNumberNormalized: phoneNormalized,
    }).lean();
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "This phone number has already been used for an application.",
        },
        { status: 409 }
      );
    }

    // ---------- Persist image (PRIVATE) ----------
    const storedImage = await persistImage(idCardPhoto, `Student ID for ${name}`);

    // ---------- Create document ----------
    try {
      const doc = await StudentDiscount.create({
        name,
        email,
        phoneNumber, // original (display)
        phoneNumberNormalized: phoneNormalized, // unique (digits only)
        collegeName,
        collegePhoneNumber,
        idCardPhoto: storedImage, // { _id, path: 'student-id-cards/<file>', alt }
      });

      return NextResponse.json(
        { success: true, data: { id: doc._id } },
        { status: 201 }
      );
    } catch (err) {
      // Handle race condition with unique index
      if (err?.code === 11000 && err?.keyPattern?.phoneNumberNormalized) {
        return NextResponse.json(
          {
            success: false,
            message: "This phone number has already been used for an application.",
          },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (e) {
    console.error("POST /api/website/student-discount error:", e);
    return NextResponse.json(
      { success: false, message: "Failed to submit application." },
      { status: 500 }
    );
  }
}
