// /lib/darazMini.js
import crypto from "node:crypto";

/**
 * Daraz endpoints per country
 */
const BASES = {
  PK: "https://api.daraz.pk/rest",
  BD: "https://api.daraz.com.bd/rest",
  LK: "https://api.daraz.lk/rest",
  NP: "https://api.daraz.com.np/rest",
  MM: "https://api.shop.com.mm/rest",
};

export function darazBase() {
  const c = (process.env.DARAZ_COUNTRY || "NP").toUpperCase();
  return BASES[c] || BASES.NP;
}

/**
 * Drop undefined / null / "" so we sign exactly what we send
 */
function cleanParams(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/**
 * Daraz/Lazada HMAC-SHA256 signing
 *   plain = apiPath + concat(sorted(params){ key + value })
 *   sign  = UPPERCASE_HEX( HMAC_SHA256(plain, appSecret) )
 */
function sign(appSecret, apiPath, params) {
  const keys = Object.keys(params).sort();
  let plain = apiPath;
  for (const k of keys) {
    plain += k + String(params[k]);
  }
  return crypto.createHmac("sha256", appSecret).update(plain).digest("hex").toUpperCase();
}

/**
 * Low-level REST caller (GET or POST form-encoded)
 * Ensures cleaned params are used both for signing and transmission.
 */
async function callRest(apiPath, params = {}, method = "GET") {
  const app_key = process.env.DARAZ_APP_KEY;
  const app_secret = process.env.DARAZ_APP_SECRET;
  if (!app_key || !app_secret) {
    throw new Error("Daraz app credentials are not configured");
  }

  const base = darazBase();

  const baseParams = {
    app_key,
    sign_method: "sha256",
    timestamp: String(Date.now()), // epoch ms, within ±7200s of UTC
    ...params,
  };

  const reqParams = cleanParams(baseParams); // IMPORTANT
  const signature = sign(app_secret, apiPath, reqParams);
  const finalParams = { ...reqParams, sign: signature };

  const url = new URL(base + apiPath);

  if (method.toUpperCase() === "GET") {
    for (const [k, v] of Object.entries(finalParams)) {
      url.searchParams.set(k, String(v));
    }
    const r = await fetch(url.toString(), { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  // POST: x-www-form-urlencoded
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(finalParams)) {
    body.set(k, String(v));
  }
  const r = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/**
 * Wrapper that throws on Daraz non-zero codes and returns just `data`
 */
async function authedRequest(path, params, access_token, method = "GET") {
  if (!access_token) throw new Error("Missing access token");
  const res = await callRest(path, { access_token, ...params }, method);
  // Typical Daraz shape: { code: "0", message: "success", data: {...} }
  if (res && typeof res === "object" && "code" in res && res.code !== "0") {
    const msg = res?.message || "Daraz error";
    const code = res?.code || "ERR";
    throw new Error(`${code}: ${msg}`);
  }
  return res?.data ?? res;
}

/* -------------------- PUBLIC HELPERS -------------------- */

export function buildAuthorizeUrl() {
  // convert .../rest -> .../oauth/authorize
  const baseAuthorize = darazBase().replace("/rest", "/oauth/authorize");
  const u = new URL(baseAuthorize);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("force_auth", "true");
  u.searchParams.set("client_id", process.env.DARAZ_APP_KEY);
  u.searchParams.set("redirect_uri", process.env.DARAZ_CALLBACK_URL);
  return u.toString();
}

export async function tokenCreate(code) {
  if (!code) throw new Error("Missing authorization code");
  return callRest("/auth/token/create", { code }, "POST");
}

export async function tokenRefresh(refresh_token) {
  if (!refresh_token) throw new Error("Missing refresh_token");
  return callRest("/auth/token/refresh", { refresh_token }, "POST");
}

/** Get order header/detail */
export async function getOrder(order_id, access_token) {
  if (!order_id) throw new Error("order_id is required");
  return authedRequest("/order/get", { order_id: String(order_id) }, access_token, "GET");
}

/** Get items for an order */
export async function getOrderItems(order_id, access_token) {
  if (!order_id) throw new Error("order_id is required");
  return authedRequest("/order/items/get", { order_id: String(order_id) }, access_token, "GET");
}

/**
 * GetProducts — returns FULL response so caller can read `data` and `request_id`.
 * Params:
 *   filter (required): all|live|inactive|deleted|image-missing|pending|rejected|sold-out
 *   limit <= 50, options, create_after, update_after, create_before, update_before, sku_seller_list (JSON string)
 */
export async function getProducts({ access_token, params = {} }) {
  if (!access_token) throw new Error("Missing access token");

  const p = { ...params };
  if (!p.filter) throw new Error("Daraz: 'filter' is required");
  if (p.limit && Number(p.limit) > 50) p.limit = "50";

  // Clean before send/sign to avoid IncompleteSignature
  const pClean = cleanParams(p);

  const res = await callRest("/products/get", { access_token, ...pClean }, "GET");

  if (res && typeof res === "object" && "code" in res && res.code !== "0") {
    const msg = res?.message || "Daraz error";
    const code = res?.code || "ERR";
    throw new Error(`${code}: ${msg}`);
  }
  return res; // keep request_id
}
