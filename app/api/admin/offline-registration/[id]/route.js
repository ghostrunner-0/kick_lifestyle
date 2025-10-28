// app/api/admin/offline-registration/[id]/route.js
import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import mongoose from "mongoose";

import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import OfflineRegistrationRequest from "@/models/OfflineRegistrationRequest.model";
import WarrantyRegistration from "@/models/WarrantyRegistration.model";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model";

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
    // auth
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

    // ---------- Editable fields ----------
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
      const d = new Date(String(body.purchaseDate));
      if (!Number.isNaN(d.valueOf())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        doc.purchaseDate = d > today ? today : d;
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

    // ---------- Status change handling ----------
    let createdWarrantyId = null;

    if (body.status != null) {
      const next = String(body.status).toLowerCase();
      if (ALLOWED_STATUSES.has(next)) {
        const prev = doc.status || "pending";
        const movingFromPending = prev === "pending" && next !== "pending";
        const approvingNow = prev === "pending" && next === "approved";

        doc.status = next;

        // If approving now -> create warranty entry
        if (approvingNow) {
          // Gather product + variant information
          const productId = doc.productId
            ? new mongoose.Types.ObjectId(doc.productId)
            : null;

          let product = null;
          if (productId) {
            product = await Product.findById(productId, {
              name: 1,
              warrantyMonths: 1,
            }).lean();
          }

          // Support optional variant (if your request model stores it)
          // Try explicit doc.productVariantId, fall back to snapshot doc.productVariant?.id
          let variantDoc = null;
          let variantId = null;

          if (doc.productVariantId) {
            variantId = new mongoose.Types.ObjectId(doc.productVariantId);
          } else if (doc.productVariant?.id) {
            variantId = new mongoose.Types.ObjectId(doc.productVariant.id);
          }

          if (variantId) {
            variantDoc = await ProductVariant.findById(variantId, {
              variantName: 1,
              sku: 1,
              product: 1,
            }).lean();
          }

          // Build warranty payload
          const warrantyPayload = {
            channel: doc.purchasedFrom || "offline",
            // For offline, keep actual shop; for kick/daraz, set label
            shopName:
              doc.purchasedFrom === "offline"
                ? doc.shopName || ""
                : doc.purchasedFrom === "kick"
                ? "KICK LIFESTYLE"
                : "Daraz",
            customer: {
              name: doc.name || "",
              phone: doc.phoneNormalized || digits10(doc.phone),
            },
            items: [
              {
                product: {
                  productId: productId || null,
                  variantId: variantId || null,
                  productName: doc.productName || product?.name || "Product",
                  variantName:
                    variantDoc?.variantName || doc.productVariant?.name || "",
                },
                serial: doc.serial,
                warrantyMonths: Number.isFinite(product?.warrantyMonths)
                  ? product.warrantyMonths
                  : 0,
              },
            ],
            notes: `Auto-created from offline request ${String(
              doc._id
            )} on approval.`,
          };

          try {
            const created = await WarrantyRegistration.create(warrantyPayload);
            createdWarrantyId = created?._id || null;
          } catch (e) {
            // Handle duplicate serial (unique index on items.serial)
            if (e?.code === 11000) {
              // Serial already registered; we still proceed with approval & cleanup
              // You can also append a note to doc here if you want to track this situation.
              // No rethrow — continue.
            } else {
              throw e; // Other errors should abort the flow
            }
          }
        }

        // If leaving pending (approved OR rejected), clean image and clear reference
        if (movingFromPending) {
          const stored = doc?.purchaseProof?.path || "";
          if (stored) {
            try {
              const absPair = absFromStored(stored);
              if (absPair) {
                await fs
                  .unlink(absPair.absPrimary)
                  .catch(
                    async () =>
                      await fs.unlink(absPair.absLegacy).catch(() => {})
                  );
              }
            } catch (e) {
              console.warn("Failed to delete warranty image:", e?.message || e);
            }
          }
          doc.purchaseProof = undefined;
          // optionally stamp decision time
          doc.decidedAt = new Date();
        }
      }
    }

    await doc.save();

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
      productVariant: doc.productVariant || null, // snapshot if stored
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      warrantyId: createdWarrantyId, // <-- returns the created warranty id if any
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
