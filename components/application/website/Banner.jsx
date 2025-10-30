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

  // Embla with Fade plugin
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      containScroll: false,
      align: "center",
      duration: 25,
    },
    [Fade()]
  );

  // Autoplay (pause on hover / pointer)
  const timerRef = useRef(null);
  const isPausedRef = useRef(false);

  const play = useCallback(() => {
    if (!emblaApi) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      emblaApi.scrollNext();
      play(); // keep looping
    }, autoplayMs);
  }, [emblaApi, autoplayMs]);

  const pause = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  // handle select
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const idx = emblaApi.selectedScrollSnap();
      setActive(idx);
    };

    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
    play();

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
      clearTimeout(timerRef.current);
    };
  }, [emblaApi, play]);

  // pause/resume on interaction
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

    const onVis = () => {
      if (document.hidden) pause();
      else if (!isPausedRef.current) play();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      root.removeEventListener("mouseenter", onEnter);
      root.removeEventListener("mouseleave", onLeave);
      root.removeEventListener("pointerdown", onEnter);
      window.removeEventListener("pointerup", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [emblaApi, play, pause]);

  // fade gradient sync
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

  return (
    <div className="relative w-full bg-white isolate">
      {/* gradient wash: base + fading overlay */}
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

      <div className="relative z-10 max-w-[1980px] mx-auto px-2 sm:px-4 pt-20 pb-12">
        {loading || banners.length === 0 ? (
          <div className="px-2 sm:px-5">
            <Skeleton className="w-full h-[200px] md:h-[400px] rounded-2xl" />
          </div>
        ) : (
          <div className="px-2 sm:px-5">
            <div className="embla" ref={emblaRef}>
              <div className="embla__container">
                {banners.map(({ _id, desktopImage, mobileImage, href }, i) => {
                  const desktopSrc =
                    desktopImage?.path || mobileImage?.path || "";
                  const mobileSrc =
                    mobileImage?.path || desktopImage?.path || "";
                  const alt = desktopImage?.alt || mobileImage?.alt || "Banner";
                  const isLCP = i === 0;

                  return (
                    <div className="embla__slide" key={_id || i}>
                      <a
                        href={href || "#"}
                        target={href && href !== "#" ? "_blank" : undefined}
                        rel="noreferrer"
                        className="block rounded-2xl overflow-hidden shadow-lg"
                      >
                        {/* Desktop */}
                        <div className="hidden md:block">
                          <Image
                            src={desktopSrc}
                            alt={alt}
                            width={1600}
                            height={900}
                            sizes="(min-width: 1280px) 1263px, (min-width: 768px) 100vw, 100vw"
                            className="w-full h-auto object-cover rounded-2xl"
                            priority={isLCP}
                            quality={75}
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
                            quality={75}
                          />
                        </div>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* dots */}
            {slideCount > 1 && (
              <div className="absolute left-0 right-0 bottom-4 flex justify-center pointer-events-none">
                <ul className="flex gap-2 pointer-events-auto">
                  {Array.from({ length: slideCount }).map((_, i) => {
                    const isActive = i === active;
                    return (
                      <li key={i}>
                        <button
                          aria-label={`Go to slide ${i + 1}`}
                          onClick={() => emblaApi?.scrollTo(i)}
                          className={`h-2 w-2 rounded-full transition-all ${
                            isActive
                              ? "bg-black scale-150"
                              : "bg-neutral-400 opacity-80"
                          }`}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .embla {
          position: relative;
          overflow: hidden;
          width: 100%;
        }
        .embla__container {
          display: flex;
          will-change: transform, opacity;
        }
        .embla__slide {
          flex: 0 0 100%;
          min-width: 0;
          padding-left: 0.5rem;
          padding-right: 0.5rem;
        }
        @media (min-width: 640px) {
          .embla__slide {
            padding-left: 1.25rem;
            padding-right: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
