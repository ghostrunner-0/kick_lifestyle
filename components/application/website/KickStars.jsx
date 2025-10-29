"use client";

export default function KickAboutHero({
  leftTitle = "Born in Nepal,",
  leftText = `Kick Lifestyle is more than a tech brand — it’s a symbol of how far passion can go. 
We design next-gen wearables and audio gear that blend bold design, local soul, and world-class performance.`,
  rightTitle = "Built for the Bold.",
  rightText = `We are the KickStars — creators, dreamers, and doers shaping what Nepali innovation means to the world.
Every beat, every feature, every product carries the spirit to go beyond.`,
  videoSrc = "/assets/videos/kick.mp4",
}) {
  return (
    <section
      className="
        relative 
        w-full max-w-none
        rounded-[40px]
        bg-[#0e0e0e]
        mx-[10px] sm:mx-[20px] lg:mx-[100px]
        py-16 sm:py-20 lg:py-24
        overflow-hidden
      "
    >
      {/* soft yellow glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fcba17]/10 to-transparent pointer-events-none" />

      <div className="grid items-center gap-12 lg:gap-16 lg:grid-cols-3 relative z-10">
        {/* LEFT TEXT */}
        <div className="text-center lg:text-left space-y-6 px-4 sm:px-6 md:px-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            {leftTitle}
          </h2>
          <div className="mx-auto lg:mx-0 h-[3px] w-20 rounded bg-[#fcba17]" />
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
            {leftText}
          </p>
        </div>

        {/* CENTER VIDEO */}
        <div className="relative flex justify-center items-center">
          <div
            className="
              relative aspect-square
              w-[240px] sm:w-[280px] md:w-[320px] lg:w-[340px]
              rounded-full border border-[#fcba17]/40
              shadow-[0_0_50px_rgba(252,186,23,0.35)]
              overflow-hidden
            "
          >
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

        {/* RIGHT TEXT */}
        <div className="text-center lg:text-right space-y-6 px-4 sm:px-6 md:px-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            {rightTitle}
          </h2>
          <div className="mx-auto lg:ml-auto lg:mr-0 h-[3px] w-20 rounded bg-[#fcba17]" />
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
            {rightText}
          </p>
        </div>
      </div>

      {/* thin border outline */}
      <div className="pointer-events-none absolute inset-0 rounded-[40px] border border-[#fcba17]/25" />
    </section>
  );
}
