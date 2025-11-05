"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Image from "next/image";
import Link from "next/link";

/* ---------- Frequency helpers ---------- */
function storageKey(id) {
  return `popup_${id}_shows`;
}
function dayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function canShow(p, shows) {
  const scope = p.frequency?.scope || "session";
  const max = Number(p.frequency?.maxShows ?? 1);
  if (scope === "always") return true;
  if (max <= 0) return false;
  if (scope === "session") return (shows?.session || 0) < max;
  if (scope === "once") return !shows?.onceDone;
  if (scope === "daily") {
    const today = dayKey();
    const d = shows?.daily || {};
    return (d[today] || 0) < max;
  }
  return true;
}
function incrementShows(p) {
  try {
    const key = storageKey(p._id);
    const raw = sessionStorage.getItem(key);
    const shows = raw ? JSON.parse(raw) : {};
    const scope = p.frequency?.scope || "session";
    if (scope === "session") shows.session = (shows.session || 0) + 1;
    else if (scope === "once") shows.onceDone = true;
    else if (scope === "daily") {
      const today = dayKey();
      shows.daily = shows.daily || {};
      shows.daily[today] = (shows.daily[today] || 0) + 1;
    }
    sessionStorage.setItem(key, JSON.stringify(shows));
  } catch {}
}
function readShows(p) {
  try {
    const raw = sessionStorage.getItem(storageKey(p._id));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/* ---------- Main Provider ---------- */
export default function PopupProvider({ currentPath }) {
  const [popup, setPopup] = useState(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ w: 440, h: 440 });
  const [isMobile, setIsMobile] = useState(false);
  const [copied, setCopied] = useState(false);

  // refs before return
  const startY = useRef(null);
  const deltaY = useRef(0);

  /* ---------- Effects ---------- */
  useEffect(() => {
    const apply = () => setIsMobile(window.innerWidth <= 640);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  useEffect(() => {
    const path =
      typeof currentPath === "string" ? currentPath : window.location.pathname;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/popup/active?path=${encodeURIComponent(path)}`,
          { cache: "no-store" }
        );
        const raw = await res.json();
        const p = raw?.data || raw;
        if (cancelled || !p || !p._id) return;
        const shows = readShows(p);
        if (canShow(p, shows)) {
          setPopup(p);
          setOpen(true);
          incrementShows(p);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPath]);

  const onImageLoaded = useCallback((img) => {
    try {
      const nw = img.naturalWidth || 1000;
      const nh = img.naturalHeight || 1000;
      const ratio = nh / nw;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxW = Math.floor(vw * 0.92);
      const maxH = Math.floor(vh * 0.85);
      let w = Math.min(nw, maxW);
      let h = Math.round(w * ratio);
      if (h > maxH) {
        h = maxH;
        w = Math.round(h / ratio);
      }
      w = Math.max(280, w);
      h = Math.max(200, h);
      setBox({ w, h });
    } catch {}
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    deltaY.current = 0;
  };
  const onTouchMove = (e) => {
    if (startY.current == null) return;
    deltaY.current = e.touches[0].clientY - startY.current;
  };
  const onTouchEnd = () => {
    if (deltaY.current > 60) close();
    startY.current = null;
    deltaY.current = 0;
  };

  if (!popup) return null;

  /* ---------- Layout ---------- */
  const layout = popup.ui?.layout || (isMobile ? "sheet" : "centered");
  const isDiscount = popup.type === "discount";
  const isImageLink = popup.type === "image-link";
  const img = popup.image;

  const panelBase =
    "relative overflow-visible bg-white dark:bg-neutral-900 shadow-2xl";
  const panelRadii = layout === "sheet" ? "rounded-t-2xl" : "rounded-2xl";
  const panelSize = layout === "sheet" ? "w-full max-w-[680px]" : "";
  const panelStyle =
    layout === "sheet"
      ? {}
      : {
          width: Math.min(box.w, Math.floor(window.innerWidth * 0.92)),
          height: Math.min(box.h, Math.floor(window.innerHeight * 0.85)),
        };

  const imageWrapperClass =
    layout === "sheet" ? "relative w-full" : "absolute inset-0";
  const footerClass =
    layout === "sheet" ? "px-4 py-3" : "absolute left-0 right-0 bottom-0 p-3";

  /* ---------- UI ---------- */
  return (
    <Transition appear show={open} as="div" className="relative z-[9999]">
      <Dialog as="div" className="relative z-[9999]" onClose={close}>
        {/* Backdrop */}
        <Transition.Child
          as="div"
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
        />

        {/* Container */}
        <div
          className={`fixed inset-0 ${
            layout === "sheet" ? "flex items-end" : "flex items-center"
          } justify-center p-4`}
        >
          <Transition.Child
            as="div"
            enter="transform transition ease-out duration-300"
            enterFrom={
              layout === "sheet"
                ? "translate-y-full"
                : "opacity-0 scale-95 translate-y-3"
            }
            enterTo={
              layout === "sheet"
                ? "translate-y-0"
                : "opacity-100 scale-100 translate-y-0"
            }
            leave="transform transition ease-in duration-200"
            leaveFrom={
              layout === "sheet"
                ? "translate-y-0"
                : "opacity-100 scale-100 translate-y-0"
            }
            leaveTo={
              layout === "sheet"
                ? "translate-y-full"
                : "opacity-0 scale-95 translate-y-3"
            }
            className={`${panelBase} ${panelRadii} ${panelSize}`}
            style={panelStyle}
            onTouchStart={layout === "sheet" ? onTouchStart : undefined}
            onTouchMove={layout === "sheet" ? onTouchMove : undefined}
            onTouchEnd={layout === "sheet" ? onTouchEnd : undefined}
          >
            {/* Inner clip wrapper */}
            <div
              className={`${panelRadii} overflow-hidden relative`}
              style={
                layout === "sheet" ? {} : { width: "100%", height: "100%" }
              }
            >
              {/* Image */}
              <div className={imageWrapperClass}>
                {isImageLink && popup.linkHref ? (
                  <Link
                    href={popup.linkHref}
                    onClick={close}
                    className="block w-full h-full"
                  >
                    <Image
                      src={img?.path}
                      alt={img?.alt || "popup"}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 92vw, 680px"
                      priority
                      onLoadingComplete={onImageLoaded}
                    />
                  </Link>
                ) : (
                  <Image
                    src={img?.path}
                    alt={img?.alt || "popup"}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 92vw, 680px"
                    priority
                    onLoadingComplete={onImageLoaded}
                  />
                )}
              </div>

              {/* Coupon footer */}
              {isDiscount && (
                <div
                  className={`flex items-center gap-2 border-t bg-white/95 dark:bg-neutral-900/95 ${footerClass}`}
                >
                  <span className="text-xs font-medium text-neutral-500">
                    Coupon
                  </span>
                  <span className="px-2 py-1 rounded-md font-mono text-sm bg-neutral-100 dark:bg-neutral-800">
                    {popup.couponCode || "—"}
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          popup.couponCode || ""
                        );
                      } catch {}
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1000);
                    }}
                    className="ml-auto px-3 py-1.5 rounded-md bg-black text-white text-xs font-semibold hover:opacity-90"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>

            {/* Close button — no crop now */}
            <button
              onClick={close}
              className="absolute top-2 right-2 h-9 w-9 rounded-full bg-white text-black shadow hover:opacity-90 transition"
              aria-label="Close"
            >
              ✕
            </button>

            {/* Grabber */}
            {layout === "sheet" && (
              <div className="absolute top-1 left-1/2 -translate-x-1/2 h-1.5 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            )}
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
