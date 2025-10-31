// app/(root)/(website)/product/[slug]/page.jsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
// If you want edge after this works locally, you can uncomment:
// export const runtime = "edge";

import ProductPageClient from "./ProductPageClient";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

const BRAND = "KICK LIFESTYLE";
const toTitle = (s = "") =>
  (s || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

function getBaseUrl() {
  // 1) Prefer explicit base
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;

  // 2) Infer from request headers (works in dev & prod)
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  let proto =
    h.get("x-forwarded-proto") ||
    (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host) ? "http" : "https");

  return `${proto}://${host}`;
}

async function getProduct(slug) {
  const base = getBaseUrl();
  const url = `${base}/api/website/products/get-by-slug/${encodeURIComponent(
    slug
  )}`;

  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return { _notFound: true };
  if (!res.ok) return null;

  const json = await res.json();
  return json?.success ? json.data : json;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const base = getBaseUrl();

  const product = await getProduct(slug);
  const name = toTitle(product?.name || slug || "Product");

  const title = `${name} | ${BRAND}`;
  const description =
    product?.shortDesc ||
    `Shop ${name} at ${BRAND}. Explore premium quality at an honest price.`;

  // Pick hero image → fallback to first media image → fallback null
  const imagePath =
    product?.heroImage?.path || product?.productMedia?.[0]?.path || null;

  // Form full URL for image (important for OG/Twitter)
  const imageUrl = imagePath ? `${base}${imagePath}` : `${base}/default-og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;

  const product = await getProduct(slug);
  if (!product || product?._notFound) notFound();

  // Client will fetch reviews (faster TTFB)
  return (
    <ProductPageClient
      slug={slug}
      initialProduct={product}
      initialReviewsSummary={null}
      initialReviews={null}
    />
  );
}
