"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Copy, Check } from "lucide-react";

const PRIMARY = "#fcba17";

/* ----- Frequency store (localStorage) ----- */
function keyFor(p) {
  return `popup:${p._id}:${p.frequency?.scope || "session"}`;
}
function seenToday(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.scope === "once") return true;
    if (data.scope === "daily") {
      const today = new Date().toISOString().slice(0, 10);
      return data.date === today && data.count >= (data.maxShows || 1);
    }
    if (data.scope === "session") {
      return data.count >= (data.maxShows || 1);
    }
    return false;
  } catch {
    return false;
  }
}
function markSeen(p) {
  const scope = p.frequency?.scope || "session";
  const maxShows = p.frequency?.maxShows || 1;
  const k = keyFor(p);
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(k);
    let data = raw ? JSON.parse(raw) : null;
    if (!data) data = { scope, count: 0, maxShows, date: today };
    if (scope === "daily" && data.date !== today) {
      data = { scope, count: 0, maxShows, date: today };
    }
    data.count = (data.count || 0) + 1;
    localStorage.setItem(k, JSON.stringify(data));
  } catch {}
}

/* ----- API Track helper ----- */
async function track(id, kind) {
  try {
    await axios.post(`/api/popups/${id}/track`, { kind });
  } catch {}
}

/* ----- Popups ----- */

// 1) Discount popup
function DiscountPopup({ p, open, onOpenChange }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) track(p._id, "impression");
  }, [open, p?._id]);

  const copy = async () => {
    try {
      if (p.couponCode) {
        await navigator.clipboard.writeText(p.couponCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
        track(p._id, "copy");
      }
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-[520px] overflow-hidden">
        <div className="relative">
          {/* Close button */}
          <button
            className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Image */}
          <div className="relative w-full aspect-[4/5]">
            <Image
              src={p.imageUrl}
              alt={p.title || "Discount"}
              fill
              className="object-cover"
            />
          </div>

          {/* Footer actions */}
          <div className="p-4 bg-white">
            {p.couponCode ? (
              <div className="flex items-center gap-2">
                <code className="rounded border bg-muted px-2 py-1 text-sm">
                  {p.couponCode}
                </code>
                <Button
                  size="sm"
                  onClick={copy}
                  style={{ background: PRIMARY, color: "#111" }}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                {p.ctaHref ? (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    onClick={() => track(p._id, "click")}
                  >
                    <Link href={p.ctaHref}>{p.ctaText || "Shop Now"}</Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              p.ctaHref && (
                <Button asChild size="sm" onClick={() => track(p._id, "click")}>
                  <Link href={p.ctaHref}>{p.ctaText || "Shop Now"}</Link>
                </Button>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 2) Image-link popup (transparent, click-through, no backdrop)
function ImageLinkPopup({ p, open, onOpenChange }) {
  useEffect(() => {
    if (open) track(p._id, "impression");
  }, [open, p?._id]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      {/* no backdrop */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative pointer-events-auto">
          {/* Close */}
          <button
            className="absolute -right-2 -top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Clickable image */}
          <Link
            href={p.linkHref || "#"}
            onClick={() => track(p._id, "click")}
            className="block"
          >
            <div className="relative w-[88vw] max-w-[520px] aspect-[4/5]">
              <Image
                src={p.imageUrl}
                alt={p.title || "Ad"}
                fill
                className="object-cover rounded"
              />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// 3) Launch popup (image + countdown + CTA)
function LaunchPopup({ p, open, onOpenChange }) {
  const [now, setNow] = useState(Date.now());
  const target = useMemo(
    () => (p.launchAt ? new Date(p.launchAt).getTime() : null),
    [p.launchAt]
  );

  useEffect(() => {
    if (open) track(p._id, "impression");
  }, [open, p?._id]);

  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  const diff = target ? Math.max(0, target - now) : 0;
  const secs = Math.floor(diff / 1000);
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-[560px] overflow-hidden">
        <div className="relative">
          <button
            className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative w-full aspect-[16/9]">
            <Image
              src={p.imageUrl}
              alt={p.launchTitle || "Launch"}
              fill
              className="object-cover"
            />
          </div>

          <div className="p-4 bg-white">
            <div className="text-lg font-semibold">
              {p.launchTitle || "Product Launch"}
            </div>
            {p.launchSubtitle ? (
              <div className="text-sm text-muted-foreground mt-0.5">
                {p.launchSubtitle}
              </div>
            ) : null}

            {target ? (
              <div className="mt-3 text-sm">
                <div className="inline-flex items-center gap-2 rounded border px-3 py-1">
                  <span className="font-mono">
                    {String(d).padStart(2, "0")}d
                  </span>
                  <span className="font-mono">
                    {String(h).padStart(2, "0")}h
                  </span>
                  <span className="font-mono">
                    {String(m).padStart(2, "0")}m
                  </span>
                  <span className="font-mono">
                    {String(s).padStart(2, "0")}s
                  </span>
                </div>
              </div>
            ) : null}

            {p.launchCtaHref ? (
              <Button
                asChild
                className="mt-3"
                onClick={() => track(p._id, "click")}
                style={{ background: PRIMARY, color: "#111" }}
              >
                <Link href={p.launchCtaHref}>
                  {p.launchCtaText || "Learn More"}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----- Orchestrator ----- */
export default function PopupRenderer({ path }) {
  const [list, setList] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get("/api/popups", {
          params: { path: path || window.location.pathname },
        });
        const items = Array.isArray(data?.data) ? data.data : [];
        // filter via frequency
        const eligible = items.filter((p) => !seenToday(keyFor(p)));
        if (!mounted) return;
        setList(eligible.sort((a, b) => (b.priority || 0) - (a.priority || 0)));
        if (eligible[0]) {
          setOpenId(eligible[0]._id);
          markSeen(eligible[0]);
        }
      } catch {
        setList([]);
      }
    })();
    return () => (mounted = false);
  }, [path]);

  const current = list.find((p) => p._id === openId);
  const onOpenChange = (val) => {
    if (!val) {
      // close current, open next if exists
      const idx = list.findIndex((p) => p._id === openId);
      const nxt = list[idx + 1];
      setOpenId(nxt ? nxt._id : null);
      if (nxt) markSeen(nxt);
    }
  };

  if (!current) return null;
  if (current.type === "discount")
    return (
      <DiscountPopup p={current} open={!!openId} onOpenChange={onOpenChange} />
    );
  if (current.type === "image-link")
    return (
      <ImageLinkPopup p={current} open={!!openId} onOpenChange={onOpenChange} />
    );
  if (current.type === "launch")
    return (
      <LaunchPopup p={current} open={!!openId} onOpenChange={onOpenChange} />
    );
  return null;
}
