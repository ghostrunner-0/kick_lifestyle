export const dynamic = "force-dynamic";

import OrderDetails from "./orderdetails";

export async function generateMetadata({ params }) {
  const p = await params;
  const displayId = p?.displayId || p?.id || "";
  const title = displayId
    ? `Order ${displayId} • My Account`
    : "Order • My Account";
  const description = displayId
    ? `View details, items, totals and tracking for order ${displayId}.`
    : "View your order details, items, totals and tracking.";

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

async function fetchOrder(displayId) {
  if (!displayId) return null;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  try {
    const res = await fetch(
      `${base}/api/website/orders/${encodeURIComponent(displayId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

export default async function ViewOrderPage({ params }) {
  const p = await params;
  const displayId = p?.displayId || p?.id || "";
  const initialOrder = await fetchOrder(displayId);

  return <OrderDetails displayId={displayId} initialOrder={initialOrder} />;
}
