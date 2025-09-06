// app/api/homepage-banner/route.js
import HomePageBanner from "@/models/HomePageBanner.model";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { response } from "@/lib/helperFunctions";

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET: public (storefront reads the banner)
// If you want it admin-only, uncomment the auth block below.
export async function GET() {
  try {
    await connectDB();

    // // Uncomment to restrict GET to admins only:
    // const admin = await isAuthenticated("admin");
    // if (!admin) return response(false, 403, "User Unauthorized");

    const doc = await HomePageBanner.getSingleton();
    return response(true, 200, "Homepage banner", doc || null);
  } catch (e) {
    console.error("GET /homepage-banner failed:", e);
    return response(false, 500, "Failed to fetch banner");
  }
}

// PUT: admin-only upsert
export async function PUT(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const body = await req.json();
    const img = body?.image;

    if (!img?._id || !img?.path) {
      return response(false, 400, "image._id and image.path are required");
    }

    const image = {
      _id: String(img._id),
      path: String(img.path),
      alt: typeof img.alt === "string" ? img.alt : "",
      url: typeof img.url === "string" ? img.url : "",
    };

    const updated = await HomePageBanner.upsertImage(image);
    return response(true, 200, "Homepage banner saved", updated);
  } catch (e) {
    console.error("PUT /homepage-banner failed:", e);
    return response(false, 500, "Failed to save banner");
  }
}
