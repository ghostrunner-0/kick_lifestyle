import crypto from "node:crypto";

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

function sign(appSecret, apiPath, params) {
  const keys = Object.keys(params).sort();
  const plain = keys.reduce((s, k) => s + k + String(params[k]), apiPath);
  const mac = crypto
    .createHmac("sha256", appSecret)
    .update(plain)
    .digest("hex");
  return mac.toUpperCase();
}

async function callRest(apiPath, params = {}, method = "GET") {
  const app_key = process.env.DARAZ_APP_KEY;
  const app_secret = process.env.DARAZ_APP_SECRET;
  const base = darazBase();

  const reqParams = {
    app_key,
    sign_method: "sha256",
    timestamp: Date.now(),
    ...params,
  };
  const signHex = sign(app_secret, apiPath, reqParams);
  const finalParams = { ...reqParams, sign: signHex };

  const url = new URL(base + apiPath);

  if (method === "GET") {
    Object.entries(finalParams).forEach(([k, v]) =>
      url.searchParams.set(k, String(v))
    );
    const r = await fetch(url.toString(), { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } else {
    const body = new URLSearchParams(
      Object.fromEntries(
        Object.entries(finalParams).map(([k, v]) => [k, String(v)])
      )
    );
    const r = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
}

/* ---------- public helpers ---------- */

export function buildAuthorizeUrl() {
  const baseAuthorize = darazBase().replace("/rest", "/oauth/authorize");
  const u = new URL(baseAuthorize);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("force_auth", "true"); // fresh session
  u.searchParams.set("client_id", process.env.DARAZ_APP_KEY);
  u.searchParams.set("redirect_uri", process.env.DARAZ_CALLBACK_URL);
  return u.toString();
}

export async function tokenCreate(code) {
  return callRest("/auth/token/create", { code }, "POST");
}

export async function tokenRefresh(refresh_token) {
  return callRest("/auth/token/refresh", { refresh_token }, "POST");
}

async function authedGet(path, params, access_token) {
  const res = await callRest(path, { access_token, ...params }, "GET");
  if (res?.code && res.code !== "0") {
    const msg = res?.message || "Daraz error";
    throw new Error(msg);
  }
  return res?.data ?? res;
}

export async function getOrder(order_id, access_token) {
  return authedGet("/order/get", { order_id: String(order_id) }, access_token);
}

export async function getOrderItems(order_id, access_token) {
  return authedGet(
    "/orders/items/get",
    { order_id: String(order_id) },
    access_token
  );
}
