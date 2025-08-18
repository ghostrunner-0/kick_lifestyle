// lib/pathaoClient.js
import axios from "axios";
import { connectDB } from "@/lib/DB";
import PathaoToken from "@/models/PathaoToken.model";

/* ========= ENV / CONFIG ========= */
const BASE_URL =
  process.env.PATHAO_BASE_URL?.trim() || "https://api-hermes.pathao.com";

const CLIENT_ID = process.env.PATHAO_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.PATHAO_CLIENT_SECRET?.trim();

/** Some folks accidentally set PATHAO-PASSWORD with a hyphen — support both. */
const USERNAME =
  process.env.PATHAO_USERNAME?.trim() ??
  process.env["PATHAO_USERNAME"]?.trim();
const PASSWORD =
  process.env.PATHAO_PASSWORD?.trim() ??
  process.env["PATHAO-PASSWORD"]?.trim();

/** Optional: you can seed the first refresh token here to avoid username/password */
const SEEDED_REFRESH = process.env.PATHAO_REFRESH_TOKEN?.trim() || null;

/** Optional: directly set your default store ID via env (number). */
const ENV_STORE_ID = process.env.PATHAO_STORE_ID
  ? Number(process.env.PATHAO_STORE_ID)
  : null;

/** Safety skew (ms) — refresh token a bit before it expires. */
const EXPIRY_SKEW_MS = 60_000;

/* ========= AXIOS ========== */
export const ax = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json; charset=UTF-8",
    Accept: "application/json",
  },
  // Always go to network
  transitional: { clarifyTimeoutError: true },
  // Next.js route handlers should not cache this
  withCredentials: false,
});

/* ========= TOKEN ISSUANCE HELPERS ========= */
async function issueWithPassword() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing PATHAO_CLIENT_ID / PATHAO_CLIENT_SECRET");
  }
  if (!USERNAME || !PASSWORD) {
    throw new Error("Missing PATHAO_USERNAME / PATHAO_PASSWORD");
  }
  const { data } = await ax.post("/aladdin/api/v1/issue-token", {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "password",
    username: USERNAME,
    password: PASSWORD,
  });
  return data;
}

async function issueWithRefreshToken(refresh_token) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing PATHAO_CLIENT_ID / PATHAO_CLIENT_SECRET");
  }
  if (!refresh_token) {
    throw new Error("No refresh_token provided");
  }
  const { data } = await ax.post("/aladdin/api/v1/issue-token", {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token,
  });
  return data;
}

/* ========= ACCESS TOKEN (DB-CACHED) ========= */
/**
 * Returns a valid (non-expired) access token.
 * - Reads from DB
 * - Refreshes when needed using refresh_token
 * - Falls back to username/password if necessary
 */
export async function getPathaoAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing PATHAO_CLIENT_ID / PATHAO_CLIENT_SECRET");
  }

  await connectDB();

  let tokenDoc = await PathaoToken.findOne({ provider: "pathao" });
  const now = Date.now();
  const stillValid =
    tokenDoc &&
    tokenDoc.expires_at &&
    tokenDoc.expires_at - now > EXPIRY_SKEW_MS;

  if (stillValid && tokenDoc.access_token) {
    return tokenDoc.access_token;
  }

  // Need a new token:
  let issued;
  try {
    if (tokenDoc?.refresh_token) {
      issued = await issueWithRefreshToken(tokenDoc.refresh_token);
    } else if (SEEDED_REFRESH) {
      issued = await issueWithRefreshToken(SEEDED_REFRESH);
    } else {
      // First time via password grant
      issued = await issueWithPassword();
    }
  } catch (err) {
    // Retry via password grant if we have credentials
    if (USERNAME && PASSWORD) {
      issued = await issueWithPassword();
    } else {
      const m =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to issue Pathao token";
      throw new Error(m);
    }
  }

  const {
    access_token,
    refresh_token,
    token_type = "Bearer",
    expires_in,
  } = issued || {};

  if (!access_token || !refresh_token || !expires_in) {
    throw new Error("Pathao token response incomplete.");
  }

  const expires_at = Date.now() + Number(expires_in) * 1000;

  if (!tokenDoc) {
    tokenDoc = await PathaoToken.create({
      provider: "pathao",
      access_token,
      refresh_token,
      token_type,
      expires_at,
      raw: issued,
    });
  } else {
    tokenDoc.access_token = access_token;
    tokenDoc.refresh_token = refresh_token;
    tokenDoc.token_type = token_type;
    tokenDoc.expires_at = expires_at;
    tokenDoc.raw = issued;
    await tokenDoc.save();
  }

  return access_token;
}

/* ========= GENERIC AUTH’D REQUESTS ========= */
/**
 * Low-level generic request helper (GET/POST/etc.)
 * path: string (e.g. "/aladdin/api/v1/city-list")
 * opts: { method, body, params, headers }
 */
export async function pathaoRequest(
  path,
  { method = "GET", body, params, headers } = {}
) {
  const token = await getPathaoAccessToken();
  const { data } = await ax.request({
    url: path,
    method,
    params,
    data: body ?? undefined,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(headers || {}),
    },
  });
  return data;
}

/** Convenience helpers */
export async function pathaoGet(path, params) {
  return pathaoRequest(path, { method: "GET", params });
}

export async function pathaoPost(path, body) {
  return pathaoRequest(path, { method: "POST", body });
}

/** Back-compat for older code that used `pathaoFetch` */
export const pathaoFetch = pathaoRequest;

/* ========= HIGHER-LEVEL HELPERS (Optional) ========= */
/** Get store list (for resolving store_id if not set in env) */
export async function getPathaoStores() {
  return pathaoGet("/aladdin/api/v1/stores");
}

/**
 * Resolve a store_id to use with price-plan:
 * - If PATHAO_STORE_ID env is set → use it
 * - Else → fetch stores and prefer default store; fallback to first store
 */
export async function resolvePathaoStoreId() {
  if (ENV_STORE_ID) return ENV_STORE_ID;

  const res = await getPathaoStores();
  const all = res?.data?.data || res?.data || [];
  if (!Array.isArray(all) || all.length === 0) {
    throw new Error("No Pathao stores found for this merchant.");
  }

  const defaultStore =
    all.find((s) => Number(s.is_default_store) === 1) ||
    all.find((s) => Number(s.is_default_return_store) === 1);

  return Number((defaultStore || all[0]).store_id);
}
