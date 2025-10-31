import CategoryPageClient from "./CategoryPageClient";

const BRAND = "KICK LIFESTYLE";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kick.com.np";

// helper: slug → "True Wireless Earbuds"
const toTitle = (s = "") =>
  s
    .replace(/[-_]/g, " ") // replace - and _ with spaces
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase()); // capitalize each word

export async function generateMetadata({ params }) {
  const param = await params;
  const title = toTitle(param.slug);

  const pageTitle = `${title} | ${BRAND}`;
  const pageDesc = `Explore the best ${title} at ${BRAND}. Shop premium earbuds, smartwatches, and lifestyle gadgets with warranty, fast delivery, and exclusive offers.`;
  const canonicalUrl = `${SITE_URL}/category/${param.slug}`;
  const ogImage = `${SITE_URL}/meta-images/${param.slug}.png`; // optional dynamic fallback
  const fallbackImage = `${SITE_URL}/meta-images/default-category.png`;

  return {
    metadataBase: new URL(SITE_URL),
    title: pageTitle,
    description: pageDesc,

    alternates: { canonical: `/category/${param.slug}` },

    openGraph: {
      type: "website",
      url: canonicalUrl,
      siteName: BRAND,
      title: pageTitle,
      description: `Browse top-quality ${title} from ${BRAND}.`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${title} — ${BRAND}`,
        },
        {
          url: fallbackImage,
          width: 1200,
          height: 630,
          alt: `${BRAND} — Category Fallback`,
        },
      ],
      locale: "en_NP",
      alternateLocale: ["ne_NP", "en_US"],
    },

    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: `Shop the latest ${title} online at ${BRAND}. Fast shipping & premium quality.`,
      images: [ogImage, fallbackImage],
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
  };
}

export default async function Page({ params }) {
  const para = await params;
  return <CategoryPageClient params={para} />;
}
