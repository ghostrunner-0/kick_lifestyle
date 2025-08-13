"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Slider from "react-slick";
import Image from "next/image";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function Banner() {
  const [banners, setBanners] = useState([]);
  const [active, setActive] = useState(0);

  // two-layer background for a smooth crossfade
  const [bgA, setBgA] = useState("");
  const [bgB, setBgB] = useState("");
  const [showA, setShowA] = useState(true); // which layer is visible

  const sliderRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/banners");
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          const list = [...json.data].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
          setBanners(list);

          // seed backgrounds
          const first = list?.[0]?.desktopImage?.path;
          setBgA(first || "");
          setBgB(first || "");
          setShowA(true);
        }
      } catch (e) {
        console.error("Failed to fetch banners", e);
      }
    })();
  }, []);

  // update background with crossfade whenever active slide changes
  useEffect(() => {
    const nextSrc =
      banners?.[active]?.desktopImage?.path ||
      banners?.[0]?.desktopImage?.path ||
      "";
    if (!nextSrc) return;

    if (showA) {
      setBgB(nextSrc);
      // fade B in
      requestAnimationFrame(() => setShowA(false));
    } else {
      setBgA(nextSrc);
      // fade A in
      requestAnimationFrame(() => setShowA(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

const settings = useMemo(
  () => ({
    dots: true,
    infinite: true,
    speed: 800,
    fade: true,                  // 🔹 enables crossfade between slides
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    arrows: false,
    beforeChange: (_, next) => setActive(next),
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
          width: 12,
          height: 12,
          borderRadius: 6,
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
      {/* --- Animated blurred background (two layers cross-fading) --- */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* layer A */}
        {bgA ? (
          <Image
            src={bgA}
            alt=""
            fill
            sizes="100vw"
            priority
            className={[
              "object-cover blur-3xl will-change-transform will-change-opacity",
              "transition-[opacity,transform] duration-700 ease-out",
              showA ? "opacity-100 scale-[1.12]" : "opacity-0 scale-[1.08]",
            ].join(" ")}
          />
        ) : null}

        {/* layer B */}
        {bgB ? (
          <Image
            src={bgB}
            alt=""
            fill
            sizes="100vw"
            priority
            className={[
              "object-cover blur-3xl will-change-transform will-change-opacity",
              "transition-[opacity,transform] duration-700 ease-out",
              showA ? "opacity-0 scale-[1.08]" : "opacity-100 scale-[1.12]",
            ].join(" ")}
          />
        ) : null}

        {/* subtle vignette so the edges blend nicely */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/10 pointer-events-none" />
      </div>

      {/* --- Foreground carousel --- */}
      <div className="relative max-w-[1980px] mx-auto px-4 pt-20 pb-8 ">
        {" "}
        {/* pt adds breathing-room; dots overlay at bottom */}
        <Slider ref={sliderRef} {...settings}>
          {banners.map(({ _id, desktopImage, href }, i) => (
            <div key={_id || i} className="px-5">
              {" "}
              {/* adds 8px each side */}
              <a
                href={href || "#"}
                target={href && href !== "#" ? "_blank" : undefined}
                rel="noreferrer"
                className="block rounded-2xl overflow-hidden shadow-lg"
              >
                <Image
                  src={desktopImage?.path}
                  alt={desktopImage?.alt || "Banner"}
                  width={1200}
                  height={500}
                  priority={i === 0}
                  className="w-full h-auto object-cover rounded-2xl bg-white"
                />
              </a>
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
}
