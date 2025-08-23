import AccountClient from "./AccountClient";

export const metadata = {
  title: "My Account | KICK",
  description:
    "View your orders, warranties, saved addresses, and support tickets.",
  alternates: { canonical: "/account" },
  openGraph: {
    title: "My Account",
    description:
      "View your orders, warranties, saved addresses, and support tickets.",
    url: "/account", 
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "My Account",
    description:
      "View your orders, warranties, saved addresses, and support tickets.",
  },
};

export default function Page() {
  return <AccountClient />;
}
