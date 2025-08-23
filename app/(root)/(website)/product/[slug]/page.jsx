// app/(root)/(website)/product/[slug]/page.jsx
import ProductPageClient from "./ProductPageClient";

const BRAND = "KICK";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const CDN_BASE = process.env.NEXT_PUBLIC_CDN_URL || SITE_URL;

/* helpers */
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

async function getProduct(slug) {
  try {
    const res = await fetch(
      `${SITE_URL}/api/website/products/get-by-slug/${slug}`,
      {
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? json.data : null;
  } catch {
    return null;
  }
}

/* Dynamic metadata */
export async function generateMetadata({ params }) {
  const param = await params;
  const { slug } = param || {};
  const p = await getProduct(slug);

  const nameFromSlug = toTitle(slug || "Product");
  const name = p?.name || nameFromSlug; // ✅ always include product name (or slug fallback)
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
      type: "website", // ✅ fix: Next.js doesn't allow "product"
      images: [
        {
          url: ogImg,
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
      images: [ogImg],
    },
  };
}

/* Server component wrapper that renders your client page */
export default function Page() {
  return <ProductPageClient />;
}
