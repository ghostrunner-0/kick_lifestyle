"use client";

export default function KickPartnersInfinite({
  partners = [
    { name: "HUKUT", src: "/assets/partners/hukut.svg" },
    { name: "DARAZ", src: "/assets/partners/daraz.svg" },
    { name: "KHALTI", src: "/assets/partners/khalti.svg" },
    { name: "IMEPAY", src: "/assets/partners/imepay.svg" },
    { name: "BROTHER MART", src: "/assets/partners/brothermart.svg" },
  ],
  speedSec = 25, // control the speed here (lower = faster)
}) {
  const logos = [...partners, ...partners]; // duplicate for infinite scroll

  return (
    <section
      className="relative w-full overflow-hidden py-8 select-none"
      aria-label="Official Partners"
    >
      <div className="group flex w-[200%] animate-marquee">
        {logos.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-center mx-10 shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt={item.name}
              className="h-10 sm:h-12 md:h-14 w-auto object-contain opacity-90 hover:opacity-100 transition"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-marquee {
          animation: marquee ${speedSec}s linear infinite;
        }

        /* Pause on hover */
        .group:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
