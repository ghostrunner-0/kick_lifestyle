// app/api/website/warranty-lookup/route.js
import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import WarrantyRegistration from "@/models/WarrantyRegistration.model";

export const dynamic = "force-dynamic";

/* ------------ helpers ------------ */
const digits10 = (s) =>
  (String(s || "").match(/\d+/g) || []).join("").slice(-10);

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // handle month rollover (e.g., Jan 31 + 1 month)
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function daysLeftFrom(startISO, months) {
  if (!months || months <= 0) return 0;
  const start = new Date(startISO);
  const exp = addMonths(start, months);
  const now = new Date();
  const diffDays = Math.floor((exp - now) / (24 * 60 * 60 * 1000));
  return Math.max(0, diffDays);
}

/**
 * GET /api/website/warranty-lookup?phone=98XXXXXXXX&hint=optional
 *
 * - phone (required): we normalize to the last 10 digits
 * - hint  (optional): order id fragment, product/variant text, or serial (full/last4)
 *
 * Returns:
 * {
 *   success, statusCode, message,
 *   data: {
 *     phone, totalRegistrations, totalItems,
 *     registrations: [
 *       {
 *         registrationId, orderId, channel, shopName, createdAt,
 *         customer: { name, phone },
 *         items: [{ productName, variantName, warrantyMonths, daysLeft, serialMasked }],
 *         itemsCount
 *       }
 *     ]
 *   }
 * }
 */
export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const phoneRaw = url.searchParams.get("phone") || "";
    const hintRaw = (url.searchParams.get("hint") || "").trim();

    const phone = digits10(phoneRaw);
    if (!phone || phone.length !== 10) {
      return response(false, 400, "Invalid phone number (need last 10 digits)");
    }

    // Fetch registrations for this phone, newest first
    const regs = await WarrantyRegistration.find(
      { "customer.phone": phone },
      { notes: 0 }
    )
      .sort({ createdAt: -1 })
      .lean();

    if (!regs.length) {
      return response(true, 200, "Lookup success", {
        phone,
        totalRegistrations: 0,
        totalItems: 0,
        registrations: [],
      });
    }

    const registrations = [];
    let totalItems = 0;

    for (const r of regs) {
      const createdAt = r.createdAt || new Date().toISOString();
      let items = Array.isArray(r.items) ? r.items : [];

      // Optional narrowing by hint
      if (hintRaw) {
        const hintLower = hintRaw.toLowerCase();
        const orderStr = r.orderId ? String(r.orderId) : "";
        const matchOrder = orderStr && orderStr.toLowerCase().includes(hintLower);

        items = items.filter((it) => {
          const s = String(it?.serial || "");
          const last4 = s.slice(-4);
          const pn = (it?.product?.productName || it?.productName || "").toLowerCase();
          const vn = (it?.product?.variantName || it?.variantName || "").toLowerCase();
          return (
            matchOrder ||
            (s && (s.includes(hintRaw) || last4 === hintRaw)) ||
            pn.includes(hintLower) ||
            vn.includes(hintLower)
          );
        });
      }

      if (!items.length) continue;

      const mappedItems = items.map((it) => {
        const months = Number(
          it?.warrantyMonths ?? r?.warrantyMonths ?? 0
        ) || 0;

        const serial = String(it?.serial || "");
        const masked = serial ? `•••• ${serial.slice(-4)}` : "—";

        return {
          productName: it?.product?.productName || it?.productName || "Product",
          variantName: it?.product?.variantName || it?.variantName || "",
          warrantyMonths: months,
          daysLeft: months > 0 ? daysLeftFrom(createdAt, months) : 0,
          serialMasked: masked,
        };
      });

      registrations.push({
        registrationId: String(r._id),
        orderId: r.orderId ? String(r.orderId) : null,
        channel: r.channel || "",
        shopName: r.shopName || "",
        createdAt,
        customer: {
          name: r?.customer?.name || "",
          phone: r?.customer?.phone || "",
        },
        items: mappedItems,
        itemsCount: mappedItems.length,
      });

      totalItems += mappedItems.length;
    }

    return response(true, 200, "Lookup success", {
      phone,
      totalRegistrations: registrations.length,
      totalItems,
      registrations,
    });
  } catch (err) {
    return catchError(err, "Failed to lookup warranty");        
  }
}
