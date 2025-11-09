// app/(root)/(website)/product/[slug]/page.jsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;

  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ||
    (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host) ? "http" : "https");

  return `${proto}://${host}`;
}

async function getProduct(slug) {
  try {
    const base = getBaseUrl();
    const url = `${base}/api/website/products/get-by-slug/${encodeURIComponent(
      slug
    )}`;

    const res = await fetch(url, { cache: "no-store" });

    // HTTP-level 404 → hard not found
    if (res.status === 404) return { _notFound: true };

    // Any other bad HTTP status → treat as "no product"
    if (!res.ok) return null;

    const json = await res.json();

    // Handle your API contract:
    // { success:false, statusCode:404, message:"Product not found", data:{} }
    if (!json?.success) {
      if (json?.statusCode === 404) {
        return { _notFound: true };
      }
      return null; // some other failure
    }

    // Normal success path
    const data = json.data ?? json;
    if (!data || Object.keys(data).length === 0) {
      // empty data → also not found
      return { _notFound: true };
    }

    return data;
  } catch (err) {
    console.error("Error fetching product:", err);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const base = getBaseUrl();

  const product = await getProduct(slug);

  // If product missing or flagged not found → 404-style meta
  if (!product || product._notFound) {
    return {
      title: `Product Not Found | ${BRAND}`,
      description: `The requested product could not be found on ${BRAND}.`,
      robots: { index: false, follow: false },
    };
  }

  const name = toTitle(product?.name || slug || "Product");

  const title = `${name} | ${BRAND}`;
  const description =
    product?.shortDesc ||
    `Shop ${name} at ${BRAND}. Explore premium quality at an honest price.`;

  const imagePath =
    product?.heroImage?.path || product?.productMedia?.[0]?.path || null;
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

  // Final guard: if nothing useful → 404 page
  if (!product || product._notFound || !product?._id) {
    notFound();
  }

  return (
    <ProductPageClient
      slug={slug}
      initialProduct={product}
      initialReviewsSummary={null}
      initialReviews={null}
    />
  );
}
