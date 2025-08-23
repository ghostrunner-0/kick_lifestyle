// app/(root)/(website)/khalti-return/page.jsx
import KhaltiReturnClient from "./KhaltiReturnClient";

const BRAND = "KICK";

export const metadata = {
  title: `Khalti Payment | ${BRAND}`,
  description:
    `Returning from Khalti. We’re verifying your payment and will redirect you to your order confirmation if successful.`,
  alternates: { canonical: "/khalti-return" },
  openGraph: {
    title: `Khalti Payment | ${BRAND}`,
    description:
      `We’re verifying your Khalti payment. You’ll be redirected to your order confirmation once confirmed.`,
    url: "/khalti-return",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Khalti Payment | ${BRAND}`,
    description:
      `Verifying your Khalti payment and finalizing your order at ${BRAND}.`,
  },
};

export default function Page() {
  return <KhaltiReturnClient />;
}
