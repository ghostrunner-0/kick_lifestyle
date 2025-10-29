"use client";

import Link from "next/link";

export default function KickStarsArmy({
  videoSrc = "/assets/videos/kick.mp4",
}) {
  return (
    <section
      className="
        relative my-12 w-full max-w-[1400px] mx-auto
        rounded-[36px] overflow-hidden
        bg-[#0e0e0e]
        px-5 sm:px-8 lg:px-10
        py-14 sm:py-18 lg:py-24
      "
    >
      {/* soft yellow gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fcba17]/10 to-transparent pointer-events-none" />

      <div
        className="
          relative z-10
          grid items-center
          gap-12 sm:gap-14 lg:gap-20
          text-center lg:text-left
          lg:grid-cols-[1fr_auto_1fr]
        "
      >
        {/* LEFT — History / About Text */}
        <div className="flex flex-col justify-center items-center lg:items-start px-2 sm:px-0">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
            We are KickStars
          </h2>
          <div className="mt-3 h-[3px] w-20 rounded bg-[#fcba17]" />

          <p className="mt-6 text-neutral-300 text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0 space-y-3">
            <span className="block font-semibold text-white text-lg sm:text-xl mb-2">
              Born in Nepal. Designed in Nepal. Built for the Bold.
            </span>
            <span className="block">
              Kick Lifestyle was founded to show that the best tech design can
              come from Nepal. Every idea starts here — inspired by our culture,
              creativity, and fearless energy.
            </span>
            <span className="block">
              We design the best tech for a generation that dreams louder and
              lives bolder.
            </span>
          </p>

          <div className="mt-8">
            <Link
              href="/about"
              className="
                inline-flex items-center justify-center
                rounded-xl bg-[#fcba17] text-black font-semibold
                px-6 py-3 shadow hover:bg-[#ffd24d]
                transition-colors
              "
            >
              About Us
            </Link>
          </div>
        </div>

        {/* CENTER — Circular Video */}
        <div className="flex justify-center items-center order-first lg:order-none">
          <div
            className="
              relative aspect-square
              w-[220px] sm:w-[260px] md:w-[300px] lg:w-[340px]
              flex-shrink-0 rounded-full overflow-hidden
              shadow-[0_0_60px_rgba(252,186,23,0.4)]
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

        {/* RIGHT — Motto Card */}
        <aside
          className="
            flex flex-col justify-center items-center text-center
            max-w-sm mx-auto lg:mx-0
            bg-white/5 border border-[#fcba17]/15
            rounded-2xl p-6 md:p-8 backdrop-blur-sm
            shadow-[0_8px_32px_rgba(0,0,0,0.12)]
          "
        >
          <h3 className="text-2xl font-semibold text-white">Our Motto</h3>
          <div className="my-3 h-[3px] w-16 rounded bg-[#fcba17]" />
          <p className="text-neutral-300/90 text-[15px] leading-relaxed max-w-xs">
            <span className="block font-medium text-white/95 mb-1">
              Tune Into Zen
            </span>
            At Kick Lifestyle, technology isn’t about fitting in — it’s about
            standing out. We create wearables and audio that amplify your
            confidence, not define your identity.
          </p>
        </aside>
      </div>

      {/* faint border outline */}
      <div className="pointer-events-none absolute inset-0 rounded-[36px] border border-[#fcba17]/20" />
    </section>
  );
}
