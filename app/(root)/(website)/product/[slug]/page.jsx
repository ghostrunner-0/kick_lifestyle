// app/(root)/(website)/product/[slug]/page.jsx
import ProductPageClient from "./ProductPageClient";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import axios from "axios";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BRAND = "KICK";
const FALLBACK_SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const CDN_BASE = process.env.NEXT_PUBLIC_CDN_URL || FALLBACK_SITE;

const abs = (p, origin = FALLBACK_SITE) => {
  if (!p) return `${origin}/og/default.jpg`;
  if (p.startsWith("http")) return p;
  const base = CDN_BASE || origin;
  return `${base}${p.startsWith("/") ? p : `/${p}`}`;
};

const money = (n) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "NPR",
        maximumFractionDigits: 0,
      }).format(n)
    : undefined;

const toTitle = (s = "") =>
  (s || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

/** MUST be async now */
async function getOrigin() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || new URL(FALLBACK_SITE).host;
  return `${proto}://${host}`;
}

/** server-side axios GET with tiny retry + 404 sentinel */
async function getJSON(url, tries = 2) {
  for (let i = 0; i <= tries; i++) {
    try {
      const res = await axios.get(url, { timeout: 6000 });
      return res.data;
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) return { _notFound: true };
      if (i === tries) return null;
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  return null;
}

async function getProduct(origin, slug) {
  const json = await getJSON(`${origin}/api/website/products/get-by-slug/${slug}`);
  if (json?._notFound) return { _notFound: true };
  return json?.success ? json.data : null;
}

async function getReviewSummary(origin, productId) {
  const json = await getJSON(
    `${origin}/api/website/reviews/summary?productId=${encodeURIComponent(productId)}`
  );
  return json?.success ? json.data : { average: 0, total: 0 };
}

async function getReviewsFirstPage(origin, productId, limit = 6) {
  const url = `${origin}/api/website/reviews?productId=${encodeURIComponent(
    productId
  )}&page=1&limit=${limit}&sort=newest`;
  const json = await getJSON(url);
  if (json?.success) {
    return {
      items: json.data.items || [],
      total: json.data.total || 0,
      page: 1,
      limit,
    };
  }
  return { items: [], total: 0, page: 1, limit };
}

/* ---------- Metadata ---------- */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const origin = await getOrigin(); // ✅ await

  const pRes = await getProduct(origin, slug);
  if (pRes?._notFound) {
    const title = `${toTitle(slug)} | ${BRAND}`;
    const description = `Shop ${toTitle(slug)} at ${BRAND}.`;
    const url = `${origin}/product/${slug}`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, siteName: BRAND, type: "website" }, // ✅ website
      twitter: { card: "summary_large_image", title, description },
    };
  }

  const p = pRes;
  const name = p?.name || toTitle(slug || "Product");
  const title = `${name} | ${BRAND}`;
  const baseDesc =
    p?.shortDesc ||
    (p?.category?.name ? `${p.category.name} from ${BRAND}.` : `Shop ${name} at ${BRAND}.`);
  const priced =
    typeof p?.specialPrice === "number" || typeof p?.mrp === "number"
      ? ` ${p?.specialPrice ? `Now ${money(p.specialPrice)}` : ""}${
          p?.specialPrice && p?.mrp
            ? ` (MRP ${money(p.mrp)})`
            : p?.mrp
            ? ` MRP ${money(p.mrp)}`
            : ""
        }`
      : "";
  const description = `${baseDesc}${priced}`.trim();

  // ✅ Prefer hero image strictly; fall back to first gallery image
  const hero = p?.heroImage?.path ? abs(p.heroImage.path, origin) : null;
  const ogImg =
    hero || abs(p?.productMedia?.[0]?.path, origin) || `${origin}/og/default.jpg`;
  const url = `${origin}/product/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: BRAND,
      type: "website", // ✅ valid OG type for Next metadata
      images: [{ url: ogImg, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImg],
    },
  };
}

/* ---------- Server page: single fetch then pass ---------- */
export default async function Page({ params }) {
  const { slug } = await params;
  const origin = await getOrigin(); // ✅ await

  const product = await getProduct(origin, slug);
  if (product?._notFound) notFound();

  const [reviewsSummary, reviewsFirstPage] = product?._id
    ? await Promise.all([
        getReviewSummary(origin, product._id),
        getReviewsFirstPage(origin, product._id, 6),
      ])
    : [{ average: 0, total: 0 }, { items: [], total: 0, page: 1, limit: 6 }];

  return (
    <ProductPageClient
      slug={slug}
      initialProduct={product}
      initialReviewsSummary={reviewsSummary}
      initialReviews={reviewsFirstPage}
    />
  );
}
