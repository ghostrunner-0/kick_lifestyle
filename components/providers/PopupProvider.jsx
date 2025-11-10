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
  const [box, setBox] = useState({ w: 440, h: 440 }); // used for centered layout
  const [isMobile, setIsMobile] = useState(false);
  const [copied, setCopied] = useState(false);

  // swipe for sheet on mobile
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

      // Generic max; real clamping done via CSS using maxWidth/maxHeight
      let w = Math.min(nw, 720);
      let h = Math.round(w * ratio);

      w = Math.max(260, w);
      h = Math.max(200, h);

      setBox({ w, h });
    } catch {}
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // swipe down to close (sheet only)
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
  const forcedLayout = popup.ui?.layout; // 'sheet' | 'centered' | 'edge'
  const layout = forcedLayout || (isMobile ? "sheet" : "centered");
  const isCentered = layout === "centered";
  const isSheet = layout === "sheet";
  const isEdge = layout === "edge";

  const isDiscount = popup.type === "discount";
  const isImageLink = popup.type === "image-link";
  const img = popup.image;

  /* ---------- Panel & container classes ---------- */

  // Centered: no bg, pure image
  // Sheet / Edge: card-like with bg
  const panelBase = isCentered
    ? "relative overflow-visible bg-transparent shadow-none"
    : "relative overflow-hidden bg-white dark:bg-neutral-900 shadow-2xl";

  const panelRadii = isSheet ? "rounded-t-2xl" : isEdge ? "rounded-2xl" : ""; // centered = no visible card

  const panelClass = isSheet
    ? "w-full max-w-[720px]"
    : isEdge
    ? "w-[min(92vw,720px)] max-h-[85vh]"
    : "flex items-center justify-center"; // centered: wrapper flex, image decides size

  const panelStyle =
    !isCentered && !isSheet ? { width: Math.min(box.w, 720) } : undefined;

  const containerAlign = isSheet
    ? "items-end"
    : isEdge
    ? "items-end justify-end pr-4 pb-4"
    : "items-center justify-center";

  // Image area:
  // - Sheet (mobile/any): stable tall area so image always visible
  // - Edge: fixed-ish height
  // - Centered: handled by box wrapper
  const imageAreaClass = isSheet
    ? "relative w-full h-[min(70vh,520px)]"
    : isEdge
    ? "relative w-full h-[min(65vh,520px)]"
    : "";

  const footerClass = isSheet
    ? "px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]"
    : "px-3 py-3";

  // Close button
  const closeBtnBase =
    "absolute z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition";
  const closeBtnClass = isCentered
    ? `${closeBtnBase} -top-4 -right-4 bg-black/85 text-white shadow-lg backdrop-blur hover:bg-black`
    : `${closeBtnBase} top-2 right-2 bg-white/95 dark:bg-neutral-800/95 text-black dark:text-white shadow hover:opacity-95`;

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
          className={`fixed inset-0 flex ${containerAlign} p-0 sm:p-4`}
          style={{ overscrollBehaviorY: "contain" }}
        >
          <Transition.Child
            as="div"
            enter="transform transition ease-out duration-300"
            enterFrom={
              isSheet ? "translate-y-full" : "opacity-0 scale-95 translate-y-3"
            }
            enterTo={
              isSheet ? "translate-y-0" : "opacity-100 scale-100 translate-y-0"
            }
            leave="transform transition ease-in duration-200"
            leaveFrom={
              isSheet ? "translate-y-0" : "opacity-100 scale-100 translate-y-0"
            }
            leaveTo={
              isSheet ? "translate-y-full" : "opacity-0 scale-95 translate-y-3"
            }
            className={`${panelBase} ${panelRadii} ${panelClass}`}
            style={panelStyle}
            onTouchStart={isSheet ? onTouchStart : undefined}
            onTouchMove={isSheet ? onTouchMove : undefined}
            onTouchEnd={isSheet ? onTouchEnd : undefined}
          >
            {/* Close button */}
            <button
              onClick={close}
              className={closeBtnClass}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Content */}
            <div className="flex flex-col">
              {/* CENTERED: pure image using measured box */}
              {isCentered && (
                <div
                  className="relative mx-auto"
                  style={{
                    width: `${box.w}px`,
                    height: `${box.h}px`,
                    maxWidth: "92vw",
                    maxHeight: "85vh",
                  }}
                >
                  {isImageLink && popup.linkHref ? (
                    <Link
                      href={popup.linkHref}
                      onClick={close}
                      className="block w-full h-full"
                      aria-label="Open link"
                    >
                      <Image
                        src={img?.path}
                        alt={img?.alt || "popup"}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 92vw, 720px"
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
                      sizes="(max-width: 768px) 92vw, 720px"
                      priority
                      onLoadingComplete={onImageLoaded}
                    />
                  )}
                </div>
              )}

              {/* SHEET / EDGE: card-ish with fixed height area */}
              {!isCentered && (
                <>
                  <div className={imageAreaClass}>
                    {isImageLink && popup.linkHref ? (
                      <Link
                        href={popup.linkHref}
                        onClick={close}
                        className="block w-full h-full"
                        aria-label="Open link"
                      >
                        <Image
                          src={img?.path}
                          alt={img?.alt || "popup"}
                          fill
                          className="object-contain"
                          sizes="100vw"
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
                        sizes="100vw"
                        priority
                        onLoadingComplete={onImageLoaded}
                      />
                    )}
                  </div>

                  {/* Discount footer (only for non-centered) */}
                  {isDiscount && (
                    <div
                      className={`flex items-center gap-2 border-t bg-white/95 dark:bg-neutral-900/95 ${footerClass}`}
                    >
                      <span className="text-[11px] sm:text-xs font-medium text-neutral-500">
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
                          setTimeout(() => setCopied(false), 900);
                        }}
                        className="ml-auto px-3 py-2 rounded-md bg-black text-white text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition"
                      >
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
