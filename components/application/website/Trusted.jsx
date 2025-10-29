"use client";
import React, { useMemo } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

/* Sample testimonials (replace or pass via props) */
const SAMPLE = [
  {
    name: "Rikesh N",
    title: "KICK NEKXA BUDS Z10",
    body: "Mero second Kick Nekxa ko Z10 buds. First 1800 ma kiney, yo 1400 ma — dami cha! Gaming mode sabai try gareko earbuds maddhe best.",
    rating: 5,
  },
  {
    name: "Anisha T",
    title: "NEKXA Z50 Pro",
    body: "Battery life is insane and the bass is clean, not muddy. Mic quality is way better than my last pair. Totally worth it.",
    rating: 4.5,
  },
  {
    name: "Sujal K",
    title: "NEKXA Pods Air",
    body: "Super comfy fit. Crystal-clear calls on Zoom and the transparency mode feels natural. Would recommend.",
    rating: 5,
  },
];

/* Helpers */
const initials = (n = "") =>
  n
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Star = ({ filled }) => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.3"
  >
    <path d="M12 17.3l-5.11 3.02 1.37-5.87L3 9.74l5.96-.51L12 3.8l3.04 5.43 5.96.51-5.26 4.71 1.37 5.87z" />
  </svg>
);

const Stars = ({ value = 5 }) => {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="relative inline-block">
          <Star filled={i < full || (i === full && half)} />
          {i === full && half && (
            <span className="absolute inset-0 w-1/2 overflow-hidden">
              <Star filled />
            </span>
          )}
        </span>
      ))}
    </div>
  );
};

/* Fixed Slick arrows */
const SlickArrow = ({ dir, className = "", style = {}, onClick }) => {
  const side =
    dir === "prev" ? { left: 8, right: "auto" } : { right: 8, left: "auto" };
  return (
    <button
      type="button"
      aria-label={dir === "prev" ? "Previous" : "Next"}
      className={[
        className,
        "!absolute top-1/2 -translate-y-1/2 !z-20",
        "h-10 w-10 grid place-items-center rounded-full bg-white/95 shadow ring-1 ring-black/5",
        "hover:bg-white transition",
      ].join(" ")}
      style={{ ...style, ...side }}
      onClick={onClick}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 text-slate-900"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        {dir === "prev" ? (
          <path d="M15 18l-6-6 6-6" />
        ) : (
          <path d="M9 6l6 6-6 6" />
        )}
      </svg>
    </button>
  );
};
const NextArrow = (props) => <SlickArrow {...props} dir="next" />;
const PrevArrow = (props) => <SlickArrow {...props} dir="prev" />;

export default function Trusted({ testimonials = SAMPLE }) {
  const items = useMemo(
    () => (Array.isArray(testimonials) ? testimonials : [testimonials]),
    [testimonials]
  );

  const settings = useMemo(
    () => ({
      dots: true,
      arrows: items.length > 1,
      nextArrow: <NextArrow />,
      prevArrow: <PrevArrow />,
      infinite: items.length > 1,
      speed: 450,
      autoplay: items.length > 1,
      autoplaySpeed: 5200,
      slidesToShow: 1,
      slidesToScroll: 1,
      pauseOnHover: true,
      adaptiveHeight: true,
      appendDots: (dots) => (
        <div style={{ marginTop: 14 }}>
          <ul
            style={{
              margin: 0,
              display: "flex",
              gap: 8,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {dots}
          </ul>
        </div>
      ),
      customPaging: () => (
        <span
          style={{
            display: "block",
            width: 8,
            height: 8,
            borderRadius: 6,
            background: "#cbd5e1",
          }}
        />
      ),
    }),
    [items.length]
  );

  return (
    <section className="w-full bg-[#EFEFD9]">
      <div className="mx-auto max-w-screen-2xl px-2 sm:px-3 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 py-12 md:py-16">
          {/* Left: centered on mobile & desktop */}
          <div className="lg:col-span-6 flex items-center justify-center text-center">
            <div className="max-w-xl">
              <p className="text-sm md:text-base font-medium text-neutral-700">
                Most Trusted Brand Of{" "}
                <span className="text-[#fcba17] font-semibold">Nepal</span>
              </p>
              <h2 className="mt-4 text-4xl md:text-5xl xl:text-6xl font-bold leading-tight tracking-tight text-neutral-900">
                <span className="text-[#fcba17]">100K+</span> satisfied
                customers
              </h2>
            </div>
          </div>

          {/* Right: Carousel */}
          <div className="lg:col-span-6">
            <div className="relative bg-white rounded-2xl shadow-sm ring-1 ring-black/5">
              <Slider {...settings} className="trusted-slick">
                {items.map((t, i) => (
                  <div key={i}>
                    <article className="p-5 md:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-700 grid place-items-center font-semibold">
                            {initials(t.name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-800">
                              {t.name}
                            </p>
                            <Stars value={t.rating ?? 5} />
                          </div>
                        </div>
                        <svg
                          viewBox="0 0 24 24"
                          className="h-6 w-6 text-slate-300"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M7.17 6A4.17 4.17 0 0 0 3 10.17V21h6.25v-9.17H6.5A2.5 2.5 0 1 1 9 9.33V6H7.17Zm9 0A4.17 4.17 0 0 0 12 10.17V21h6.25v-9.17h-2.75A2.5 2.5 0 1 1 18.5 9.33V6h-2.33Z" />
                        </svg>
                      </div>

                      <h3 className="text-xl md:text-2xl font-semibold text-neutral-900">
                        {t.title}
                      </h3>
                      <p className="text-neutral-600 leading-7">{t.body}</p>
                    </article>
                  </div>
                ))}
              </Slider>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .slick-prev:before,
        .slick-next:before {
          content: "" !important;
        }
        .slick-slider,
        .slick-list,
        .slick-track,
        .slick-slide {
          background: transparent !important;
        }
        .slick-dots li.slick-active span {
          width: 20px !important;
          background: #0f172a !important; /* slate-900 */
        }
      `}</style>
    </section>
  );
}
