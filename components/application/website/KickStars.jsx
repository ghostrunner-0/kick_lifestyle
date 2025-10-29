"use client";

import Link from "next/link";

export default function KickStarsArmy({
  videoSrc = "/assets/videos/kick.mp4",
}) {
  return (
    <section
      className="
    relative my-12
    w-full max-w-[1400px] mx-auto   
    rounded-[36px] overflow-hidden
    bg-[#0e0e0e]
    px-4 sm:px-6 lg:px-10         
    py-16 sm:py-20 lg:py-24
  "
    >
      {/* soft yellow gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fcba17]/12 to-transparent pointer-events-none" />

      <div
        className="
          grid relative z-10
          items-center
          lg:grid-cols-[1fr_auto_1fr]
          gap-10 sm:gap-14 lg:gap-20
          px-4 sm:px-6 md:px-10
        "
      >
        {/* LEFT — main history text */}
        <div className="text-center lg:text-left">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
            We are KickStars
          </h2>
          <div className="mx-auto lg:mx-0 mt-3 h-[3px] w-20 rounded bg-[#fcba17]" />
          <p className="mt-6 text-neutral-300 text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
            Born in Nepal — built for the bold. Kick Lifestyle started with a
            simple mission: create world-class tech that feels personal. We
            design wearables and audio gear that fuse Nepali spirit with global
            performance. From bold design to precise tuning, every detail exists
            to inspire the next generation of dreamers and doers.
          </p>

          <div className="mt-8">
            <Link
              href="/about"
              className="
                inline-flex items-center justify-center
                rounded-xl bg-[#fcba17] text-black font-semibold
                px-6 py-3 shadow hover:bg-[#ffd24d] transition-colors
              "
            >
              About Us
            </Link>
          </div>
        </div>

        {/* CENTER — circular video, always centered */}
        <div className="flex justify-center items-center">
          <div
            className="
      relative aspect-square
      w-[240px] sm:w-[280px] md:w-[320px] lg:w-[340px]
      flex-shrink-0 rounded-full overflow-hidden
      shadow-[0_0_50px_rgba(252,186,23,0.35)]
    "
          >
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full border-[3px] border-[#fcba17]/60" />

            {/* Inner subtle ring */}
            <div className="absolute inset-[6px] rounded-full border border-[#fcba17]/25" />

            {/* Video layer */}
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

        {/* RIGHT — motto */}
        <aside
          className="
    flex flex-col justify-center items-center text-center
    max-w-sm mx-auto lg:mx-0
    bg-white/5 border border-[#fcba17]/15
    rounded-2xl p-6 md:p-8 backdrop-blur-sm
    shadow-[0_8px_32px_rgba(0,0,0,0.12)]
    min-h-[280px]
  "
        >
          <h3 className="text-2xl font-semibold text-white">Our Motto</h3>
          <div className="my-3 h-[3px] w-16 rounded bg-[#fcba17]" />
          <p className="text-neutral-300/90 text-[15px] leading-relaxed max-w-xs">
            <span className="font-medium text-white/95">
              Express Your Style.
            </span>{" "}
            Technology should amplify individuality — not define it. Every Kick
            product empowers you to move with confidence, sound unique, and live
            without limits.
          </p>
        </aside>
      </div>

      {/* faint outline */}
      <div className="pointer-events-none absolute inset-0 rounded-[36px] border border-[#fcba17]/20" />
    </section>
  );
}
