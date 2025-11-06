// lib/mongoSearch/ordersSearch.js
import mongoose from "mongoose";

/** Escape a string for use inside a RegExp */
export function esc(s = "") {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse "field:dir" (e.g., "createdAt:desc", "amounts.total:asc").
 * Fallback: createdAt desc.
 */
export function parseSort(raw = "createdAt:desc") {
  const s = String(raw || "").trim();
  const [field, dir] = s.split(":");
  const key = field && field.length ? field : "createdAt";
  const v =
    typeof dir === "string" && /^(asc|desc)$/i.test(dir)
      ? dir.toLowerCase() === "asc"
        ? 1
        : -1
      : -1;
  return { [key]: v };
}

/**
 * Build a powerful multi-token search for Orders.
 * AND across tokens, OR across fields.
 *
 * Fields considered:
 * - display_order_id (partial, case-insensitive)
 * - display_order_seq (exact number or from "#1234")
 * - orderNumber (partial)
 * - _id (24-hex exact)
 * - user.email (partial)
 * - customer.fullName / customerName (partial)
 * - customer.phone / customerPhone (partial; digits-only also supported)
 * - address.(cityLabel|zoneLabel|areaLabel) (partial)
 * - items.(name|variantName) (partial)
 * - paymentMethod (partial)
 * - status (partial)
 */
export function buildOrderSearchQuery(q) {
  const full = String(q || "").trim();
  if (!full) return {};

  const tokens = full.split(/\s+/).filter(Boolean);
  if (!tokens.length) return {};

  const andClauses = [];

  for (const tokRaw of tokens) {
    const tok = String(tokRaw);
    const orClauses = [];

    const rx = new RegExp(esc(tok), "i");
    const digits = tok.replace(/\D+/g, "");

    // 1) display_order_id, orderNumber, user.email
    orClauses.push({ display_order_id: rx });
    orClauses.push({ orderNumber: rx });
    orClauses.push({ "user.email": rx });

    // 2) customer names / phones (flat + nested)
    orClauses.push({ "customer.fullName": rx });
    orClauses.push({ customerName: rx });

    orClauses.push({ "customer.phone": rx });
    orClauses.push({ customerPhone: rx });

    // 3) address snapshot
    orClauses.push({ "address.cityLabel": rx });
    orClauses.push({ "address.zoneLabel": rx });
    orClauses.push({ "address.areaLabel": rx });

    // 4) items: name / variantName
    orClauses.push({ items: { $elemMatch: { name: rx } } });
    orClauses.push({ items: { $elemMatch: { variantName: rx } } });

    // 5) payment method / status
    orClauses.push({ paymentMethod: rx });
    orClauses.push({ status: rx });

    // 6) Exact ObjectId
    if (/^[a-f\d]{24}$/i.test(tok)) {
      try {
        orClauses.push({ _id: new mongoose.Types.ObjectId(tok) });
      } catch {}
    }

    // 7) display_order_seq from token like "#1234" or pure digits
    const seqMatch = tok.match(/^#?(\d{3,})$/);
    if (seqMatch) {
      const seq = Number(seqMatch[1]);
      if (!Number.isNaN(seq)) {
        orClauses.push({ display_order_seq: seq });
      }
    }

    // 8) phone digits contains (≥5)
    if (digits.length >= 5) {
      const rxDigits = new RegExp(digits); // bare digits anywhere
      orClauses.push({ "customer.phone": rxDigits });
      orClauses.push({ customerPhone: rxDigits });
    }

    // Constrain: this token must match at least one of these fields
    andClauses.push({ $or: orClauses });
  }

  return { $and: andClauses };
}
