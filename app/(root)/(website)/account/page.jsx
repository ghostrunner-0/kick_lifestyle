import AccountClient from "./AccountClient";

export const metadata = {
  title: "My Account | KICK LIFESTYLE",
  description: "View your orders, warranties and saved addresses",
  alternates: { canonical: "/account" },
  openGraph: {
    title: "My Account",
    description: "View your orders, warranties and saved addresses",
    url: "/account",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "My Account",
    description: "View your orders, warranties and saved addresses.",
  },
};

export default function Page() {
  return <AccountClient />;
}
