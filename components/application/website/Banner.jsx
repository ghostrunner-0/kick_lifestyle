// components/application/website/Banner.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Slider from "react-slick";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function Banner({ banners = [], loading = false }) {
  const [active, setActive] = useState(0);
  const [currentBg, setCurrentBg] = useState(banners?.[0]?.bgColor || "#ffffff");
  const sliderRef = useRef(null);

  // helpers for gradient background
  const hexToRgb = (hex) => {
    const v = hex?.replace("#", "") || "ffffff";
    const n = v.length === 3 ? v.split("").map((c) => c + c).join("") : v;
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

  useEffect(() => {
    const nextColor = banners?.[active]?.bgColor || banners?.[0]?.bgColor;
    if (nextColor) setCurrentBg(nextColor);
  }, [active, banners]);

  const settings = useMemo(
    () => ({
      dots: true,
      infinite: true,
      speed: 300,
      cssEase: "ease-out",
      fade: true,
      slidesToShow: 1,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 4200,
      pauseOnHover: false,
      pauseOnDotsHover: true,
      arrows: false,
      touchThreshold: 12,
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
      customPaging: (i) => (
        <div
          style={{
            height: 8,
            borderRadius: 8,
            backgroundColor: i === active ? "#ffffff" : "#d4d4d4",
            width: i === active ? 24 : 8,
            transition: "all 0.3s ease",
          }}
        />
      ),
    }),
    [active]
  );

  return (
    <div className="relative w-full bg-white isolate">
      {/* gradient wash */}
      <div
        className="absolute left-0 right-0 top-0 -z-10 overflow-hidden h-[45vh] min-h-[260px] max-h-[520px]"
        style={{ backgroundImage: mkGradient(currentBg) }}
      />

      <div className="relative z-10 max-w-[1980px] mx-auto px-2 sm:px-4 pt-20 pb-12">
        {loading || banners.length === 0 ? (
          <div className="px-2 sm:px-5">
            <Skeleton className="w-full h-[200px] md:h-[400px] rounded-2xl" />
          </div>
        ) : (
          <Slider ref={sliderRef} {...settings}>
            {banners.map(({ _id, desktopImage, mobileImage, href }, i) => {
              const desktopSrc = desktopImage?.path || mobileImage?.path || "";
              const mobileSrc = mobileImage?.path || desktopImage?.path || "";
              const alt = desktopImage?.alt || mobileImage?.alt || "Banner";
              const isLCP = i === 0;

              return (
                <div key={_id || i} className="px-2 sm:px-5">
                  <a
                    href={href || "#"}
                    target={href && href !== "#" ? "_blank" : undefined}
                    rel="noreferrer"
                    className="block rounded-2xl overflow-hidden shadow-lg"
                  >
                    {/* Desktop (auto height) */}
                    <div className="hidden md:block">
                      <picture>
                        <source media="(min-width: 768px)" srcSet={desktopSrc} />
                        <Image
                          src={desktopSrc}
                          alt={alt}
                          width={1600}
                          height={900}
                          sizes="(min-width: 1280px) 1263px, (min-width: 768px) 100vw, 100vw"
                          className="w-full h-auto object-cover rounded-2xl"
                          {...(isLCP ? { loading: "eager", fetchPriority: "high" } : {})}
                        />
                      </picture>
                    </div>

                    {/* Mobile (fixed 740px height) */}
                    <div className="block md:hidden relative w-full h-[500px] rounded-2xl overflow-hidden">
                      <Image
                        src={mobileSrc}
                        alt={alt}
                        fill
                        sizes="100vw"
                        className="object-cover rounded-2xl"
                        {...(isLCP ? { loading: "eager", fetchPriority: "high" } : {})}
                      />
                    </div>
                  </a>
                </div>
              );
            })}
          </Slider>
        )}
      </div>

      <style jsx global>{`
        .slick-slider,
        .slick-list,
        .slick-track,
        .slick-slide {
          background: transparent !important;
        }
        .slick-slide > div {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}
