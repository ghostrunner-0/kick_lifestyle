export const dynamic = "force-dynamic";

import OrderDetails from "./orderdetails";

const BRAND = "KICK LIFESTYLE";
const BRAND_LONG = "Kick Lifestyle";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";
const OG_IMAGE = `${SITE_URL}/meta-images/logo.png`; // ✅ default brand logo

export async function generateMetadata({ params }) {
  const p = await params;
  const id = p?.id || "";

  const title = id
    ? `Order ${id} • View Order | ${BRAND}`
    : `View Order | ${BRAND}`;
  const description = id
    ? `View items, totals, and tracking for order ${id} placed at ${BRAND_LONG}.`
    : `Check your order details, items, totals, and tracking information at ${BRAND_LONG}.`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: id ? `/view-order/${id}` : "/view-order",
    },
    openGraph: {
      type: "website",
      url: id ? `${SITE_URL}/view-order/${id}` : `${SITE_URL}/view-order`,
      siteName: BRAND_LONG,
      title,
      description,
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${BRAND_LONG} — Order Details`,
        },
      ],
      locale: "en_NP",
      alternateLocale: ["ne_NP", "en_US"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
    robots: {
      index: false, // ❌ Private customer page (should not be indexed)
      follow: false,
      googleBot: {
        index: false,
        follow: false,
        "max-snippet": -1,
        "max-image-preview": "none",
        "max-video-preview": -1,
      },
    },
    category: "orders",
    applicationName: BRAND_LONG,
    creator: BRAND,
    publisher: BRAND_LONG,
    viewport: {
      width: "device-width",
      initialScale: 1,
      maximumScale: 5,
      viewportFit: "cover",
    },
  };
}

async function fetchOrder(id) {
  if (!id) return null;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  try {
    const res = await fetch(
      `${base}/api/website/orders/${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

export default async function ViewOrderPage({ params }) {
  const p = await params;
  const id = p?.id || "";
  const initialOrder = await fetchOrder(id);

  return <OrderDetails id={id} initialOrder={initialOrder} />;
}
