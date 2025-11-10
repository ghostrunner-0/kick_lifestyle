// lib/analytics.js

import posthog from "posthog-js";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

/* ---------- Route guard: do not track admin ---------- */
function isAdminPath(path) {
  // Prefer explicit path if provided
  let p = path;

  if (!p && typeof window !== "undefined") {
    p = window.location.pathname || "";
  }

  if (!p) return false;

  const lower = String(p).toLowerCase();

  // Block /admin and anything under it
  return lower === "/admin" || lower.startsWith("/admin/");
}

function shouldTrack(path) {
  if (typeof window === "undefined") return false;
  if (isAdminPath(path)) return false;
  return true;
}

/* ---------- GA helper ---------- */
function gaEvent(name, params = {}) {
  if (typeof window === "undefined") return;
  if (!GA_ID) return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

/* ---------- PostHog helper ---------- */
function phEvent(name, props = {}) {
  if (typeof window === "undefined") return;
  if (!posthog) return;
  posthog.capture(name, props);
}

/* ---------- Facebook Pixel helper ---------- */
function fbEvent(name, params = {}) {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;
  try {
    window.fbq("track", name, params);
  } catch {}
}

/* =========================================================
 * Page View
 * =======================================================*/
export function trackPageView(options = {}) {
  if (typeof window === "undefined") return;

  const path =
    options.path ||
    (typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "");

  if (!shouldTrack(path)) return;

  const title =
    options.title || (typeof document !== "undefined" ? document.title : "");

  gaEvent("page_view", {
    page_location: window.location.href,
    page_path: path,
    page_title: title,
  });

  phEvent("$pageview", {
    $current_url: window.location.href,
    path,
    title,
  });

  fbEvent("PageView");
}

/* =========================================================
 * Product View
 * =======================================================*/
export function trackProductView({
  productId,
  name,
  category,
  price,
  currency = "NPR",
  variant,
}) {
  if (!shouldTrack()) return;

  const numericPrice = Number(price || 0);
  const item = {
    item_id: String(productId || name || ""),
    item_name: name,
    item_category: category,
    item_variant: variant,
    price: numericPrice,
  };

  // GA4: view_item
  gaEvent("view_item", {
    currency,
    value: numericPrice,
    items: [item],
  });

  // PostHog
  phEvent("view_item", {
    currency,
    value: numericPrice,
    ...item,
  });

  // Facebook Pixel: ViewContent
  fbEvent("ViewContent", {
    value: numericPrice,
    currency,
    content_type: "product",
    contents: [{ id: item.item_id, item_price: numericPrice }],
  });
}

/* =========================================================
 * Add to Cart
 * =======================================================*/
export function trackAddToCart({
  productId,
  name,
  category,
  price,
  quantity = 1,
  variant,
  currency = "NPR",
}) {
  if (!shouldTrack()) return;

  const numericPrice = Number(price || 0);
  const numericQty = Number(quantity || 1);
  const value = numericPrice * numericQty;

  const item = {
    item_id: String(productId || name || ""),
    item_name: name,
    item_category: category,
    item_variant: variant,
    price: numericPrice,
    quantity: numericQty,
  };

  gaEvent("add_to_cart", { currency, value, items: [item] });
  phEvent("add_to_cart", { currency, value, ...item });
  fbEvent("AddToCart", {
    value,
    currency,
    content_type: "product",
    contents: [
      { id: item.item_id, quantity: numericQty, item_price: numericPrice },
    ],
  });
}

/* =========================================================
 * Purchase
 * =======================================================*/
export function trackPurchase(order) {
  if (typeof window === "undefined" || !order) return;
  if (!shouldTrack()) return;

  const orderId =
    order.display_order_id ||
    order.orderNumber ||
    (order._id && order._id.toString && order._id.toString()) ||
    "";
  if (!orderId) return;
  if (window.__purchaseTrackedFor === orderId) return;
  window.__purchaseTrackedFor = orderId;

  const currency = order.amounts?.currency || "NPR";
  const total = Number(order.amounts?.total || 0);
  const shipping = Number(order.amounts?.shippingCost || 0);
  const codFee = Number(order.amounts?.codFee || 0);
  const discount = Number(order.amounts?.discount || 0);
  const couponCode = order.coupon?.code || null;

  const items =
    (order.items || []).map((item) => ({
      item_id: String(item.productId || item._id || item.name || ""),
      item_name: item.name,
      item_variant: item.variantName || null,
      price: Number(item.price || 0),
      quantity: Number(item.qty || 1),
    })) || [];

  const isPaidOnline =
    order.paymentMethod !== "cod" &&
    order.payment &&
    order.payment.status === "paid";
  const isCodConfirmed =
    order.paymentMethod === "cod" &&
    ["processing", "ready to pack", "ready to ship", "completed"].includes(
      order.status
    );
  if (!isPaidOnline && !isCodConfirmed) return;

  // GA4
  gaEvent("purchase", {
    transaction_id: String(orderId),
    currency,
    value: total,
    shipping: shipping + codFee,
    discount,
    coupon: couponCode || undefined,
    items,
  });

  // PostHog
  phEvent("purchase", {
    order_id: orderId,
    value: total,
    currency,
    shipping,
    cod_fee: codFee,
    discount,
    coupon: couponCode,
    payment_method: order.paymentMethod,
    payment_status: order.payment?.status || null,
    order_status: order.status,
    items,
  });

  // PostHog (line items)
  if (Array.isArray(items) && items.length) {
    items.forEach((it) => {
      const lineValue = Number(it.price || 0) * Number(it.quantity || 1);
      phEvent("purchase_item", {
        order_id: orderId,
        item_id: it.item_id,
        item_name: it.item_name,
        item_variant: it.item_variant,
        price: it.price,
        quantity: it.quantity,
        value: lineValue,
        currency,
        coupon: couponCode,
        payment_method: order.paymentMethod,
        payment_status: order.payment?.status || null,
        order_status: order.status,
      });
    });
  }

  // Facebook Pixel: Purchase
  fbEvent("Purchase", {
    value: total,
    currency,
    contents: items.map((it) => ({
      id: it.item_id,
      quantity: it.quantity,
      item_price: it.price,
    })),
    content_type: "product",
  });
}
