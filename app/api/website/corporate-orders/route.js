import { connectDB } from "@/lib/DB";
import { response, catchError } from "@/lib/helperFunctions";
import CorporateOrder from "@/models/CorporateOrder.model";

export const dynamic = "force-dynamic";

// small helpers
const digits10 = (s) => (String(s || "").match(/\d+/g) || []).join("").slice(-10);
const toNumOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const {
      companyName,
      contactName,
      email,
      phone,
      preferredContact = "email",
      address = "",
      message = "",
      items = [],
      budgetTotal = null,
    } = body || {};

    // Basic validation
    if (!companyName?.trim()) return response(false, 400, "Company name is required");
    if (!contactName?.trim()) return response(false, 400, "Contact name is required");
    if (!email?.trim())       return response(false, 400, "Email is required");
    if (!phone?.trim())       return response(false, 400, "Phone is required");

    const normPhone = digits10(phone);
    if (normPhone.length < 7) return response(false, 400, "Phone looks invalid");

    // Items validation
    const cleanItems = []
      .concat(items || [])
      .map((it) => ({
        productId:   it?.productId || null,
        variantId:   it?.variantId || null,
        productName: String(it?.productName || "").trim(),
        quantity:    Number(it?.quantity || 0),
        targetPrice: toNumOrNull(it?.targetPrice),
        note:        String(it?.note || "").trim(),
      }))
      .filter((it) => it.productName && it.quantity > 0);

    if (!cleanItems.length) {
      return response(false, 400, "Add at least one line item with product name and quantity");
    }

    // Capture request meta
    const headers = Object.fromEntries(req.headers);
    const doc = await CorporateOrder.create({
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      email: email.trim().toLowerCase(),
      phone: normPhone,
      preferredContact,
      address: address || "",
      message: message || "",
      items: cleanItems,
      budgetTotal: toNumOrNull(budgetTotal),

      meta: {
        ip: headers["x-forwarded-for"]?.split(",")?.[0]?.trim() || headers["x-real-ip"] || "",
        userAgent: headers["user-agent"] || "",
        referer: headers["referer"] || headers["referrer"] || "",
      },
    });

    return response(true, 201, "Corporate order submitted", {
      id: String(doc._id),
      createdAt: doc.createdAt,
      status: doc.status,
    });
  } catch (err) {
    return catchError(err, "Failed to submit corporate order");
  }
}
