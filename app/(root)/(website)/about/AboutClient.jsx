// app/(root)/(website)/about/AboutClient.jsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Battery, Mic2, Waves, Clock, Quote, ChevronRight } from "lucide-react";

const ACCENT = "#fcba17";

/* motion helpers */
const container = (delay = 0, stagger = 0.06) => ({
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.5, ease: "easeOut", when: "beforeChildren", staggerChildren: stagger },
  },
});
const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};
const fade = (d = 0) => ({
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut", delay: d } },
});
const rise = (d = 0) => ({
  hidden: { opacity: 0, y: 22, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: "easeOut", delay: d } },
});

/* Safe <img> */
function SafeImg({ src, alt, className }) {
  const FALLBACK_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  const [url, setUrl] = useState(src || "");
  useEffect(() => { setUrl(src || ""); }, [src]);

  return (
    <img
      src={url || FALLBACK_IMG}
      alt={alt || ""}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => { if (url !== FALLBACK_IMG) setUrl(FALLBACK_IMG); }}
    />
  );
}

/* Press logos — add files in /public/art */
export const PRESS_LOGOS = [
  { src: "/art/kathmandu-post.jpeg", alt: "The Kathmandu Post", href: "https://kathmandupost.com/" },
  { src: "/art/ict.png", alt: "ICT Frame", href: "https://ictframe.com/" },
  { src: "/art/techlekh.png", alt: "TechLekh", href: "https://techlekh.com/" },
  { src: "/art/onlinekhabar.png", alt: "OnlineKhabar", href: "https://www.onlinekhabar.com/" },
  { src: "/art/gadgetbyte.png", alt: "Gadgetbyte", href: "https://www.gadgetbytenepal.com/" },
  { src: "/art/myrepublica.jpg", alt: "MyRepublica", href: "https://myrepublica.nagariknetwork.com/" },
  { src: "/art/himalayan-times.jpg", alt: "The Himalayan Times", href: "https://thehimalayantimes.com/" },
  { src: "/art/nepali-times.jpg", alt: "Nepali Times", href: "https://nepalitimes.com/" },
  { src: "/art/setopati.png", alt: "Setopati", href: "https://setopati.com/" },
  { src: "/art/ratopati.webp", alt: "Ratopati", href: "https://ratopati.com/" },
  { src: "/art/bizmandu.png", alt: "Bizmandu", href: "https://bizmandu.com/" },
  { src: "/art/techsathi.png", alt: "TechSathi", href: "https://techsathi.com/" },
  { src: "/art/gadgets-in-nepal.png", alt: "Gadgets In Nepal", href: "https://www.gadgetsinnepal.com.np/" },
  { src: "/art/techsansar.jpg", alt: "TechSansar", href: "https://www.techsansar.com/" },
  { src: "/art/ekantipur.png", alt: "ekantipur", href: "https://ekantipur.com/" },
  { src: "/art/annapurna-post.png", alt: "Annapurna Post", href: "https://annapurnapost.com/" },
];

const TEAM = [
  { name: "Sunit Begwani", role: "Chairman", photo: "", ig: "", li: "" },
  { name: "Kumod Begwani", role: "Founder & CEO", photo: "", ig: "https://www.instagram.com/itsmekumod/", li: "" },
  { name: "Priyanshu Jain", role: "Technical Team Manager", photo: "", ig: "https://www.instagram.com/jain.priyanshu.74/", li: "" },
  { name: "Jamling Sherpa", role: "Cheif Editor", photo: "", ig: "", li: "" },
];

export default function AboutClient() {
  const prefersReduced = useReducedMotion();

  /* sticky-header offset so anchors don’t hide under it */
  const [headerOffset, setHeaderOffset] = useState(96);
  useEffect(() => {
    const measure = () => {
      const h =
        document.querySelector("header[data-site-header]") ||
        document.querySelector("header");
      if (h) setHeaderOffset(Math.max(64, Math.min(160, Math.round(h.getBoundingClientRect().height))));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const scrollMargin = headerOffset + 18;

  /* timeline progress bar */
  const scrollerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      setProgress(max > 0 ? el.scrollLeft / max : 0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.main
        initial="hidden"
        animate="show"
        variants={container(0.05, prefersReduced ? 0 : 0.06)}
        className="mx-auto w-full max-w-[1400px] [padding-inline:clamp(1rem,5vw,5rem)] pb-20 pt-8 sm:pt-12 space-y-16"
      >
        {/* ===== HERO / TITLE ===== */}
        <section id="hero" className="mx-auto w-full max-w-[1200px]" style={{ scrollMarginTop: scrollMargin }}>
          <motion.div
            variants={fade(0)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            className="relative overflow-hidden rounded-[28px] border bg-neutral-950 text-white px-6 py-12 sm:px-10 sm:py-16"
          >
            {/* Nepal map with golden glow */}
            <div className="pointer-events-none absolute inset-0 z-0 grid place-items-center" aria-hidden>
              <img
                src="/art/nepal.svg"
                alt=""
                className="w-[min(980px,94vw)] h-auto"
                style={{
                  filter: `
                    drop-shadow(0 0 22px rgba(252,186,23,.45))
                    drop-shadow(0 0 60px rgba(252,186,23,.30))
                    drop-shadow(0 0 120px rgba(252,186,23,.18))
                  `,
                  opacity: 0.96,
                }}
              />
            </div>

            {/* radar grid rings */}
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden>
              <div
                className="rounded-full"
                style={{
                  width: "min(1400px,140vw)",
                  height: "min(1400px,140vw)",
                  background:
                    "repeating-radial-gradient(circle at center, rgba(255,255,255,0.06) 0 1px, rgba(0,0,0,0) 1px 28px)",
                  WebkitMaskImage:
                    "radial-gradient(closest-side at 50% 50%, rgba(255,255,255,0.75), transparent 70%)",
                  maskImage:
                    "radial-gradient(closest-side at 50% 50%, rgba(255,255,255,0.75), transparent 70%)",
                }}
              />
            </div>

            {/* radar sweeping beam */}
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" aria-hidden>
              <div
                className="rounded-full animate-radar-spin"
                style={{
                  width: "min(1200px,120vw)",
                  height: "min(1200px,120vw)",
                  background:
                    "conic-gradient(from 0deg at 50% 50%, rgba(252,186,23,.45) 0deg, rgba(252,186,23,0) 24deg 360deg)",
                  filter: "blur(8px) saturate(1.1)",
                  WebkitMaskImage:
                    "radial-gradient(closest-side at 50% 50%, rgba(255,255,255,.9), transparent 70%)",
                  maskImage:
                    "radial-gradient(closest-side at 50% 50%, rgba(255,255,255,.9), transparent 70%)",
                  opacity: 0.7,
                }}
              />
            </div>

            {/* soft center glow */}
            <div
              aria-hidden
              className="absolute inset-0 z-20"
              style={{ background: "radial-gradient(70% 50% at 50% 45%, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 60%)" }}
            />

            {/* content */}
            <motion.div
              variants={container(0, prefersReduced ? 0 : 0.05)}
              className="relative z-30 flex flex-col items-center text-center"
            >
              <motion.span variants={child} className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">
                Proudly Nepali • Since 2023
              </motion.span>

              <motion.h1
                variants={child}
                className="mt-4 font-semibold tracking-tight leading-[1.05] text-[clamp(28px,6.2vw,56px)]"
              >
                Premium tech.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/35">
                  Built for Nepal.
                </span>
                <br />
                Tune Into Zen
              </motion.h1>

              <motion.p variants={child} className="mt-4 max-w-[62ch] text-white/85 text-sm sm:text-base">
                Earbuds and wearables with flagship features — long battery life, clear calls, rich sound — backed by friendly local support.
              </motion.p>

              <motion.div variants={child} className="mt-7 flex flex-wrap items-center justify-center gap-2">
                <Link href="/shop" className="rounded-md px-4 py-2 text-sm font-medium text-black" style={{ background: ACCENT }}>
                  Shop now
                </Link>
                <Link href="/contact" className="rounded-md border border-white/20 px-4 py-2 text-sm">
                  Talk to us
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* ===== FACTS ===== */}
        <section className="mx-auto w-full max-w-[1100px]" aria-label="Key facts">
          <motion.div
            variants={container(0.05, prefersReduced ? 0 : 0.05)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {[
              { k: "Founded", v: "2023" },
              { k: "Focus", v: "Smart Wearables" },
              { k: "HQ", v: "Kathmandu" },
              { k: "Warranty", v: "Hassle-free" },
            ].map((s) => (
              <motion.div
                key={s.k}
                variants={child}
                whileHover={{ y: -4 }}
                className="rounded-xl border bg-white p-4 text-center"
              >
                <div className="text-xs text-muted-foreground">{s.k}</div>
                <div className="text-lg sm:text-2xl font-semibold">{s.v}</div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ===== AS SEEN IN (no-shrink logos) ===== */}
        <motion.section
          variants={fade(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          className="mx-auto w-full max-w-[1200px] rounded-[22px] border p-4 sm:p-6 overflow-hidden"
          aria-label="As seen in"
        >
          <div className="text-xs uppercase tracking-wide text-muted-foreground px-1">As seen in</div>

          <div className="mt-3 relative">
            <div className="flex w-max gap-8 sm:gap-10 whitespace-nowrap [will-change:transform] animate-marquee px-1">
              {PRESS_LOGOS.concat(PRESS_LOGOS).map((logo, i) => (
                <motion.a
                  key={`${logo.alt}-${i}`}
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={logo.alt}
                  whileHover={{ scale: 1.05, opacity: 1 }}
                  className="inline-flex items-center justify-center shrink-0 min-w-[96px] sm:min-w-[112px] md:min-w-[128px] px-2"
                >
                  <SafeImg src={logo.src} alt={logo.alt} className="block h-8 sm:h-9 w-auto object-contain opacity-90" />
                </motion.a>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ===== PILLARS ===== */}
        <section className="mx-auto w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard icon={<Mic2 className="h-5 w-5" />} title="Clear calls" desc="ENC + tuned mics for street-smart clarity." />
          <GlassCard icon={<Battery className="h-5 w-5" />} title="Real battery" desc="Optimized power, honest endurance." />
          <GlassCard icon={<Waves className="h-5 w-5" />} title="Rich sound" desc="Balanced tuning for music, movies & games." />
        </section>

        {/* ===== DESIGN STRIP ===== */}
        <section className="mx-auto w-full max-w-[1200px] rounded-[22px] border overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <motion.div
              variants={fade(0.02)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.35 }}
              className="lg:col-span-7 p-6 sm:p-10"
            >
              <h2 className="text-xl sm:text-2xl font-semibold">Design that serves life</h2>
              <p className="mt-2 text-sm/6 text-muted-foreground">
                Lightweight fits, pocketable cases, and displays you can read in sunlight — built for real days, not just spec sheets.
              </p>
              <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <li className="rounded-lg border p-3">• Snappy pairing & stable connection</li>
                <li className="rounded-lg border p-3">• Tap controls that actually feel good</li>
                <li className="rounded-lg border p-3">• IP ratings for everyday durability</li>
                <li className="rounded-lg border p-3">• Friendly local support</li>
              </ul>
              <div className="mt-6">
                <Link href="/support" className="inline-flex items-center gap-2 underline underline-offset-4">
                  Read our support articles <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
            <motion.div
              variants={fade(0.12)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.35 }}
              className="lg:col-span-5 bg-neutral-100 min-h-64 grid place-items-center text-xs text-neutral-500"
            >
              Add a product montage / still
            </motion.div>
          </div>
        </section>

        {/* ===== TEAM ===== */}
        <section id="team" className="mx-auto w-full max-w-[1200px] rounded-[22px] border p-6 sm:p-8">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-semibold">Our Team</h2>
            <p className="text-sm text-muted-foreground">People who obsess over the details — from sound to support.</p>
          </div>

          <motion.div
            variants={container(0.02, prefersReduced ? 0 : 0.05)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {TEAM.map((m, idx) => (
              <motion.article
                key={m.name}
                variants={child}
                whileHover={{ y: -6 }}
                className="group rounded-xl border bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <SafeImg
                    src={m.photo}
                    alt={`${m.name} — ${m.role}`}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-offset-2"
                  />
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{m.name}</h3>
                    <div className="text-xs text-muted-foreground">{m.role}</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Building premium feel at honest prices — iterating fast with community feedback.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {m.ig ? (
                    <a href={m.ig} target="_blank" rel="noopener noreferrer" className="rounded-md border px-2 py-1 hover:bg-muted">
                      Instagram
                    </a>
                  ) : null}
                  {m.li ? (
                    <a href={m.li} target="_blank" rel="noopener noreferrer" className="rounded-md border px-2 py-1 hover:bg-muted">
                      LinkedIn
                    </a>
                  ) : null}
                </div>
              </motion.article>
            ))}
          </motion.div>
        </section>

        {/* ===== MILESTONES ===== */}
        <section className="mx-auto w-full max-w-[1200px] rounded-[22px] border p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-semibold">Milestones</h2>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <div className="w-56 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className="h-full"
                  style={{ background: ACCENT, width: `${Math.round(progress * 100)}%`, transition: "width 200ms linear" }}
                />
              </div>
            </div>
          </div>
          <div
            ref={scrollerRef}
            className="mt-5 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar"
            style={{
              WebkitMaskImage: "linear-gradient(90deg, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
              maskImage: "linear-gradient(90deg, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
            }}
          >
            {[
              { d: "Jul 2023", t: "Kick Lifestyle launches", b: "A Nepali brand with global ambition." },
              { d: "Late 2023", t: "ANC for everyone", b: "Active Noise Cancellation hits value tiers." },
              { d: "Feb 2024", t: "AMOLED smartwatches", b: "Premium displays, honest prices." },
              { d: "Jul 2024", t: "Display-case earbuds", b: "New interactions on the case." },
              { d: "2025", t: "Nationwide growth", b: "More partners. Bigger community." },
            ].map((m, i) => (
              <motion.article
                key={i}
                variants={fade(0.03 * i)}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.45 }}
                className="snap-center shrink-0 w-[86%] sm:w-[60%] md:w-[48%] lg:w-[38%] rounded-xl border bg-white"
              >
                <div className="p-4 sm:p-5">
                  <div className="text-xs text-muted-foreground">{m.d}</div>
                  <h3 className="mt-1 text-lg font-semibold">{m.t}</h3>
                  <div className="mt-3 h-32 rounded-md bg-neutral-100 grid place-items-center text-xs text-neutral-500">
                    Add image / video
                  </div>
                  <p className="mt-3 text-sm/6 text-muted-foreground">{m.b}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ===== IMPACT ===== */}
        <motion.section
          variants={fade(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          className="mx-auto w-full max-w-[1200px] rounded-[22px] border bg-neutral-50 p-6 sm:p-8"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <Metric k="Orders Served" v="5k+" />
            <Metric k="Avg. Rating" v="4.7★" />
            <Metric k="Service TAT" v="<48h" />
            <Metric k="Retail Partners" v="50+" />
          </div>
        </motion.section>

        {/* ===== FAQ ===== */}
        <motion.section
          variants={fade(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mx-auto w-full max-w-[1200px] rounded-[22px] border p-6 sm:p-8"
        >
          <h2 className="text-xl sm:text-2xl font-semibold">FAQs</h2>
          <div className="mt-4 space-y-4">
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">Where is Kick Lifestyle based?</summary>
              <p className="mt-2 text-sm text-muted-foreground">Kathmandu, Nepal. We serve customers nationwide via our online store and partners.</p>
            </details>
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">What products do you build?</summary>
              <p className="mt-2 text-sm text-muted-foreground">True wireless earbuds, smartwatches, and accessories — feature-packed at honest prices.</p>
            </details>
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">How do I contact support?</summary>
              <p className="mt-2 text-sm text-muted-foreground">Email support or call during business hours (Sun–Fri, 10am–6pm).</p>
            </details>
          </div>
        </motion.section>

        {/* ===== CTA ===== */}
        <motion.section
          variants={fade(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          className="mx-auto w-full max-w-[1200px] rounded-[28px] border bg-neutral-950 text-white p-8 sm:p-12 text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Ready to tune into Zen?</h2>
          <p className="mt-2 text-white/80">Explore earbuds and wearables built for Nepal — premium feel, honest pricing.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/shop" className="rounded-md px-4 py-2 text-sm font-medium text-black" style={{ background: ACCENT }}>
              Shop now
            </Link>
            <Link href="/corporate-orders" className="rounded-md border border-white/20 px-4 py-2 text-sm">
              Corporate / Bulk
            </Link>
          </div>
        </motion.section>
      </motion.main>

      {/* ONE global styled-jsx block (defines marquee/radar + no-scrollbar) */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        .animate-marquee { animation: marquee 26s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee { animation: none; }
        }

        @keyframes radar-spin { to { transform: rotate(360deg) } }
        .animate-radar-spin { animation: radar-spin 12s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-radar-spin { animation: none; }
        }
      `}</style>
    </>
  );
}

/* ===== small UI bits ===== */
function GlassCard({ icon, title, desc }) {
  return (
    <motion.article
      variants={rise(0.02)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      whileHover={{ y: -6, transition: { type: "spring", stiffness: 260, damping: 20 } }}
      className="rounded-2xl border bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/55 p-5"
    >
      <div className="flex items-center gap-2 text-base font-semibold">
        <span className="grid place-items-center h-8 w-8 rounded-lg bg-black/5">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </motion.article>
  );
}
function Metric({ k, v }) {
  return (
    <motion.div
      variants={child}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      className="rounded-lg border bg-white p-4"
    >
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="text-lg sm:text-2xl font-semibold">{v}</div>
    </motion.div>
  );
}
