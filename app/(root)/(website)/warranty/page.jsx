import WarrantyHubClient from "./WarrantyHubClient";

const BRAND = "KICK";

export const metadata = {
  title: `Warranty Center | ${BRAND}`,
  description:
    `Register your ${BRAND} product warranty or check remaining coverage by phone number. Fast, simple, and secure.`,
  alternates: { canonical: "/warranty" },
  openGraph: {
    title: `Warranty Center | ${BRAND}`,
    description:
      `Register or check ${BRAND} warranties online. Quick registration and coverage lookup.`,
    url: "/warranty",
    type: "website",
    siteName: BRAND,
  },
  twitter: {
    card: "summary",
    title: `Warranty Center | ${BRAND}`,
    description:
      `Register your ${BRAND} warranty or check coverage in minutes.`,
  },
};

export default function Page() {
  return <WarrantyHubClient />;
}
