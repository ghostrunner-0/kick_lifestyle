import CorporateOrdersClient from "./CorporateOrdersClient";

const BRAND = "KICK";

export const metadata = {
  title: `Corporate Orders | ${BRAND}`,
  description: `Place bulk and corporate orders with ${BRAND}. Enjoy exclusive pricing, premium tech accessories, and reliable nationwide delivery for your organization.`,
  alternates: {
    canonical: "/corporate-orders",
  },
  openGraph: {
    title: `Corporate Orders | ${BRAND}`,
    description: `Get exclusive deals on bulk purchases from ${BRAND}. Perfect for corporate gifting, employee perks, and events.`,
    url: "/corporate-orders",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Corporate Orders | ${BRAND}`,
    description: `Shop premium gadgets in bulk with ${BRAND}. Corporate gifting and bulk order solutions made easy.`,
  },
};

export default function Page() {
  return <CorporateOrdersClient />;
}
