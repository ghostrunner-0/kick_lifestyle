// app/(root)/(website)/product/[slug]/page.jsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ProductPageClient from "./ProductPageClient";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import axios from "axios";

const BRAND = "KICK";

/* -------------------- helpers -------------------- */
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

/**
 * Resolve base:
 * - If NEXT_PUBLIC_BASE_URL is set, use it (e.g., https://kick.com.np)
 * - Otherwise build from current request (handles localhost/http nicely)
 */
function resolveBaseFromRequest() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  if (base) return base;

  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  let proto =
    h.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "development" ? "http" : "https");
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) proto = "http";
  return `${proto}://${host}`;
}

/* -------------- axios + tiny util -------------- */
async function getJSON(url) {
  const base = resolveBaseFromRequest(); // <- uses env var or request headers
  try {
    const { data } = await axios.get(`${base}${url}`, { timeout: 6000 });
    return data;
  } catch (e) {
    if (e?.response?.status === 404) return { _notFound: true };
    return null;
  }
}

async function getProduct(slug) {
  const json = await getJSON(`/api/website/products/get-by-slug/${encodeURIComponent(slug)}`);
  if (json?._notFound) return { _notFound: true };
  return json?.success ? json.data : null;
}

async function getReviewSummary(productId) {
  const json = await getJSON(
    `/api/website/reviews/summary?productId=${encodeURIComponent(productId)}`
  );
  return json?.success ? json.data : { average: 0, total: 0 };
}

async function getReviewsFirstPage(productId, limit = 6) {
  const json = await getJSON(
    `/api/website/reviews?productId=${encodeURIComponent(
      productId
    )}&page=1&limit=${limit}&sort=newest`
  );
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

/* -------------------- metadata -------------------- */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  // keep metadata lightweight (no API call needed)
  const name = toTitle(slug || "Product");
  const title = `${name} | ${BRAND}`;
  const description = `Shop ${name} at ${BRAND}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/* -------------------- page -------------------- */
export default async function Page({ params }) {
  const { slug } = await params;

  const product = await getProduct(slug);
  if (!product || product?._notFound) notFound();

  const [reviewsSummary, reviewsFirstPage] = await Promise.all([
    getReviewSummary(product._id),
    getReviewsFirstPage(product._id, 6),
  ]);

  // Optional: if API returns canonical slug different from URL, you could redirect here.
  // if (product.slug && product.slug !== slug) redirect(`/product/${product.slug}`);

  return (
    <ProductPageClient
      slug={slug}
      initialProduct={product}
      initialReviewsSummary={reviewsSummary}
      initialReviews={reviewsFirstPage}
    />
  );
}
