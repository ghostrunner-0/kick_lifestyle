import ThankYouClient from "./ThankYouClient";

const BRAND = "KICK";

export const metadata = {
  title: `Order Placed | ${BRAND}`,
  description:
    `Thank you for your order at ${BRAND}. We’ve received it and sent a confirmation to your email.`,
  alternates: {
    canonical: "/thank-you",
  },
  openGraph: {
    title: `Order Placed | ${BRAND}`,
    description:
      `Your ${BRAND} order has been placed successfully. Keep your Order ID handy for support.`,
    url: "/thank-you",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Order Placed | ${BRAND}`,
    description:
      `Thanks for shopping with ${BRAND}. A confirmation email is on its way.`,
  },
};

export default async function Page({ params }) {
  const param = await params;
  return <ThankYouClient params={param} />;
}
