import CategoryPageClient from "./CategoryPageClient";

const BRAND = "KICK";

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

  return {
    title: `${title} | ${BRAND}`,
    description: `Explore the best ${title} at ${BRAND}. Shop premium earbuds, smartwatches, and lifestyle gadgets with warranty, fast delivery, and exclusive offers.`,
    alternates: {
      canonical: `/category/${param.slug}`,
    },
    openGraph: {
      title: `${title} | ${BRAND}`,
      description: `Browse top-quality ${title} from ${BRAND}.`,
      url: `/category/${param.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} | ${BRAND}`,
      description: `Shop the latest ${title} online at ${BRAND}. Fast shipping & premium quality.`,
    },
  };
}

export default async function Page({ params }) {
  const para = await params;
  return <CategoryPageClient params={para} />;
}
