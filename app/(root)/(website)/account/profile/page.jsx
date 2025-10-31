// app/(root)/(account)/profile/page.jsx
import ProfileClient from "./ProfileClient";
import { headers, cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Edit Profile | Kick Lifestyle Account",
  description:
    "Manage your name, phone number, and password settings for your Kick account.",
  alternates: { canonical: "/account/profile" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Edit Profile | Kick Lifestyle Account",
    description:
      "Manage your name, phone number, and password settings for your Kick account.",
    url: "https://www.kick.com.np/account/profile",
    siteName: "Kick",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Edit Profile | Kick Lifestyle Account",
    description:
      "Manage your name, phone number, and password settings for your Kick account.",
  },
};

// Prefer env, else reconstruct from incoming request
function getBaseUrl() {
  const envBase =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envBase) return envBase.replace(/\/$/, "");
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  return `${proto}://${host}`;
}

// Build a proper Cookie header from Next's async cookies()
async function cookieHeader() {
  const jar = await cookies();
  return jar
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");
}

async function getProfileSSR() {
  try {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/auth/me`, {
      cache: "no-store",
      headers: { cookie: await cookieHeader() },
      next: { revalidate: 0 },
    });

    let json = null;
    try {
      json = await res.json();
    } catch {
      /* ignore parse errors */
    }

    if (res.ok && (json?.data || json?.user)) {
      return { ok: true, data: json.data ?? json.user, error: "" };
    }
    return {
      ok: false,
      data: null,
      error: json?.message || `Failed to load profile (${res.status})`,
    };
  } catch (e) {
    return {
      ok: false,
      data: null,
      error: e?.message || "Profile fetch failed",
    };
  }
}

export default async function Page() {
  const { ok, data, error } = await getProfileSSR();
  return (
    <ProfileClient
      initialProfile={ok ? data : null}
      initialError={ok ? "" : error}
    />
  );
}
