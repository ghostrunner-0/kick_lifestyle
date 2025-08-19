import { connectDB } from "@/lib/DB";
import { isAuthenticated } from "@/lib/Authentication";
import { response } from "@/lib/helperFunctions";
import PaymentQRConfig from "@/models/PaymentQrConfig.model"; // ← ensure the casing/path matches

// GET /api/admin/payments/qr/config
export async function GET() {
  try {
    await connectDB();
    const doc = await PaymentQRConfig.findById("active").lean();
    // Always return success so the admin UI can show an empty form if not found
    return response(true, 200, "ok", doc || null);
  } catch (error) {
    return response(false, 500, error?.message || "Server error");
  }
}

// Shared validator
function validatePayload(payload) {
  const { displayName, image } = payload ?? {};
  if (!displayName || typeof displayName !== "string") {
    throw new Error("displayName is required");
  }
  if (!image || typeof image !== "object") {
    throw new Error("image is required");
  }
  if (!image._id || !image.path) {
    throw new Error("image must include _id and path");
  }
  return {
    displayName: displayName.trim(),
    image: {
      _id: String(image._id),
      alt: String(image.alt || ""),
      path: String(image.path),
    },
  };
}

// POST /api/admin/payments/qr/config  (create or upsert)
export async function POST(req) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return response(false, 401, "admin not authenticated");

    await connectDB();

    const body = await req.json();
    // Accept either { data: {...} } or raw {...}
    const payload = body?.data ?? body;
    const parsed = validatePayload(payload);

    const doc = await PaymentQRConfig.findByIdAndUpdate(
      "active",
      { $set: parsed },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    // IMPORTANT: return the doc directly as `data`, not { data: doc }
    return response(true, 201, "QR config saved", doc);
  } catch (error) {
    return response(false, 400, error?.message || "Invalid payload");
  }
}

// PUT /api/admin/payments/qr/config  (update)
export async function PUT(req) {
  try {
    const admin = isAuthenticated("admin");
    if (!admin) return response(false, 401, "admin not authenticated");

    await connectDB();

    const body = await req.json();
    const payload = body?.data ?? body;
    const parsed = validatePayload(payload);

    const doc = await PaymentQRConfig.findByIdAndUpdate(
      "active",
      { $set: parsed },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return response(true, 200, "QR config updated", doc);
  } catch (error) {
    return response(false, 400, error?.message || "Invalid payload");
  }
}
