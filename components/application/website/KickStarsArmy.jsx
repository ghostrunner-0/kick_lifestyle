"use client";

export default function KickAboutHero({
  leftTitle = "Born in Nepal,",
  leftText = `Kick Lifestyle is more than a tech brand — it’s a symbol of how far passion can go. 
We design next-gen wearables and audio gear that blend bold design, local soul, and world-class performance.`,
  rightTitle = "Built for the Bold.",
  rightText = `We are the KickStars — creators, dreamers, and doers shaping what Nepali innovation means to the world.
Every beat, every feature, every product carries the spirit to go beyond.`,
  videoSrc = "/assets/videos/kick.mp4", // hero video center
}) {
  return (
    <section className="relative mx-auto my-8 max-w-7xl rounded-[32px] bg-[#0e0e0e] px-6 py-16 md:px-10 lg:px-14 overflow-hidden">
      {/* faint yellow backdrop glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fcba17]/10 to-transparent pointer-events-none" />

      <div className="grid items-center gap-12 lg:grid-cols-3 relative z-10">
        {/* LEFT TEXT */}
        <div className="text-center lg:text-left space-y-5">
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            {leftTitle}
          </h2>
          <div className="mx-auto lg:mx-0 h-[3px] w-20 rounded bg-[#fcba17]" />
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
            {leftText}
          </p>
        </div>

        {/* CENTER VIDEO */}
        <div className="relative flex justify-center items-center">
          <div className="relative aspect-square w-[220px] sm:w-[280px] md:w-[340px] lg:w-[360px] rounded-full border border-[#fcba17]/40 shadow-[0_0_35px_rgba(252,186,23,0.3)] overflow-hidden">
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
        <div className="text-center lg:text-right space-y-5">
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            {rightTitle}
          </h2>
          <div className="mx-auto lg:ml-auto lg:mr-0 h-[3px] w-20 rounded bg-[#fcba17]" />
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
            {rightText}
          </p>
        </div>
      </div>

      {/* border highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-[32px] border border-[#fcba17]/20" />
    </section>
  );
}
