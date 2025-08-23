import CheckoutClient from "./CheckoutClient";

const BRAND = "KICK";

export const metadata = {
  title: `Checkout | ${BRAND}`,
  description: `Securely complete your purchase at ${BRAND}. Review your cart, enter delivery details, and place your order with confidence.`,
  alternates: {
    canonical: "/checkout",
  },
  openGraph: {
    title: `Checkout | ${BRAND}`,
    description: `Finish your shopping journey at ${BRAND}. Fast, secure, and easy checkout experience.`,
    url: "/checkout",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Checkout | ${BRAND}`,
    description: `Complete your order at ${BRAND} with our secure and hassle-free checkout process.`,
  },
};

export default function Page() {
  return <CheckoutClient />;
}
