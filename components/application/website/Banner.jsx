"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Slider from "react-slick";
import Image from "next/image";

// slick CSS
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

/* small helper to know when we’re on mobile */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${breakpoint}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [breakpoint]);
  return isMobile;
}

export default function Banner() {
  const [banners, setBanners] = useState([]);
  const [active, setActive] = useState(0);

  // two layers to cross-fade the **background** only (no flicker)
  const [bgA, setBgA] = useState("");
  const [bgB, setBgB] = useState("");
  const [showA, setShowA] = useState(true);

  const isMobile = useIsMobile(768);
  const sliderRef = useRef(null);

  // fetch banners
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/website/banners"); // <- your public endpoint
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          const list = [...json.data].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
          setBanners(list);

          const first =
            (isMobile ? list?.[0]?.mobileImage?.path : list?.[0]?.desktopImage?.path) || "";
          setBgA(first);
          setBgB(first);
          setShowA(true);
        }
      } catch (e) {
        console.error("Failed to fetch banners", e);
      }
    })();
  }, [isMobile]);

  // update **background** when active slide changes
  useEffect(() => {
    if (!banners.length) return;
    const nextSrc =
      (isMobile
        ? banners?.[active]?.mobileImage?.path
        : banners?.[active]?.desktopImage?.path) ||
      (isMobile
        ? banners?.[0]?.mobileImage?.path
        : banners?.[0]?.desktopImage?.path) ||
      "";

    if (!nextSrc) return;

    if (showA) {
      setBgB(nextSrc);
      requestAnimationFrame(() => setShowA(false));
    } else {
      setBgA(nextSrc);
      requestAnimationFrame(() => setShowA(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isMobile]);

  // slick settings (fast + stable)
  const settings = useMemo(
    () => ({
      dots: true,
      infinite: true,
      speed: 500,             // fast transition
      slidesToShow: 1,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 3200,    // quick cycling
      pauseOnHover: false,
      arrows: false,
      swipeToSlide: true,
      cssEase: "ease-in-out",
      beforeChange: (_curr, next) => setActive(next),
      // place dots **inside** the card bottom
      appendDots: (dots) => (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 14,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <ul
            style={{
              margin: 0,
              padding: 0,
              display: "flex",
              gap: 8,
              pointerEvents: "auto",
            }}
          >
            {dots}
          </ul>
        </div>
      ),
      customPaging: () => (
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            backgroundColor: "#d4d4d4",
            cursor: "pointer",
          }}
        />
      ),
    }),
    []
  );

  return (
    <div className="relative w-full">
      {/* ---------- BACKGROUND (blurred, behind, no flicker) ---------- */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* layer A */}
        {bgA && (
          <Image
            src={bgA}
            alt=""
            fill
            sizes="100vw"
            priority
            className={[
              "object-cover blur-3xl",
              "transition-opacity duration-600 ease-out will-change-opacity",
              showA ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        )}
        {/* layer B */}
        {bgB && (
          <Image
            src={bgB}
            alt=""
            fill
            sizes="100vw"
            priority
            className={[
              "object-cover blur-3xl",
              "transition-opacity duration-600 ease-out will-change-opacity",
              showA ? "opacity-0" : "opacity-100",
            ].join(" ")}
          />
        )}

        {/* side falloff (subtle) */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_500px_at_50%_10%,rgba(0,0,0,0.08),transparent_60%)]" />

        {/* bottom white fade so the banner blends into page */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-white" />
      </div>

      {/* ---------- FOREGROUND SLIDER (rounded, shadowed, Shopify-ish) ---------- */}
      <div className="relative max-w-[1600px] mx-auto px-4 md:px-8 pt-16 pb-8">
        <div className="rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] bg-white/70 backdrop-blur">
          <Slider ref={sliderRef} {...settings}>
            {banners.map(({ _id, desktopImage, mobileImage, href }, i) => {
              const src = isMobile ? mobileImage?.path : desktopImage?.path;
              const alt = (isMobile ? mobileImage?.alt : desktopImage?.alt) || "Banner";
              return (
                <a
                  key={_id || i}
                  href={href || "#"}
                  target={href && href !== "#" ? "_blank" : undefined}
                  rel="noreferrer"
                  className="block"
                >
                  <Image
                    src={src}
                    alt={alt}
                    // The frame is responsive height; keep aspect ratio similar to your assets
                    width={1920}
                    height={700}
                    priority={i === 0}
                    className="w-full h-auto object-cover select-none"
                  />
                </a>
              );
            })}
          </Slider>
        </div>
      </div>

      {/* dot color tweak (active dot darker) */}
      <style jsx global>{`
        .slick-dots li.slick-active div {
          background: #444;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
