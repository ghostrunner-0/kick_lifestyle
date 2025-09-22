"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// If you already have shadcn Button/Badge, import them.
// Otherwise the Tailwind-styled <button> below will work fine.
// import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/ShowToast";

function clsx(...arr) {
  return arr.filter(Boolean).join(" ");
}

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, { cache: "no-store", ...opts });
  const text = await r.text();
  try {
    const data = text ? JSON.parse(text) : null;
    if (!r.ok) throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
    return data;
  } catch (e) {
    if (!r.ok) throw new Error(e.message || `HTTP ${r.status}`);
    // non-JSON OK
    return text;
  }
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const darazFlag = searchParams.get("daraz"); // 'ok' | 'error'
  const reason = searchParams.get("reason") || "";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // { connected, savedAt, country, account, expires_in, refresh_expires_in }

  // Fetch current connection status
  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchJSON("/api/daraz/status");
      setStatus(s);
    } catch (e) {
      setStatus({ connected: false, error: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Success / Error banners from callback
  useEffect(() => {
    if (darazFlag === "ok") {
      showToast?.("success", "Daraz connected successfully.");
    } else if (darazFlag === "error") {
      showToast?.("error", `Daraz connection failed${reason ? `: ${reason}` : ""}`);
    }
  }, [darazFlag, reason]);

  const connected = !!status?.connected;

  const onConnect = () => {
    // Send to our authorize endpoint (will redirect to Daraz, then back)
    window.location.href = "/api/daraz/authorize";
  };

  const onDisconnect = async () => {
    if (!confirm("Disconnect Daraz? You can reconnect anytime.")) return;
    setBusy(true);
    try {
      await fetchJSON("/api/daraz/disconnect", { method: "POST" });
      showToast?.("success", "Disconnected from Daraz.");
      await loadStatus();
    } catch (e) {
      showToast?.("error", e.message || "Failed to disconnect.");
    } finally {
      setBusy(false);
    }
  };

  const onRefreshToken = async () => {
    setBusy(true);
    try {
      const res = await fetchJSON("/api/daraz/refresh", { method: "POST" });
      showToast?.("success", "Token refreshed.");
      await loadStatus();
    } catch (e) {
      showToast?.("error", e.message || "Failed to refresh token.");
    } finally {
      setBusy(false);
    }
  };

  const InfoRow = ({ label, value }) => (
    <div className="flex items-start gap-3 py-2">
      <div className="w-36 shrink-0 text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900 dark:text-slate-100 break-all">
        {value ?? <span className="text-slate-400">—</span>}
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          Integrations
        </h1>
        <Link
          href="/admin"
          className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-4"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Daraz Card */}
      <div
        className={clsx(
          "rounded-2xl border shadow-sm",
          "border-slate-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-900"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-black text-white grid place-items-center text-xs font-bold">
              DZ
            </div>
            <div>
              <div className="text-sm font-semibold">Daraz</div>
              <div className="text-xs text-slate-500">
                Connect your Daraz seller account for warranty lookups
              </div>
            </div>
          </div>

        <div className="flex items-center gap-2">
            <span
              className={clsx(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold",
                connected
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300"
              )}
            >
              {connected ? "Connected" : "Not connected"}
            </span>

            {connected ? (
              <>
                <button
                  type="button"
                  onClick={onRefreshToken}
                  disabled={busy}
                  className={clsx(
                    "rounded-md border px-3 py-1.5 text-xs font-semibold",
                    "border-slate-300 bg-white hover:bg-slate-50 active:scale-[0.99]",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    "dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  )}
                >
                  Refresh Token
                </button>
                <button
                  type="button"
                  onClick={onDisconnect}
                  disabled={busy}
                  className={clsx(
                    "rounded-md px-3 py-1.5 text-xs font-semibold text-white",
                    "bg-red-600 hover:bg-red-700 active:scale-[0.99]",
                    "disabled:opacity-60 disabled:cursor-not-allowed"
                  )}
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onConnect}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-xs font-semibold text-white",
                  "bg-black hover:bg-black/90 active:scale-[0.99]"
                )}
              >
                Connect
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="h-3 w-80 rounded bg-slate-200" />
              <div className="h-3 w-64 rounded bg-slate-200" />
              <div className="h-3 w-56 rounded bg-slate-200" />
            </div>
          ) : (
            <>
              {status?.error ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {status.error}
                </div>
              ) : (
                <>
                  <InfoRow label="Country" value={status?.country?.toUpperCase?.()} />
                  <InfoRow label="Account (email)" value={status?.account || status?.seller_email} />
                  <InfoRow
                    label="Connected at"
                    value={
                      status?.savedAt
                        ? new Date(status.savedAt).toLocaleString()
                        : "—"
                    }
                  />
                  <div className="flex items-start gap-3 py-2">
                    <div className="w-36 shrink-0 text-xs font-medium text-slate-500">
                      Token TTL
                    </div>
                    <div className="text-sm text-slate-900 dark:text-slate-100">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="text-xs">
                          access: <strong>{status?.expires_in ?? "—"}</strong> s
                        </span>
                        <span className="text-xs">
                          refresh:{" "}
                          <strong>{status?.refresh_expires_in ?? "—"}</strong> s
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        (We auto-refresh ~30 minutes before expiry.)
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tiny helper section */}
      <div className="mt-6 text-xs text-slate-500">
        Need help?{" "}
        <Link
          href="/admin/docs/daraz"
          className="underline underline-offset-4 hover:text-slate-700"
        >
          See Daraz integration guide
        </Link>
        .
      </div>
    </div>
  );
}
