"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Quote } from "lucide-react";

const REVIEWS = [
  {
    logo: "/assets/coverage/gadgetbyte.png",
    name: "GadgetByte Nepal",
    quote:
      "Kick Lifestyle blends design and innovation that rivals global tech brands — from sound to finish, it’s world-class.",
  },
  {
    logo: "/assets/coverage/techsathi.png",
    name: "TechSathi",
    quote:
      "Kick is not just a Nepali brand — it’s a statement of modern craftsmanship and digital vision.",
  },
  {
    logo: "/assets/coverage/madtech.png",
    name: "MAD Tech Reviews",
    quote:
      "Every Kick product feels premium. You sense the detail — packaging, materials, the experience.",
  },
  {
    logo: "/assets/coverage/nepalitelevision.png",
    name: "Nepali Television",
    quote:
      "Kick Lifestyle stands among Nepal’s leading homegrown tech pioneers.",
  },
  {
    logo: "/assets/coverage/neptech.png",
    name: "NepTech",
    quote:
      "A perfect mix of bold design and practical innovation — made for Nepali lifestyles.",
  },
  {
    logo: "/assets/coverage/uktv.png",
    name: "UK Tech View",
    quote:
      "Design-first, detail-obsessed — Kick is raising expectations for homegrown tech brands.",
  },
];

function PressCard({ r, tall = false }) {
  return (
    <article
      className={[
        "relative flex flex-col rounded-2xl border border-[#fcba17]/15",
        "bg-white/60 dark:bg-neutral-950/55 backdrop-blur-md",
        "shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] transition",
        tall ? "p-7 sm:p-8" : "p-6 sm:p-7",
        tall
          ? "p-5 sm:p-6 min-h-[140px] sm:min-h-[160px]"
          : "p-4 sm:p-5 min-h-[120px] sm:min-h-[140px]",
      ].join(" ")}
    >
      <span className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl bg-[#fcba17]" />
      <Quote className="absolute right-5 top-5 h-5 w-5 text-[#fcba17]/55" />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative h-10 w-10 rounded-full bg-white ring-1 ring-[#fcba17]/35 overflow-hidden grid place-items-center">
          <Image
            src={r.logo}
            alt={r.name}
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
        <div>
          <h3 className="text-[15px] sm:text-base font-semibold text-foreground">
            {r.name}
          </h3>
          <div className="mt-1 h-[3px] w-10 rounded bg-[#fcba17]" />
        </div>
      </div>

      <p className="text-[14.5px] sm:text-[15px] leading-relaxed text-muted-foreground">
        “{r.quote}”
      </p>
    </article>
  );
}

export default function KickReviewsCoverage() {
  // Split into 3-card slides (masonry style)
  const chunkSize = 3;
  const slides = [];
  for (let i = 0; i < REVIEWS.length; i += chunkSize) {
    slides.push(REVIEWS.slice(i, i + chunkSize));
  }

  // Duplicate last slide if incomplete
  if (slides.length && slides[slides.length - 1].length < 3) {
    const last = slides[slides.length - 1];
    last.push(...REVIEWS.slice(0, 3 - last.length));
  }

  const autoplay = useRef(
    Autoplay({ delay: 3800, stopOnInteraction: false, stopOnMouseEnter: true })
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", containScroll: "trimSnaps", dragFree: false },
    [autoplay.current]
  );

  // Smooth progress bar (no API version error)
  const [progress, setProgress] = useState(0);
  const onScroll = useCallback((api) => {
    if (!api) return;
    const p = Math.max(0, Math.min(1, api.scrollProgress()));
    const snapCount =
      typeof api.scrollSnapList === "function"
        ? api.scrollSnapList().length
        : (api.internalEngine?.().scrollSnaps || []).length;
    setProgress(snapCount <= 1 ? 1 : p);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onScroll(emblaApi);
    emblaApi.on("scroll", onScroll);
    emblaApi.on("reInit", onScroll);
    return () => {
      emblaApi.off("scroll", onScroll);
      emblaApi.off("reInit", onScroll);
    };
  }, [emblaApi, onScroll]);

  return (
    <section className="relative mx-auto my-20 w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 2xl:px-16">
      {/* Header */}
      <div className="mb-10 flex flex-col items-center text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Reviews & Coverage
        </h2>
        <div className="mt-3 h-[3px] w-24 rounded bg-[#fcba17]" />
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl">
          What the press and creators say about Kick Lifestyle.
        </p>
      </div>

      {/* Carousel */}
      <div className="relative">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-6 sm:gap-8 will-change-transform">
            {slides.map((group, idx) => (
              <div
                key={idx}
                className="flex-[0_0_88%] xs:flex-[0_0_82%] sm:flex-[0_0_70%] lg:flex-[0_0_58%] rounded-3xl"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-7">
                  <div className="flex flex-col gap-6 sm:gap-7">
                    <PressCard r={group[0]} tall />
                    <PressCard r={group[1]} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <PressCard r={group[2]} tall />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-white to-transparent dark:from-neutral-950" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-white to-transparent dark:from-neutral-950" />

        {/* Progress bar */}

      </div>
    </section>
  );
}
