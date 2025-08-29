// app/(root)/(website)/product/[slug]/page.jsx
import ProductPageClient from "./ProductPageClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic"; // render on every request
export const revalidate = 0;

const BRAND = "KICK";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const CDN_BASE = process.env.NEXT_PUBLIC_CDN_URL || SITE_URL;

const abs = (p) => {
  if (!p) return `${SITE_URL}/og/default.jpg`;
  if (p.startsWith("http")) return p;
  return `${CDN_BASE}${p.startsWith("/") ? p : `/${p}`}`;
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
  s
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

async function getJSON(url, init) {
  try {
    const res = await fetch(url, {
      cache: "no-store", // ensure SSR fresh on request
      ...init,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getProduct(slug) {
  const json = await getJSON(
    `${SITE_URL}/api/website/products/get-by-slug/${slug}`
  );
  return json?.success ? json.data : null;
}

async function getReviewSummary(productId) {
  const json = await getJSON(
    `${SITE_URL}/api/website/reviews/summary?productId=${encodeURIComponent(
      productId
    )}`
  );
  return json?.success ? json.data : { average: 0, total: 0 };
}

async function getReviewsFirstPage(productId, limit = 6) {
  const url = `${SITE_URL}/api/website/reviews?productId=${encodeURIComponent(
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

/* Dynamic metadata */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);

  const nameFromSlug = toTitle(slug || "Product");
  const name = p?.name || nameFromSlug;
  const title = `${name} | ${BRAND}`;

  const baseDesc =
    p?.shortDesc ||
    (p?.category?.name
      ? `${p.category.name} from ${BRAND}.`
      : `Shop ${name} at ${BRAND}.`);

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

  const ogImg =
    abs(p?.heroImage?.path) ||
    abs(p?.productMedia?.[0]?.path) ||
    `${SITE_URL}/og/default.jpg`;

  const url = `/product/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: BRAND,
      type: "website",
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

/* Server component that fetches EVERYTHING up front and hydrates the client */
export default async function Page({ params }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product?._id) {
    // optional: show a 404 if product not found
    notFound();
  }

  // Fetch summary + first page of reviews in parallel
  const [summary, firstPage] = await Promise.all([
    getReviewSummary(product._id),
    getReviewsFirstPage(product._id, 6),
  ]);

  return (
    <ProductPageClient
      initialProduct={product}
      initialReviewsSummary={summary}
      initialReviews={firstPage}
    />
  );
}
