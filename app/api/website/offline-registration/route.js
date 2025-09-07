import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

import { connectDB } from "@/lib/DB";
import OfflineRegistrationRequest from "@/models/OfflineRegistrationRequest.model";
import WarrantyRegistration from "@/models/WarrantyRegistration.model";
import Product from "@/models/Product.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const digits10 = (s) => (String(s || "").match(/\d+/g) || []).join("").slice(0, 10);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ""));
const isISODate = (v) => !Number.isNaN(Date.parse(String(v || "")));

function looksLikeImageFileName(name = "") {
  return /\.(png|jpe?g|webp|gif)$/i.test(name);
}

// save under a *private* folder, not public
async function persistImage(file, altText = "") {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const dir = path.join(process.cwd(), "offline-registeration");
  await fs.mkdir(dir, { recursive: true });

  const extRaw = path.extname(file.name || "").toLowerCase();
  const ext = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extRaw) ? extRaw : ".jpg";
  const id = crypto.randomUUID();
  const fileName = `${id}${ext}`;
  const absPath = path.join(dir, fileName);

  await fs.writeFile(absPath, buffer);
  return { _id: id, path: `/offline-registeration/${fileName}`, alt: altText || "Warranty card" };
}

export async function POST(req) {
  try {
    await connectDB();

    const form = await req.formData();
    const name   = String(form.get("name") || "").trim();
    const email  = String(form.get("email") || "").trim().toLowerCase();
    const phone  = String(form.get("phoneNumber") || "").trim();
    const productId = String(form.get("productId") || "").trim();
    const purchaseDate = String(form.get("purchaseDate") || "").trim();
    const serial = String(form.get("serialNumber") || "").trim().toUpperCase();
    const purchasedFrom = String(form.get("purchasedFrom") || "").trim().toLowerCase(); // kick|daraz|offline
    const shopName = String(form.get("shopName") || "").trim();

    // ✅ accept either field name
    const file =
      form.get("warrantyCardImage") ||
      form.get("warrantyCard") ||
      form.get("file");

    // --------- validation ---------
    if (name.length < 2)   return NextResponse.json({ success:false, message:"Name is required." }, { status:400 });
    if (!isEmail(email))   return NextResponse.json({ success:false, message:"Valid email is required." }, { status:400 });

    const phoneNorm = digits10(phone);
    if (phoneNorm.length !== 10)
      return NextResponse.json({ success:false, message:"Enter a valid 10-digit phone number." }, { status:400 });

    if (!productId) return NextResponse.json({ success:false, message:"Product is required." }, { status:400 });

    if (!serial || serial.length < 3)
      return NextResponse.json({ success:false, message:"Serial number is required." }, { status:400 });

    if (!["kick","daraz","offline"].includes(purchasedFrom))
      return NextResponse.json({ success:false, message:"Purchased from is invalid." }, { status:400 });
    if (purchasedFrom === "offline" && !shopName)
      return NextResponse.json({ success:false, message:"Shop name is required for Others." }, { status:400 });

    if (!isISODate(purchaseDate))
      return NextResponse.json({ success:false, message:"Purchase date is invalid." }, { status:400 });

    // image check: accept image/* OR file name with image extension
    const fileLooksOk =
      file &&
      (typeof file.arrayBuffer === "function") &&
      (file.type?.startsWith?.("image/") || looksLikeImageFileName(file.name || ""));
    if (!fileLooksOk) {
      return NextResponse.json({ success:false, message:"Warranty card image is required." }, { status:400 });
    }

    // product snapshot
    const product = await Product.findOne({ _id: productId, deletedAt: null }, { name: 1, heroImage: 1 }).lean();
    if (!product) {
      return NextResponse.json({ success:false, message:"Selected product not found." }, { status:404 });
    }

    // duplicate checks
    const alreadyRegistered = await WarrantyRegistration.findOne({
      "customer.phone": phoneNorm,
      "items.serial": serial,
    }).lean();
    if (alreadyRegistered) {
      return NextResponse.json(
        { success:false, message:"This serial is already registered for this phone number." },
        { status:409 }
      );
    }

    const existingReq = await OfflineRegistrationRequest.findOne({
      phoneNormalized: phoneNorm,
      serial,
    }).lean();
    if (existingReq) {
      return NextResponse.json(
        { success:false, message:"A request for this phone & serial already exists." },
        { status:409 }
      );
    }

    const proof = await persistImage(file, `Warranty card: ${name} • ${product.name}`);

    const doc = await OfflineRegistrationRequest.create({
      name, email, phone,
      phoneNormalized: phoneNorm,
      productId,
      productName: product.name,
      serial,
      purchaseDate: new Date(purchaseDate),
      purchasedFrom,
      shopName: purchasedFrom === "offline" ? shopName : "",
      purchaseProof: proof,     // DB property can remain purchaseProof
      status: "pending",
    });

    return NextResponse.json({ success:true, data:{ id: doc._id } }, { status:201 });
  } catch (e) {
    if (e?.code === 11000 && e?.keyPattern?.phoneNormalized && e?.keyPattern?.serial) {
      return NextResponse.json(
        { success:false, message:"A request for this phone & serial already exists." },
        { status:409 }
      );
    }
    console.error("POST /api/website/offline-registeration error:", e);
    return NextResponse.json({ success:false, message:"Failed to submit registration." }, { status:500 });
  }
}
