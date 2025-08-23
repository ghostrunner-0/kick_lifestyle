import WarrantyCheckClient from "./WarrantyCheckClient";

const BRAND = "KICK";

export const metadata = {
  title: `Warranty Lookup | ${BRAND}`,
  description:
    `Check your ${BRAND} product warranty by phone number. Optionally filter with Order ID or the last 4 digits of your serial.`,
  alternates: { canonical: "/warranty/check" },
  openGraph: {
    title: `Warranty Lookup | ${BRAND}`,
    description:
      `Look up ${BRAND} warranty coverage and days remaining with your phone number.`,
    url: "/warranty/check",
    type: "website",
    siteName: BRAND,
  },
  twitter: {
    card: "summary",
    title: `Warranty Lookup | ${BRAND}`,
    description:
      `Quickly check ${BRAND} warranty coverage using your phone number.`,
  },
};

export default function Page() {
  return <WarrantyCheckClient />;
}
