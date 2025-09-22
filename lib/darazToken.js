import DarazToken from "@/models/DarazToken.model";
import { tokenRefresh } from "./darazMini";

/** read singleton */
export async function readDarazToken() {
  return DarazToken.findOne({ key: "daraz" });
}

/** save/replace (also compute expires_at for convenience) */
export async function saveDarazToken(bundle = {}) {
  const now = new Date();
  const expires_at =
    typeof bundle.expires_in === "number"
      ? new Date(now.getTime() + bundle.expires_in * 1000)
      : bundle.expires_at || null;

  // Try to keep known fields (account/country) if the new bundle didn’t include them
  const existing = await DarazToken.findOne({ key: "daraz" });
  const account = bundle.account ?? existing?.account ?? null;
  const country = bundle.country ?? existing?.country ?? (process.env.DARAZ_COUNTRY || "").toUpperCase();

  return DarazToken.findOneAndUpdate(
    { key: "daraz" },
    {
      key: "daraz",
      ...bundle,
      account,
      country,
      expires_at,
      raw: bundle,
      savedAt: now,
    },
    { upsert: true, new: true }
  );
}

/** ensure fresh (refresh ~30m before expiry) */
export async function ensureFreshDarazToken(force = false) {
  let doc = await readDarazToken();
  if (!doc?.access_token) return null;

  try {
    if (doc.refresh_token && (force || doc.expires_in)) {
      const ageSec = (Date.now() - new Date(doc.savedAt).getTime()) / 1000;
      const shouldRefresh = force || ageSec > Math.max(1, (doc.expires_in ?? 0) - 1800); // 30 min before
      if (shouldRefresh) {
        const refreshed = await tokenRefresh(doc.refresh_token);
        doc = await saveDarazToken(refreshed);
      }
    }
  } catch (_e) {
    // If refresh fails, keep the old token; caller can decide what to do next.
  }
  return doc;
}

/** disconnect helper */
export async function clearDarazToken() {
  await DarazToken.findOneAndDelete({ key: "daraz" });
}
