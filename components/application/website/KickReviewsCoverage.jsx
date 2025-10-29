"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Quote } from "lucide-react";

export default function KickReviewsCoverage() {
  const autoplay = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })
  );
  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: "center", skipSnaps: false, dragFree: true },
    [autoplay.current]
  );

  const REVIEWS = [
    {
      logo: "/assets/coverage/gadgetbyte.png",
      name: "GadgetByte Nepal",
      quote:
        "“Kick Lifestyle blends design and innovation that rivals global tech brands — from sound to finish, it’s world-class.”",
    },
    {
      logo: "/assets/coverage/techsathi.png",
      name: "TechSathi",
      quote:
        "“Kick is not just a Nepali brand — it’s a statement of modern craftsmanship and digital vision.”",
    },
    {
      logo: "/assets/coverage/madtech.png",
      name: "MAD Tech Reviews",
      quote:
        "“Every Kick product feels premium. You sense the detail — packaging, materials, the experience.”",
    },
    {
      logo: "/assets/coverage/nepalitelevision.png",
      name: "Nepali Television",
      quote:
        "“Kick Lifestyle stands among Nepal’s leading homegrown tech pioneers.”",
    },
    {
      logo: "/assets/coverage/neptech.png",
      name: "NepTech",
      quote:
        "“A perfect mix of bold design and practical innovation — made for Nepali lifestyles.”",
    },
  ];

  return (
    <section className="relative mx-auto my-24 max-w-[1600px] px-4 sm:px-6 lg:px-10 2xl:px-16 overflow-hidden">
      {/* Section Header */}
      <div className="flex flex-col items-center text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Reviews & Coverage
        </h2>
        <div className="mt-3 h-[3px] w-24 rounded bg-[#fcba17]" />
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl">
          Featured across Nepal’s top tech channels and media outlets.
        </p>
      </div>

      {/* Carousel */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-8">
          {REVIEWS.map((r, i) => (
            <div
              key={i}
              className="
                flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_30%]
                relative rounded-3xl
                bg-gradient-to-b from-white/70 to-white/40 dark:from-neutral-950/70 dark:to-neutral-950/40
                border border-[#fcba17]/10
                backdrop-blur-md
                p-8 sm:p-10
                shadow-[0_6px_30px_rgba(252,186,23,0.05)]
                hover:shadow-[0_10px_40px_rgba(252,186,23,0.1)]
                transition-all duration-500 ease-out
              "
            >
              {/* logo */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative h-12 w-12 rounded-full overflow-hidden bg-white ring-1 ring-[#fcba17]/40 flex items-center justify-center">
                  <Image
                    src={r.logo}
                    alt={r.name}
                    width={60}
                    height={60}
                    className="object-contain"
                  />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {r.name}
                </h3>
              </div>

              {/* quote */}
              <Quote className="absolute right-6 top-6 h-5 w-5 text-[#fcba17]/50" />
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                {r.quote}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* subtle yellow glow line */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#fcba17]/40 to-transparent" />
    </section>
  );
}
