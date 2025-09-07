// app/offline-registeration/page.jsx
import { Metadata } from "next";
import OfflineRegistrationClient from "./OfflineRegisterClient";

export const metadata = {
  title: "Offline Warranty Registration | Kick Lifestyle",
  description:
    "Register your product warranty for purchases from Kick Lifestyle, Daraz or other shops. Quick form with proof upload.",
  alternates: { canonical: "/offline-registeration" },
  openGraph: {
    title: "Offline Warranty Registration",
    description:
      "Register your product warranty for purchases from Kick Lifestyle, Daraz or other shops.",
    url: "/offline-registeration",
    type: "website",
  },
};

export default function Page() {
  return <OfflineRegistrationClient />;
}
