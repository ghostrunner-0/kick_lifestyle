// /app/admin/integrations/parts/DarazCard.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/lib/ShowToast";

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600 dark:text-neutral-300">{label}</span>
      <span className={mono ? "font-mono text-slate-900 dark:text-white" : "text-slate-900 dark:text-white"}>
        {value ?? "—"}
      </span>
    </div>
  );
}

export default function DarazCard() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [orderId, setOrderId] = useState("");

  const connected = !!status?.connected;

  const expiresInMinutes = useMemo(() => {
    if (!status?.expiresAt) return null;
    const diffMs = new Date(status.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.round(diffMs / 60000));
  }, [status?.expiresAt]);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/daraz/status", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load status");
      setStatus(json);
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    try {
      // Get the authorize URL from backend so env & country are correct
      const res = await fetch("/api/daraz/authorize-url", { cache: "no-store" });
      const { url, error } = await res.json();
      if (!res.ok || !url) throw new Error(error || "Failed to get authorize URL");

      // Important: push to absolute URL (avoids middleware relative URL error)
      window.location.href = url;
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const handleRefresh = async () => {
    try {
      const res = await fetch("/api/daraz/refresh", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Refresh failed");
      showToast("success", "Token refreshed");
      setStatus(json);
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Daraz?")) return;
    try {
      const res = await fetch("/api/daraz/disconnect", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Disconnect failed");
      showToast("success", "Disconnected");
      setStatus(json);
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const testLookup = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    try {
      const res = await fetch(`/api/daraz/order/${encodeURIComponent(orderId)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Lookup failed");
      showToast("success", "Order found");
      // Show a quick preview
      console.log("Daraz order lookup:", json);
      alert(
        `Order: ${json.order_id}\nBuyer: ${json?.buyer?.name || "-"}\nItems: ${json?.items?.length || 0}`
      );
    } catch (e) {
      showToast("error", e.message);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Daraz</h2>
        <span
          className={[
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs",
            connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block h-2 w-2 rounded-full",
              connected ? "bg-emerald-500" : "bg-slate-400",
            ].join(" ")}
          />
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <Row label="Seller Email" value={status?.account || "—"} mono />
            <Row label="Country" value={(status?.country || "").toUpperCase()} />
            <Row label="Access token expires" value={status?.expiresAt ? new Date(status.expiresAt).toLocaleString() : "—"} />
            <Row label="Time remaining" value={expiresInMinutes != null ? `${expiresInMinutes} min` : "—"} />
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {!connected ? (
          <button
            onClick={handleConnect}
            className="rounded-full bg-black text-white px-4 py-2 text-sm hover:opacity-90"
          >
            Connect Daraz
          </button>
        ) : (
          <>
            <button
              onClick={handleRefresh}
              className="rounded-full bg-black text-white px-4 py-2 text-sm hover:opacity-90"
            >
              Refresh Token
            </button>
            <button
              onClick={handleDisconnect}
              className="rounded-full border border-slate-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-neutral-800"
            >
              Disconnect
            </button>
          </>
        )}
        <button
          onClick={fetchStatus}
          className="rounded-full border border-slate-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-neutral-800"
        >
          Reload
        </button>
      </div>

      {/* Quick test form */}
      <form onSubmit={testLookup} className="mt-6 space-y-2">
        <label className="block text-sm font-medium">Test: lookup by Order ID</label>
        <div className="flex gap-2">
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. 1234567890"
            className="flex-1 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!connected}
            className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-50"
            title={!connected ? "Connect Daraz first" : "Lookup"}
          >
            Lookup
          </button>
        </div>
      </form>
    </div>
  );
}
