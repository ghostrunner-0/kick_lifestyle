import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import mongoose from "mongoose";

import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import OfflineRegistrationRequest from "@/models/OfflineRegistrationRequest.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_STATUSES = new Set(["pending", "approved", "rejected"]);

const digits10 = (s) =>
  (String(s || "").match(/\d+/g) || []).join("").slice(0, 10);

// map stored `/offline-registration/uuid.ext` or legacy `/offline-registeration/uuid.ext` to absolute
function absFromStored(storedPath) {
  const bases = ["/offline-registration/", "/offline-registeration/"];
  const base = bases.find((b) => storedPath && storedPath.startsWith(b));
  if (!base) return null;
  const filename = path.basename(storedPath);
  // try primary then legacy
  const absPrimary = path.join(process.cwd(), "offline-registration", filename);
  const absLegacy = path.join(process.cwd(), "offline-registeration", filename);
  return { absPrimary, absLegacy };
}

export async function PATCH(req, { params }) {
  try {
    // ✅ allow admin + sales
    const allowed = await isAuthenticated(["admin", "sales"]);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "admin not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();
    const param = await params;
    const id = String(param?.id || "");
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid id" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const doc = await OfflineRegistrationRequest.findById(id);
    if (!doc) {
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );
    }

    // ----- Editable fields -----
    if (body.name != null) doc.name = String(body.name).trim();

    if (body.email != null) doc.email = String(body.email).trim().toLowerCase();

    if (body.phone != null) {
      doc.phone = String(body.phone).trim();
      doc.phoneNormalized = digits10(doc.phone);
    }

    if (body.productName != null) {
      doc.productName = String(body.productName).trim();
    }

    if (body.serial != null) {
      doc.serial = String(body.serial).trim().toUpperCase();
    }

    if (body.purchaseDate != null) {
      // cap at today, ignore invalid
      const d = new Date(String(body.purchaseDate));
      if (!Number.isNaN(d.valueOf())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (d > today) doc.purchaseDate = today;
        else doc.purchaseDate = d;
      }
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

    // ----- Status change → optionally delete image -----
    if (body.status != null) {
      const next = String(body.status).toLowerCase();
      if (ALLOWED_STATUSES.has(next)) {
        const prev = doc.status || "pending";
        doc.status = next;

        if (prev === "pending" && next !== "pending") {
          const stored = doc?.purchaseProof?.path || "";
          if (stored) {
            try {
              const absPair = absFromStored(stored);
              if (absPair) {
                // try primary, then legacy
                await fs.unlink(absPair.absPrimary).catch(async () => {
                  await fs.unlink(absPair.absLegacy).catch(() => {});
                });
              }
            } catch (e) {
              console.warn("Failed to delete warranty image:", e?.message || e);
            }
          }
          // clear reference after decision
          doc.purchaseProof = undefined;
        }
      }
    }

    await doc.save();

    // minimal payload for UI
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
      purchaseProof: doc.purchaseProof || null,
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
