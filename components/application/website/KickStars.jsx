"use client";

import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useEffect } from "react";

const MOTTOS = [
  {
    heading: "Our Motto",
    title: "Tune Into Zen",
    text: "At Kick Lifestyle, technology isn’t about fitting in — it’s about standing out. We create wearables and audio that amplify your confidence, not define your identity.",
  },
  {
    heading: "Our Philosophy",
    title: "Express Your Style",
    text: "Kick Lifestyle is built on individuality. Every piece of tech we design celebrates personal freedom, bold design, and everyday confidence.",
  },
  {
    heading: "Our Belief",
    title: "Built for the Bold",
    text: "From precision audio to seamless wearables — each product is crafted for those who dream louder, move faster, and live bolder.",
  },
];

export default function KickStarsArmy({
  videoSrc = "/assets/videos/kick.mp4",
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      axis: "y",
      align: "center",
      skipSnaps: false,
      dragFree: false,
      containScroll: "trimSnaps",
    },
    [Autoplay({ delay: 4500, stopOnInteraction: false })]
  );

  useEffect(() => {
    if (!emblaApi) return;
    const reinit = () => emblaApi.reInit();
    reinit();
    window.addEventListener("resize", reinit);
    return () => window.removeEventListener("resize", reinit);
  }, [emblaApi]);

  return (
    <section
      className="
         relative my-10 w-full max-w-[1400px] mx-4 sm:mx-auto
  rounded-[24px] sm:rounded-[30px] lg:rounded-[36px]
  overflow-hidden bg-[#0e0e0e]
  px-4 sm:px-8 lg:px-16
  py-12 sm:py-18 lg:py-6
      "
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#fcba17]/10 to-transparent pointer-events-none" />

      <div
        className="
          relative z-10 grid items-center
          gap-10 sm:gap-16 lg:gap-28
          text-center lg:text-left
          /* mobile stacks, desktop 3 columns */
          lg:grid-cols-[1fr_auto_1fr]
        "
      >
        {/* LEFT — About */}
        <div className="flex flex-col justify-center items-center lg:items-start">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            We are KickStars
          </h2>
          <div className="mt-3 h-[3px] w-16 sm:w-20 rounded bg-[#fcba17]" />
          <p className="mt-5 text-neutral-300 text-[15px] sm:text-base lg:text-lg leading-relaxed max-w-md mx-auto lg:mx-0 space-y-3">
            <span className="block font-semibold text-white text-base sm:text-lg lg:text-xl mb-1.5">
              Born in Nepal. Designed in Nepal. Built for the Bold.
            </span>
            <span className="block">
              Kick Lifestyle was founded to show that the best tech design can
              come from Nepal — inspired by our creativity, culture, and
              fearless energy.
            </span>
            <span className="block">
              We design the best tech for a generation that dreams louder and
              lives bolder.
            </span>
          </p>
          <div className="mt-7 w-full sm:w-auto">
            <Link
              href="/about"
              className="
                inline-flex w-full sm:w-auto items-center justify-center
                rounded-xl bg-[#fcba17] text-black font-semibold
                px-5 sm:px-6 py-3 shadow hover:bg-[#ffd24d] transition-colors
              "
            >
              About Us
            </Link>
          </div>
        </div>

        {/* CENTER — Video (always centered) */}
        <div className="flex justify-center items-center order-first lg:order-none">
          <div
            className="
              relative aspect-square
              w-[190px] xs:w-[210px] sm:w-[260px] md:w-[320px] lg:w-[360px]
              flex-shrink-0 rounded-full overflow-hidden
              shadow-[0_0_60px_rgba(252,186,23,0.4)]
            "
          >
            <div className="absolute inset-0 rounded-full border-[3px] border-[#fcba17]/60" />
            <div className="absolute inset-[6px] rounded-full border border-[#fcba17]/25" />
            <video
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover rounded-full"
            />
          </div>
        </div>

        {/* RIGHT — Card Slider (mobile-tuned) */}
        <div
          className="
            relative w-full max-w-sm mx-auto lg:mx-0
            overflow-hidden h-full
            flex justify-center items-center
          "
        >
          <div
            ref={emblaRef}
            className="
              relative
              h-[420px] xs:h-[460px] sm:h-[520px] md:h-[560px] lg:h-[600px]
              overflow-hidden touch-pan-y overscroll-contain
            "
          >
            {/* top gap for the first card + bottom symmetry */}
            <div className="flex flex-col h-full gap-4 sm:gap-5 pt-5 sm:pt-6 pb-3 sm:pb-4">
              {MOTTOS.map((m, i) => (
                <div
                  key={i}
                  className="
                    flex-none
                    h-[220px] xs:h-[240px] sm:h-[260px] md:h-[300px] lg:h-[320px]
                    flex flex-col justify-center items-center text-center
                    rounded-2xl backdrop-blur-sm
                    border border-[#fcba17]/20 bg-white/5
                    shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                    px-5 sm:px-6 md:px-8 py-6 sm:py-7 md:py-9
                  "
                >
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-1">
                    {m.heading}
                  </h3>
                  <div className="my-2 sm:my-3 h-[3px] w-14 sm:w-16 rounded bg-[#fcba17]" />
                  <p className="text-white font-medium text-sm sm:text-base mb-1.5 sm:mb-2">
                    {m.title}
                  </p>
                  <p className="text-neutral-300/90 text-[13.5px] sm:text-[15px] leading-relaxed max-w-xs">
                    {m.text}
                  </p>
                </div>
              ))}
            </div>

            {/* fades */}
            <div className="pointer-events-none absolute top-0 left-0 w-full h-14 sm:h-16 bg-gradient-to-b from-[#0e0e0e] to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 w-full h-14 sm:h-16 bg-gradient-to-t from-[#0e0e0e] to-transparent" />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-[24px] sm:rounded-[30px] lg:rounded-[36px] border border-[#fcba17]/20" />
    </section>
  );
}
