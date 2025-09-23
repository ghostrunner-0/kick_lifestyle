"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { showToast } from "@/lib/ShowToast";

function cx(...v) {
  return v.filter(Boolean).join(" ");
}

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, { cache: "no-store", ...opts });
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!r.ok) throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
  return data ?? text;
}

export default function IntegrationsPage() {
  const qp = useSearchParams();
  const darazFlag = qp.get("daraz"); // "ok" | "error"
  const reason = qp.get("reason") || "";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const connected = !!status?.connected;

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

  useEffect(() => {
    if (darazFlag === "ok") {
      showToast?.("success", "Daraz connected successfully.");
    } else if (darazFlag === "error") {
      showToast?.(
        "error",
        `Daraz connection failed${reason ? `: ${reason}` : ""}`
      );
    }
  }, [darazFlag, reason]);

  const onConnect = () => {
    // Sends to your OAuth starter; it will redirect to Daraz and back here.
    window.location.href = "/api/daraz/authorize";
  };

  const onDisconnect = async () => {
    if (!confirm("Disconnect Daraz? You can reconnect anytime.")) return;
    setBusy(true);
    try {
      await fetchJSON("/api/daraz/disconnect", { method: "POST" });
      showToast?.("success", "Disconnected.");
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
      await fetchJSON("/api/daraz/refresh", { method: "POST" });
      showToast?.("success", "Token refreshed.");
      await loadStatus();
    } catch (e) {
      showToast?.("error", e.message || "Failed to refresh.");
    } finally {
      setBusy(false);
    }
  };

  const Stat = ({ k, v }) => (
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
        {k}
      </div>
      <div className="mt-1 break-all text-slate-900 dark:text-neutral-100">
        {v ?? <span className="text-slate-400">—</span>}
      </div>
    </div>
  );

  const accessTTL = status?.access_ttl_seconds ?? null;
  const refreshTTL = status?.refresh_ttl_seconds ?? null;

  const ttlBadge = useMemo(() => {
    if (accessTTL == null) return "—";
    const h = Math.floor(accessTTL / 3600);
    const m = Math.floor((accessTTL % 3600) / 60);
    return `${h}h ${m}m left`;
  }, [accessTTL]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Top banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-black via-zinc-900 to-neutral-900 p-[1px] shadow-lg">
        <div className="rounded-2xl bg-white/95 p-5 backdrop-blur dark:bg-neutral-950">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-black text-[13px] font-extrabold text-white">
                DZ
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900 dark:text-white">
                  Daraz Integration
                </h1>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Connect your Daraz seller account to enable warranty lookups by
                  order ID.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cx(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold",
                  connected
                    ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-300"
                    : "bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/20 dark:text-neutral-300"
                )}
              >
                {connected ? "Connected" : "Not Connected"}
              </span>

              {connected ? (
                <>
                  <button
                    onClick={onRefreshToken}
                    disabled={busy}
                    className={cx(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold",
                      "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 active:scale-[0.99]",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      "dark:bg-neutral-950 dark:text-neutral-100 dark:ring-neutral-800 dark:hover:bg-neutral-900"
                    )}
                  >
                    Refresh Token
                  </button>
                  <button
                    onClick={onDisconnect}
                    disabled={busy}
                    className={cx(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
                      "bg-red-600 hover:bg-red-700 active:scale-[0.99]",
                      "disabled:opacity-60 disabled:cursor-not-allowed"
                    )}
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={onConnect}
                  className={cx(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
                    "bg-black hover:bg-black/90 active:scale-[0.99]"
                  )}
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          {/* Small strip with TTL */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="text-[11px] text-slate-500 dark:text-neutral-400">
              Token status:
            </div>
            <div
              className={cx(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                connected
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-slate-500/10 text-slate-700 dark:text-neutral-300"
              )}
            >
              {connected ? ttlBadge : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-slate-200/70 dark:bg-neutral-800/60"
              />
            ))}
          </div>
        ) : status?.error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {status.error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Stat k="Country" v={status?.country?.toUpperCase?.()} />
              <Stat k="Account (email)" v={status?.account} />
              <Stat
                k="Connected at"
                v={
                  status?.savedAt
                    ? new Date(status.savedAt).toLocaleString()
                    : "—"
                }
              />
              <Stat
                k="Access token expires at"
                v={
                  status?.access_expires_at
                    ? new Date(status.access_expires_at).toLocaleString()
                    : "—"
                }
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat
                k="Access TTL (secs)"
                v={
                  status?.access_ttl_seconds != null
                    ? String(status.access_ttl_seconds)
                    : "—"
                }
              />
              <Stat
                k="Refresh TTL (secs)"
                v={
                  status?.refresh_ttl_seconds != null
                    ? String(status.refresh_ttl_seconds)
                    : "—"
                }
              />
              <Stat
                k="Configured country (env)"
                v={(status?.env_country || "").toUpperCase()}
              />
            </div>

            {!connected && (
              <div className="mt-6 rounded-xl border border-slate-200/70 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="font-medium text-slate-900 dark:text-neutral-100">
                  Not connected
                </div>
                <div className="mt-1 text-slate-600 dark:text-neutral-400">
                  Click <span className="font-semibold">Connect</span> to start
                  authorization with your Daraz seller account. You’ll be brought
                  back here after authorizing.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
