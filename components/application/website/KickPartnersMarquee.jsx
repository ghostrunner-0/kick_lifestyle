"use client";

import Image from "next/image";
import { useMemo } from "react";

export default function KickPartnersInfinite({
  partners = [
    { name: "HUKUT", src: "/assets/images/hukut.png" },
    { name: "DARAZ", src: "/assets/images/daraz.png" },
    { name: "KHALTI", src: "/assets/images/khalti.png" },
    { name: "BROTHER MART", src: "/assets/images/Brothermart.png" },
  ],
  speedSec = 70, // 👈 increase for slower, smoother motion
}) {
  // duplicate multiple times for seamless looping
  const logos = useMemo(() => Array(3).fill(partners).flat(), [partners]);

  return (
    <section
      className="relative w-full overflow-hidden py-10 bg-transparent select-none"
      aria-label="Official Partners"
    >
      <div className="flex flex-col items-center justify-center text-center gap-4">
        <h2 className="text-lg font-semibold tracking-wide text-gray-800 dark:text-gray-100">
          Our Official Partners
        </h2>

        <div className="relative w-full overflow-hidden">
          {/* Infinite scroll container */}
          <div
            className="flex animate-marquee-smooth"
            style={{
              animationDuration: `${speedSec}s`,
            }}
          >
            {logos.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-center mx-10 shrink-0"
              >
                <Image
                  src={item.src}
                  alt={item.name}
                  width={180}
                  height={60}
                  className="h-10 sm:h-12 md:h-14 w-auto object-contain opacity-90 hover:opacity-100 transition-all duration-500 ease-in-out"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee-smooth {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-marquee-smooth {
          display: flex;
          align-items: center;
          animation: marquee-smooth linear infinite;
          will-change: transform;
          backface-visibility: hidden;
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </section>
  );
}
