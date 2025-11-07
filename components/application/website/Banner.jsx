"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Fade from "embla-carousel-fade";
import { Skeleton } from "@/components/ui/skeleton";

/* -------- helpers: gradient wash -------- */
const hexToRgb = (hex) => {
  const v = hex?.replace("#", "") || "ffffff";
  const n =
    v.length === 3
      ? v
          .split("")
          .map((c) => c + c)
          .join("")
      : v;
  const num = parseInt(n, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};
const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
const mixWithWhite = (hex, amt = 0.4) => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({
    r: Math.round(r + (255 - r) * amt),
    g: Math.round(g + (255 - g) * amt),
    b: Math.round(b + (255 - b) * amt),
  });
};
const mkGradient = (hex = "#000000") => {
  const tint40 = mixWithWhite(hex, 0.4);
  const tint70 = mixWithWhite(hex, 0.7);
  return `linear-gradient(180deg, ${hex} 0%, ${tint40} 35%, ${tint70} 65%, rgba(255,255,255,0) 100%)`;
};

export default function Banner({
  banners = [],
  loading = false,
  autoplayMs = 4200,
}) {
  const initialBg = banners?.[0]?.bgColor || "#ffffff";

  const [active, setActive] = useState(0);
  const [baseBg, setBaseBg] = useState(initialBg);
  const [overlayBg, setOverlayBg] = useState(initialBg);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      containScroll: false,
      align: "center",
      duration: 25,
    },
    [Fade()]
  );

  // We need direct access to the embla viewport DOM node to set its height
  const viewportRef = useRef(null);
  const setBothRefs = useCallback(
    (node) => {
      emblaRef(node);
      viewportRef.current = node;
    },
    [emblaRef]
  );

  // autoplay
  const timerRef = useRef(null);
  const isPausedRef = useRef(false);

  const play = useCallback(() => {
    if (!emblaApi) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      emblaApi.scrollNext();
      play();
    }, autoplayMs);
  }, [emblaApi, autoplayMs]);

  const pause = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  /**
   * Sync viewport height to the CURRENT slide card.
   * This is the key to killing the gap.
   */
  const syncViewportHeight = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Try active slide first
    const activeCard = viewport.querySelector(
      ".embla__slide[data-active='true'] .js-slide-card"
    );
    // Fallback: any card
    const fallbackCard = viewport.querySelector(".js-slide-card");
    const el = activeCard || fallbackCard;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const h = rect.height;
    if (h > 0) {
      viewport.style.height = `${h}px`;
    }
  }, []);

  // Embla: on select / reInit / resize
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setActive(emblaApi.selectedScrollSnap());
      // wait for fade/layout then measure
      requestAnimationFrame(() =>
        requestAnimationFrame(() => syncViewportHeight())
      );
    };

    const onReInit = () => {
      onSelect();
    };

    const onResize = () => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => syncViewportHeight())
      );
    };

    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onReInit);
    emblaApi.on("resize", onResize);

    // initial
    requestAnimationFrame(() =>
      requestAnimationFrame(() => syncViewportHeight())
    );
    play();

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onReInit);
      emblaApi.off("resize", onResize);
      clearTimeout(timerRef.current);
    };
  }, [emblaApi, play, syncViewportHeight]);

  // pause/resume on user interaction
  useEffect(() => {
    if (!emblaApi) return;
    const root = emblaApi.rootNode();

    const onEnter = () => {
      isPausedRef.current = true;
      pause();
    };
    const onLeave = () => {
      isPausedRef.current = false;
      play();
    };

    root.addEventListener("mouseenter", onEnter);
    root.addEventListener("mouseleave", onLeave);
    root.addEventListener("pointerdown", onEnter);
    window.addEventListener("pointerup", onLeave);

    const onVis = () =>
      document.hidden ? pause() : !isPausedRef.current && play();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      root.removeEventListener("mouseenter", onEnter);
      root.removeEventListener("mouseleave", onLeave);
      root.removeEventListener("pointerdown", onEnter);
      window.removeEventListener("pointerup", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [emblaApi, play, pause]);

  // gradient sync
  useEffect(() => {
    const nextColor = banners?.[active]?.bgColor || initialBg;
    if (!nextColor) return;

    setOverlayBg(nextColor);
    setOverlayVisible(true);

    const t = setTimeout(() => {
      setBaseBg(nextColor);
      setOverlayVisible(false);
    }, 450);

    return () => clearTimeout(t);
  }, [active, banners, initialBg]);

  const slideCount = banners.length;

  // called when images load to ensure height is correct asap
  const handleImageLoaded = () => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => syncViewportHeight())
    );
  };

  return (
    <div className="relative w-full bg-white isolate">
      {/* gradient wash bg */}
      <div className="absolute left-0 right-0 top-0 -z-10 overflow-hidden h-[45vh] min-h-[260px] max-h-[520px]">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: mkGradient(baseBg) }}
        />
        <div
          className="absolute inset-0 transition-opacity duration-500 ease-out"
          style={{
            backgroundImage: mkGradient(overlayBg),
            opacity: overlayVisible ? 1 : 0,
          }}
        />
      </div>

      {/* main wrapper */}
      <div className="relative z-10 max-w-[1980px] mx-auto px-2 sm:px-4 pt-20 pb-0">
        {loading || banners.length === 0 ? (
          <div className="px-2 sm:px-5">
            <Skeleton className="w-full h-[200px] md:h-[400px] rounded-2xl" />
          </div>
        ) : (
          <div className="px-2 sm:px-5">
            {/* outer rounded wrapper so edges are clean */}
            <div className="relative rounded-2xl overflow-hidden">
              <div className="embla" ref={setBothRefs}>
                <div className="embla__container">
                  {banners.map(
                    ({ _id, desktopImage, mobileImage, href }, i) => {
                      const desktopSrc =
                        desktopImage?.path || mobileImage?.path || "";
                      const mobileSrc =
                        mobileImage?.path || desktopImage?.path || "";
                      const alt =
                        desktopImage?.alt || mobileImage?.alt || "Banner";
                      const isLCP = i === 0;

                      return (
                        <div
                          className="embla__slide px-2 sm:px-5"
                          key={_id || i}
                          data-active={i === active ? "true" : "false"}
                        >
                          <a
                            href={href || "#"}
                            target={href && href !== "#" ? "_blank" : undefined}
                            rel="noreferrer"
                            className="relative block overflow-hidden rounded-2xl shadow-lg js-slide-card"
                            style={{ lineHeight: 0 }}
                          >
                            {/* Desktop */}
                            <div className="hidden md:block">
                              <Image
                                src={desktopSrc}
                                alt={alt}
                                width={1600}
                                height={900}
                                sizes="(min-width: 1280px) 1263px, (min-width: 768px) 100vw, 100vw"
                                className="block w-full h-auto object-cover rounded-2xl"
                                priority={isLCP}
                                loading={isLCP ? "eager" : "lazy"}
                                quality={75}
                                onLoad={handleImageLoaded}
                              />
                            </div>

                            {/* Mobile */}
                            <div className="block md:hidden relative w-full h-[500px] rounded-2xl overflow-hidden">
                              <Image
                                src={mobileSrc}
                                alt={alt}
                                fill
                                sizes="100vw"
                                className="object-cover rounded-2xl"
                                priority={isLCP}
                                loading={isLCP ? "eager" : "lazy"}
                                quality={75}
                                onLoad={handleImageLoaded}
                              />
                            </div>

                            {/* pagination dots over image */}
                            {slideCount > 1 && (
                              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center">
                                <div className="pointer-events-auto flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20 shadow-sm">
                                  {Array.from({ length: slideCount }).map(
                                    (_, index) => {
                                      const isActive = index === active;
                                      return (
                                        <button
                                          key={index}
                                          aria-label={`Go to slide ${
                                            index + 1
                                          }`}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            emblaApi?.scrollTo(index);
                                          }}
                                          className={`h-1.5 rounded-full transition-all duration-300 ${
                                            isActive
                                              ? "w-4 bg-white"
                                              : "w-1.5 bg-white/60 hover:bg-white/80"
                                          }`}
                                        />
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            )}
                          </a>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .embla {
          position: relative;
          overflow: hidden; /* viewport height is controlled via JS */
          width: 100%;
        }
        .embla__container {
          display: flex;
          will-change: transform, opacity;
        }
        .embla__slide {
          flex: 0 0 100%;
          min-width: 0;
        }
        img,
        picture,
        video,
        canvas,
        svg {
          display: block;
        }
      `}</style>
    </div>
  );
}
