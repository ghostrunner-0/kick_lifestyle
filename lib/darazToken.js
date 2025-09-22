import DarazToken from "@/models/DarazToken.model";
import { tokenRefresh } from "./darazMini";

/** read singleton */
export async function readDarazToken() {
  return DarazToken.findOne({ key: "daraz" });
}

/** save/replace */
export async function saveDarazToken(bundle) {
  return DarazToken.findOneAndUpdate(
    { key: "daraz" },
    { ...bundle, raw: bundle, savedAt: new Date() },
    { upsert: true, new: true }
  );
}

/** ensure fresh (refresh ~30m before expiry) */
export async function ensureFreshDarazToken() {
  let doc = await readDarazToken();
  if (!doc?.access_token) return null;

  try {
    if (doc.expires_in && doc.refresh_token && doc.savedAt) {
      const ageSec = (Date.now() - new Date(doc.savedAt).getTime()) / 1000;
      if (ageSec > Math.max(1, doc.expires_in - 1800)) {
        const refreshed = await tokenRefresh(doc.refresh_token);
        doc = await saveDarazToken(refreshed);
      }
    }
  } catch (e) {
    // keep old token if refresh fails; caller can decide
  }
  return doc;
}
