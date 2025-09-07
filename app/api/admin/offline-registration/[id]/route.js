import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import OfflineRegistrationRequest from "@/models/OfflineRegistrationRequest.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const digits10 = (s) =>
  (String(s || "").match(/\d+/g) || []).join("").slice(0, 10);

// Map stored `/offline-registeration/uuid.ext` to absolute
function absFromStored(storedPath) {
  const base = "/offline-registeration/";
  if (!storedPath || !storedPath.startsWith(base)) return null;
  const filename = path.basename(storedPath);
  return path.join(process.cwd(), "offline-registeration", filename);
}

export async function PATCH(req, { params }) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );

    await connectDB();
    const param = await params;
    const id = param?.id;
    const body = await req.json();

    if (!id)
      return NextResponse.json(
        { success: false, message: "Bad request" },
        { status: 400 }
      );

    const doc = await OfflineRegistrationRequest.findById(id);
    if (!doc)
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );

    // Editable fields
    if (body.name != null) doc.name = String(body.name).trim();
    if (body.email != null) doc.email = String(body.email).trim().toLowerCase();
    if (body.phone != null) {
      doc.phone = String(body.phone).trim();
      doc.phoneNormalized = digits10(doc.phone);
    }
    if (body.productName != null)
      doc.productName = String(body.productName).trim();
    if (body.serial != null)
      doc.serial = String(body.serial).trim().toUpperCase();
    if (body.purchaseDate != null) {
      const d = new Date(String(body.purchaseDate));
      if (!Number.isNaN(d.valueOf())) doc.purchaseDate = d;
    }
    if (body.purchasedFrom != null) {
      const pf = String(body.purchasedFrom).toLowerCase();
      if (["kick", "daraz", "offline"].includes(pf)) doc.purchasedFrom = pf;
    }
    if (doc.purchasedFrom === "offline") {
      if (body.shopName != null) doc.shopName = String(body.shopName).trim();
    } else {
      doc.shopName = "";
    }

    // Status change → delete image
    if (body.status != null) {
      const next = String(body.status).toLowerCase();
      if (["pending", "approved", "rejected"].includes(next)) {
        const prev = doc.status || "pending";
        doc.status = next;

        if (prev === "pending" && next !== "pending") {
          // delete image file if exists
          const stored = doc?.purchaseProof?.path || "";
          if (stored) {
            try {
              const abs = absFromStored(stored);
              if (abs) await fs.unlink(abs).catch(() => {});
            } catch (e) {
              console.warn("Failed to delete warranty image:", e);
            }
          }
          // clear reference
          doc.purchaseProof = undefined;
        }
      }
    }

    await doc.save();

    // Return a trimmed doc for UI update
    const payload = {
      _id: doc._id,
      name: doc.name,
      email: doc.email,
      phone: doc.phone,
      productName: doc.productName,
      serial: doc.serial,
      purchaseDate: doc.purchaseDate,
      purchasedFrom: doc.purchasedFrom,
      shopName: doc.shopName,
      status: doc.status,
      purchaseProof: doc.purchaseProof || null, // likely null after decision
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return NextResponse.json({ success: true, data: payload }, { status: 200 });
  } catch (e) {
    console.error("PATCH /api/admin/offline-registration/[id] error:", e);
    return NextResponse.json(
      { success: false, message: "Failed to update" },
      { status: 500 }
    );
  }
}
