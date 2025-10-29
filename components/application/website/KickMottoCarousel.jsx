"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useEffect } from "react";

const MOTTOS = [
  {
    title: "Tune Into Zen",
    text: "At Kick Lifestyle, technology isn’t about fitting in — it’s about standing out. We create wearables and audio that amplify your confidence, not define your identity.",
  },
  {
    title: "Express Your Style",
    text: "Our tech empowers individuality — every product is crafted to help you move with confidence, sound unique, and live authentically.",
  },
  {
    title: "Built for the Bold",
    text: "From sound to design, we make innovation feel personal — made for those who dare to dream louder and live freer.",
  },
];

export default function KickMottoCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      axis: "y",
      align: "center",
      skipSnaps: false,
    },
    [Autoplay({ delay: 4000, stopOnInteraction: false })]
  );

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
  }, [emblaApi]);

  return (
    <aside
      className="
        relative flex flex-col justify-center items-center text-center
        max-w-sm mx-auto lg:mx-0
        bg-white/5 border border-[#fcba17]/15
        rounded-2xl p-6 md:p-8 backdrop-blur-sm
        shadow-[0_8px_32px_rgba(0,0,0,0.12)]
        h-[320px] overflow-hidden
      "
    >
      <h3 className="text-2xl font-semibold text-white mb-1">Our Motto</h3>
      <div className="my-2 h-[3px] w-16 rounded bg-[#fcba17]" />

      {/* Embla Carousel */}
      <div className="relative w-full h-[220px]" ref={emblaRef}>
        <div className="flex flex-col h-full">
          {MOTTOS.map((motto, idx) => (
            <div
              key={idx}
              className="
                flex-none h-[220px] flex flex-col items-center justify-center px-4
                text-neutral-300/90 text-[15px] leading-relaxed
                transition-all duration-500 ease-in-out
              "
            >
              <p className="font-medium text-white/95 mb-1">{motto.title}</p>
              <p className="max-w-xs">{motto.text}</p>
            </div>
          ))}
        </div>

        {/* Top & Bottom fade masks */}
        <div className="pointer-events-none absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-[#0e0e0e] to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-[#0e0e0e] to-transparent" />
      </div>
    </aside>
  );
}
