// app/(root)/(website)/page.jsx
import HomeClient from "./HomeClient";
import Script from "next/script";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

/* ...metadata/viewport unchanged... */

export default async function Page() {
  let initialBanners = [];
  let initialCategories = [];

  try {
    const r = await fetch(`${SITE_URL}/api/website/banners?active=true`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (r.ok) {
      const j = await r.json();
      if (j?.success && Array.isArray(j.data)) {
        initialBanners = [...j.data].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
      }
    } else {
      console.warn("[banners] non-OK:", r.status);
    }
  } catch (e) {
    console.warn("[banners] fetch failed:", e?.message || e);
  }

  try {
    const r = await fetch(`${SITE_URL}/api/website/category`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (r.ok) {
      const j = await r.json();
      if (j?.success && Array.isArray(j.data)) {
        initialCategories = j.data.filter((c) => c?.showOnWebsite);
      }
    } else {
      console.warn("[categories] non-OK:", r.status);
    }
  } catch (e) {
    console.warn("[categories] fetch failed:", e?.message || e);
  }

  return (
    <>
      {/* your JSON-LD scripts */}
      <HomeClient
        initialBanners={initialBanners}
        initialCategories={initialCategories}
      />
    </>
  );
}
