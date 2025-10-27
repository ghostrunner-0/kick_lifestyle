// app/(root)/(website)/about/AboutClient.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  animate,
} from "framer-motion";
import { Battery, Mic2, Waves, ChevronRight } from "lucide-react";

const ACCENT = "#fcba17";

/* -------------------- Motion helpers -------------------- */
const container = (delay = 0, stagger = 0.06) => ({
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      delay,
      duration: 0.5,
      ease: "easeOut",
      when: "beforeChildren",
      staggerChildren: stagger,
    },
  },
});
const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};
const fade = (d = 0) => ({
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut", delay: d },
  },
});
const rise = (d = 0) => ({
  hidden: { opacity: 0, y: 22, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: "easeOut", delay: d },
  },
});

/* extra page-wide motion */
const sectionReveal = (d = 0) => ({
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: d, duration: 0.6, ease: [0.22, 0.9, 0.3, 1] },
  },
});
const floatY = {
  initial: { y: 0 },
  animate: { y: [0, -6, 0] },
  transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
};
const tiltHover = {
  whileHover: {
    y: -6,
    rotateX: 2,
    rotateY: -2,
    transition: { type: "spring", stiffness: 220, damping: 18 },
  },
  whileTap: { scale: 0.98 },
};

/* marquee logo motion */
const logoContainer = (delay = 0) => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { delay, staggerChildren: 0.06, when: "beforeChildren" },
  },
});
const logoItem = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

/* -------------------- Safe <img> with visible fallback -------------------- */
function SafeImg({ src, alt, className }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <div
        className={`grid place-items-center rounded bg-neutral-100 text-neutral-500 ${
          className || ""
        }`}
        style={{ minWidth: 96 }}
        aria-label={alt || "logo"}
        title={alt || ""}
      >
        <span className="px-2 text-[10px] leading-none truncate max-w-[110px]">
          {alt || "image"}
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || ""}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

/* -------------------- Press logos (site-wide) -------------------- */
export const PRESS_LOGOS = [
  {
    src: "/art/kathmandu-post.jpeg",
    alt: "The Kathmandu Post",
    href: "https://kathmandupost.com/",
  },
  { src: "/art/ict.png", alt: "ICT Frame", href: "https://ictframe.com/" },
  { src: "/art/techlekh.png", alt: "TechLekh", href: "https://techlekh.com/" },
  {
    src: "/art/onlinekhabar.png",
    alt: "OnlineKhabar",
    href: "https://www.onlinekhabar.com/",
  },
  {
    src: "/art/gadgetbyte.png",
    alt: "Gadgetbyte",
    href: "https://www.gadgetbytenepal.com/",
  },
  {
    src: "/art/myrepublica.jpg",
    alt: "MyRepublica",
    href: "https://myrepublica.nagariknetwork.com/",
  },
  {
    src: "/art/himalayan-times.jpg",
    alt: "The Himalayan Times",
    href: "https://thehimalayantimes.com/",
  },
  {
    src: "/art/nepali-times.jpg",
    alt: "Nepali Times",
    href: "https://nepalitimes.com/",
  },
  { src: "/art/setopati.png", alt: "Setopati", href: "https://setopati.com/" },
  { src: "/art/ratopati.webp", alt: "Ratopati", href: "https://ratopati.com/" },
  { src: "/art/bizmandu.png", alt: "Bizmandu", href: "https://bizmandu.com/" },
  {
    src: "/art/techsathi.png",
    alt: "TechSathi",
    href: "https://techsathi.com/",
  },
  {
    src: "/art/gadgets-in-nepal.png",
    alt: "Gadgets In Nepal",
    href: "https://www.gadgetsinnepal.com.np/",
  },
  {
    src: "/art/techsansar.jpg",
    alt: "TechSansar",
    href: "https://www.techsansar.com/",
  },
  {
    src: "/art/ekantipur.png",
    alt: "ekantipur",
    href: "https://ekantipur.com/",
  },
  {
    src: "/art/annapurna-post.png",
    alt: "Annapurna Post",
    href: "https://annapurnapost.com/",
  },
];

/* -------------------- Kumod-only mentions -------------------- */
export const ABOUT_KUMOD = [
  { src: "/art/techlekh.png", alt: "TechLekh", href: "#", tag: "Interview" },
  {
    src: "/art/gadgetbyte.png",
    alt: "Gadgetbyte",
    href: "#",
    tag: "Founder Story",
  },
  { src: "/art/bizmandu.png", alt: "Bizmandu", href: "#", tag: "Feature" },
  {
    src: "/art/onlinekhabar.png",
    alt: "OnlineKhabar",
    href: "#",
    tag: "Opinion",
  },
  {
    src: "/art/kathmandu-post.jpeg",
    alt: "The Kathmandu Post",
    href: "#",
    tag: "Profile",
  },
  {
    src: "/art/nepali-times.jpg",
    alt: "Nepali Times",
    href: "#",
    tag: "Spotlight",
  },
];

/* -------------------- Founder profile data -------------------- */
const FOUNDER = {
  name: "Kumod Begwani",
  role: "Founder & CEO, Kick Lifestyle",
  photo: "/art/kumod.jpeg", // update with your real path
  bio: [
    "Kumod Begwani is a Nepali entrepreneur building premium-yet-accessible tech for the local market. Under his leadership, Kick Lifestyle blends honest engineering with refined design, focusing on the details that shape daily use: real battery life, clear calls, and durable builds.",
    "From launching category-leading earbuds and wearables to standing up reliable after-sales support, Kumod’s approach is straightforward: ship products that feel premium, perform consistently, and respect the customer’s time.",
    "He’s equally hands-on in product, brand, and community—driving launches, supporting creators, and growing a service network that actually answers. Kick Lifestyle exists to prove that a homegrown Nepali brand can meet global standards while understanding local needs better than anyone else.",
  ],
};

/* -------------------- Milestones (with url) -------------------- */
const MILESTONES = [
  {
    d: "Jul 2023",
    t: "Kick Lifestyle launches",
    b: "A Nepali brand with global ambition.",
    url: "#",
  },
  {
    d: "Late 2023",
    t: "ANC for everyone",
    b: "Active Noise Cancellation hits value tiers.",
    url: "#",
  },
  {
    d: "Feb 2024",
    t: "AMOLED smartwatches",
    b: "Premium displays, honest prices.",
    url: "#",
  },
  {
    d: "Jul 2024",
    t: "Display-case earbuds",
    b: "New interactions on the case.",
    url: "#",
  },
  {
    d: "2025",
    t: "Nationwide growth",
    b: "More partners. Bigger community.",
    url: "#",
  },
];

/* -------------------- Milestones Carousel (FM spring + drag) -------------------- */
function MilestonesCarousel({ items }) {
  const prefersReduced = useReducedMotion();

  const getIPV = () => {
    if (typeof window === "undefined") return 1;
    const w = window.innerWidth;
    if (w <= 640) return 1;
    if (w <= 1024) return 2;
    return 3;
  };

  const [perView, setPerView] = useState(getIPV());
  const [page, setPage] = useState(0);
  const viewportRef = useRef(null);
  const [vw, setVw] = useState(0);

  // measure viewport width & update perView on resize
  useEffect(() => {
    const onResize = () => {
      setPerView(getIPV());
      const el = viewportRef.current;
      if (el) setVw(el.clientWidth);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // chunk into pages
  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < items.length; i += perView)
      out.push(items.slice(i, i + perView));
    setPage((p) => Math.min(p, Math.max(0, out.length - 1)));
    return out;
  }, [items, perView]);

  const pageCount = pages.length;
  const clamp = (i) => Math.max(0, Math.min(pageCount - 1, i));
  const next = () => setPage((p) => clamp(p + 1));
  const prev = () => setPage((p) => clamp(p - 1));
  const goTo = (i) => setPage(clamp(i));

  // animated x using motionValue
  const x = useMotionValue(0);

  // animate to current page
  useEffect(() => {
    const target = -page * vw;
    const controls = animate(x, target, {
      type: "spring",
      stiffness: 260,
      damping: 28,
    });
    return controls.stop;
  }, [page, vw, x]);

  // autoplay
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (prefersReduced || hover || pageCount <= 1) return;
    const id = setInterval(
      () => setPage((p) => (p + 1 < pageCount ? p + 1 : 0)),
      4500
    );
    return () => clearInterval(id);
  }, [prefersReduced, hover, pageCount]);

  // drag end: decide snap
  const onDragEnd = (_, info) => {
    const offset = info.offset.x; // negative when dragging left
    const velocity = info.velocity.x;
    const threshold = vw * 0.15;
    if (offset < -threshold || velocity < -400) next();
    else if (offset > threshold || velocity > 400) prev();
    else {
      // snap back to current
      const controls = animate(x, -page * vw, {
        type: "spring",
        stiffness: 260,
        damping: 28,
      });
      controls.stop; // noop
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl sm:text-2xl font-semibold">Milestones</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {String(page + 1).padStart(2, "0")} /{" "}
            {String(pageCount).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
              disabled={page === 0}
              aria-label="Previous"
            >
              Prev
            </button>
            <button
              onClick={next}
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
              disabled={page === pageCount - 1}
              aria-label="Next"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* viewport */}
      <div
        ref={viewportRef}
        className="mt-5 overflow-hidden rounded-xl border bg-white"
      >
        {/* track (each page width = viewport width) */}
        <motion.div
          className="flex touch-pan-y select-none"
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -((pageCount - 1) * vw), right: 0 }}
          dragElastic={0.08}
          onDragEnd={onDragEnd}
          role="region"
          aria-roledescription="carousel"
          aria-label="Product milestones"
        >
          {pages.map((group, gi) => (
            <div
              key={gi}
              style={{ width: vw || "100%" }}
              className="shrink-0 px-2 py-4 sm:p-5"
            >
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns:
                    perView === 1
                      ? "1fr"
                      : perView === 2
                      ? "1fr 1fr"
                      : "1fr 1fr 1fr",
                }}
              >
                {group.map((m, i) => {
                  const href = m.url || "#";
                  const isExternal = /^https?:\/\//i.test(href);
                  const CardInner = (
                    <motion.div
                      {...tiltHover}
                      className="rounded-xl border bg-white h-full"
                      whileInView={{ opacity: [0, 1], y: [8, 0] }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    >
                      <div className="p-4 sm:p-5 h-full flex flex-col">
                        <div className="text-xs text-muted-foreground">
                          {m.d}
                        </div>
                        <h3 className="mt-1 text-lg font-semibold">{m.t}</h3>
                        <div className="mt-3 h-32 rounded-md bg-neutral-100 grid place-items-center text-xs text-neutral-500">
                          Add image / video
                        </div>
                        <p className="mt-3 text-sm/6 text-muted-foreground">
                          {m.b}
                        </p>
                      </div>
                    </motion.div>
                  );
                  return isExternal ? (
                    <a
                      key={`${gi}-${i}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {CardInner}
                    </a>
                  ) : (
                    <Link key={`${gi}-${i}`} href={href} className="block">
                      {CardInner}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* dots (per page) */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {Array.from({ length: pageCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to page ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === page ? "w-6 bg-neutral-900" : "w-2.5 bg-neutral-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------- Page -------------------- */
export default function AboutClient() {
  const prefersReduced = useReducedMotion();

  /* sticky-header offset for anchor scroll */
  const [headerOffset, setHeaderOffset] = useState(96);
  useEffect(() => {
    const measure = () => {
      const h =
        document.querySelector("header[data-site-header]") ||
        document.querySelector("header");
      if (h)
        setHeaderOffset(
          Math.max(
            64,
            Math.min(160, Math.round(h.getBoundingClientRect().height))
          )
        );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const scrollMargin = headerOffset + 18;

  return (
    <>
      <motion.main
        initial="hidden"
        animate="show"
        variants={container(0.05, prefersReduced ? 0 : 0.06)}
        className="mx-auto w-full max-w-[1400px] [padding-inline:clamp(1rem,5vw,5rem)] pb-20 pt-8 sm:pt-12 space-y-16"
      >
        {/* ===== HERO ===== */}
        <section
          id="hero"
          className="mx-auto w-full max-w-[1200px]"
          style={{ scrollMarginTop: scrollMargin }}
        >
          <motion.div
            variants={fade(0)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            className="relative overflow-hidden rounded-[28px] border bg-neutral-950 text-white px-6 py-12 sm:px-10 sm:py-16"
          >
            {/* Background visuals */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 grid place-items-center"
              {...floatY}
            >
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
            </motion.div>

            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
              aria-hidden
            >
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

            <div
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
              aria-hidden
            >
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

            <div
              aria-hidden
              className="absolute inset-0 z-20"
              style={{
                background:
                  "radial-gradient(70% 50% at 50% 45%, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 60%)",
              }}
            />

            {/* content */}
            <motion.div
              variants={container(0, prefersReduced ? 0 : 0.05)}
              className="relative z-30 flex flex-col items-center text-center"
            >
              <motion.span
                variants={child}
                className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs"
              >
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

              <motion.p
                variants={child}
                className="mt-4 max-w-[62ch] text-white/85 text-sm sm:text-base"
              >
                Earbuds and wearables with flagship features — long battery
                life, clear calls, rich sound — backed by friendly local
                support.
              </motion.p>

              <motion.div
                variants={child}
                className="mt-7 flex flex-wrap items-center justify-center gap-2"
              >
                <Link
                  href="/shop"
                  className="rounded-md px-4 py-2 text-sm font-medium text-black"
                  style={{ background: ACCENT }}
                >
                  Shop now
                </Link>
                <Link
                  href="/contact"
                  className="rounded-md border border-white/20 px-4 py-2 text-sm"
                >
                  Talk to us
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* ===== FACTS ===== */}
        <section
          className="mx-auto w-full max-w-[1100px]"
          aria-label="Key facts"
        >
          <motion.div
            variants={sectionReveal(0.05)}
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

        {/* ===== AS SEEN IN (robust) ===== */}
        <motion.section
          variants={fade(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          className="mx-auto w-full max-w-[1200px] rounded-[22px] border p-4 sm:p-6 overflow-hidden"
          aria-label="As seen in"
        >
          <div className="text-xs uppercase tracking-wide text-muted-foreground px-1">
            As seen in
          </div>

          <div className="mt-3 relative">
            {/* optional shimmer like About Kumod */}
            <div className="shine" aria-hidden />

            <div className="marquee">
              <div className="marquee__track">
                {[...PRESS_LOGOS, ...PRESS_LOGOS].map((logo, i) => (
                  <a
                    key={`${logo.alt}-${i}`}
                    href={logo.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={logo.alt}
                    className="logo-item"
                    title={logo.alt}
                  >
                    {/* your SafeImg is fine; keep its fallback */}
                    <SafeImg
                      src={logo.src}
                      alt={logo.alt}
                      className="logo-img"
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ===== PILLARS ===== */}
        <motion.section
          variants={sectionReveal(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          className="mx-auto w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <GlassCard
            icon={<Mic2 className="h-5 w-5" />}
            title="Clear calls"
            desc="ANC + tuned mics for street-smart clarity."
          />
          <GlassCard
            icon={<Battery className="h-5 w-5" />}
            title="Real battery"
            desc="Optimized power, honest endurance."
          />
          <GlassCard
            icon={<Waves className="h-5 w-5" />}
            title="Rich sound"
            desc="Balanced tuning for music, movies & games."
          />
        </motion.section>

        {/* ===== DESIGN STRIP ===== */}
        <motion.section
          variants={sectionReveal(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          className="mx-auto w-full max-w-[1200px] rounded-[22px] border overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <motion.div
              variants={fade(0.02)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.35 }}
              className="lg:col-span-7 p-6 sm:p-10"
            >
              <h2 className="text-xl sm:text-2xl font-semibold">
                Design that serves life
              </h2>
              <p className="mt-2 text-sm/6 text-muted-foreground">
                Lightweight fits, pocketable cases, and displays you can read in
                sunlight — built for real days, not just spec sheets.
              </p>
              <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <li className="rounded-lg border p-3">
                  • Snappy pairing & stable connection
                </li>
                <li className="rounded-lg border p-3">
                  • Tap controls that actually feel good
                </li>
                <li className="rounded-lg border p-3">
                  • IP ratings for everyday durability
                </li>
                <li className="rounded-lg border p-3">
                  • Friendly local support
                </li>
              </ul>
              <div className="mt-6">
                <Link
                  href="/support"
                  className="inline-flex items-center gap-2 underline underline-offset-4"
                >
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
        </motion.section>

        {/* ===== FOUNDER ===== */}
        <motion.section
          variants={sectionReveal(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          id="founder"
          className="mx-auto w-full max-w-[1200px] rounded-[22px] border p-6 sm:p-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Long text */}
            <div className="lg:col-span-7">
              <h2 className="text-xl sm:text-2xl font-semibold">Founder</h2>
              <div className="mt-2 text-sm text-muted-foreground">
                {FOUNDER.role}
              </div>
              <h3 className="mt-3 text-2xl sm:text-3xl font-semibold">
                {FOUNDER.name}
              </h3>

              <div className="mt-4 space-y-3 text-sm/6 text-muted-foreground">
                {FOUNDER.bio.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              {/* About Kumod Begwani marquee */}
              <div className="mt-6 rounded-xl border p-3 overflow-hidden relative">
                <motion.div
                  aria-hidden
                  initial={{ x: "-20%" }}
                  animate={{ x: "120%" }}
                  transition={{
                    repeat: Infinity,
                    duration: 5.2,
                    ease: "linear",
                  }}
                  className="pointer-events-none absolute inset-y-0 w-1/5 bg-gradient-to-r from-transparent via-neutral-200/25 to-transparent"
                />
                <div className="px-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    About Kumod Begwani
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Articles • Interviews • Mentions
                  </div>
                </div>

                <motion.div
                  variants={logoContainer(0.1)}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.4 }}
                  className="mt-2 relative"
                >
                  <div className="flex w-max gap-6 whitespace-nowrap animate-marquee px-1">
                    {ABOUT_KUMOD.concat(ABOUT_KUMOD).map((logo, i) => (
                      <motion.a
                        key={`about-kumod-${logo.alt}-${i}`}
                        href={logo.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${logo.alt}${
                          logo.tag ? ` — ${logo.tag}` : ""
                        }`}
                        variants={logoItem}
                        whileHover={{ scale: 1.06, opacity: 1 }}
                        className="inline-flex items-center justify-center shrink-0 min-w-[90px] sm:min-w-[108px] px-2 opacity-90 hover:opacity-100 transition"
                        title={logo.tag || ""}
                      >
                        <SafeImg
                          src={logo.src}
                          alt={logo.alt}
                          className="block h-7 sm:h-8 w-auto object-contain"
                        />
                      </motion.a>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Right: Image */}
            <motion.div className="lg:col-span-5" {...tiltHover}>
              <SafeImg
                src={FOUNDER.photo}
                alt={`${FOUNDER.name} portrait`}
                className="w-full aspect-[4/5] object-cover rounded-2xl border bg-neutral-100"
              />
            </motion.div>
          </div>
        </motion.section>

        {/* ===== MILESTONES (FM spring + drag + urls) ===== */}
        <section className="mx-auto w-full max-w-[1200px] rounded-[22px] border p-6 sm:p-8">
          <MilestonesCarousel items={MILESTONES} />
        </section>

        {/* ===== IMPACT ===== */}
        <motion.section
          variants={sectionReveal(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          className="mx-auto w-full max-w-[1200px] rounded-[22px] border bg-neutral-50 p-6 sm:p-8"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <Metric k="Orders Served" v="500k+" />
            <Metric k="Avg. Rating" v="4.7★" />
            <Metric k="Service TAT" v="<48h" />
            <Metric k="Retail Partners" v="50+" />
          </div>
        </motion.section>

        {/* ===== FAQ ===== */}
        <motion.section
          variants={sectionReveal(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mx-auto w-full max-w-[1200px] rounded-[22px] border p-6 sm:p-8"
        >
          <h2 className="text-xl sm:text-2xl font-semibold">FAQs</h2>
          <div className="mt-4 space-y-4">
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">
                Where is Kick Lifestyle based?
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">
                Kathmandu, Nepal. We serve customers nationwide via our online
                store and partners.
              </p>
            </details>
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">
                What products do you build?
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">
                True wireless earbuds, smartwatches, and accessories —
                feature-packed at honest prices.
              </p>
            </details>
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">
                How do I contact support?
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">
                Email support or call during business hours (Sun–Fri, 10am–6pm).
              </p>
            </details>
          </div>
        </motion.section>

        {/* ===== CTA ===== */}
        <motion.section
          variants={sectionReveal(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          className="mx-auto w-full max-w-[1200px] rounded-[28px] border bg-neutral-950 text-white p-8 sm:p-12 text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Ready to tune into Zen?
          </h2>
          <p className="mt-2 text-white/80">
            Explore earbuds and wearables built for Nepal — premium feel, honest
            pricing.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/shop"
              className="rounded-md px-4 py-2 text-sm font-medium text-black"
              style={{ background: ACCENT }}
            >
              Shop now
            </Link>
            <Link
              href="/corporate-orders"
              className="rounded-md border border-white/20 px-4 py-2 text-sm"
            >
              Corporate / Bulk
            </Link>
          </div>
        </motion.section>
      </motion.main>

      {/* global styles (marquee + radar + no-scrollbar) */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 26s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none;
          }
        }

        @keyframes radar-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .animate-radar-spin {
          animation: radar-spin 12s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-radar-spin {
            animation: none;
          }
        }
        /* ======== Marquee (shared with About Kumod) ======== */
        .marquee {
          position: relative;
          overflow: hidden;
          --gap: 2.5rem; /* space between logos */
          --duration: 26s; /* speed, tweak as needed */
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0,
            black 28px,
            black calc(100% - 28px),
            transparent 100%
          );
          mask-image: linear-gradient(
            to right,
            transparent 0,
            black 28px,
            black calc(100% - 28px),
            transparent 100%
          );
        }

        .marquee__track {
          display: inline-flex;
          gap: var(--gap);
          white-space: nowrap;
          will-change: transform;
          animation: marqueeSlide var(--duration) linear infinite;
          padding-inline: 0.25rem; /* slight breathing */
          align-items: center;
          min-height: 3rem; /* keep row visible even if images fail */
        }

        @keyframes marqueeSlide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          } /* assumes content is duplicated */
        }

        .marquee .logo-item {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 96px; /* 112 / 128 on larger screens via responsive utilities */
          padding-inline: 0.5rem;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .marquee .logo-img {
          display: block;
          height: 2rem; /* 8 (tailwind h-8) */
          width: auto;
          object-fit: contain;
          opacity: 0.9;
        }

        @media (min-width: 640px) {
          .marquee .logo-item {
            min-width: 112px;
          }
          .marquee .logo-img {
            height: 2.25rem;
          } /* ~h-9 */
        }

        @media (prefers-reduced-motion: reduce) {
          .marquee__track {
            animation: none;
          }
        }

        /* Optional shimmering sweep like About Kumod */
        .marquee .shine {
          pointer-events: none;
          position: absolute;
          inset: 0 auto 0 0;
          width: 20%;
          background: linear-gradient(
            90deg,
            rgba(0, 0, 0, 0) 0%,
            rgba(200, 200, 200, 0.2) 50%,
            rgba(0, 0, 0, 0) 100%
          );
          transform: translateX(-120%);
          animation: shineSweep 5.2s linear infinite;
        }

        @keyframes shineSweep {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(520%);
          }
        }
      `}</style>
    </>
  );
}

/* -------------------- Small UI bits -------------------- */
function GlassCard({ icon, title, desc }) {
  return (
    <motion.article
      variants={rise(0.02)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      {...tiltHover}
      className="rounded-2xl border bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/55 p-5"
    >
      <div className="flex items-center gap-2 text-base font-semibold">
        <span className="grid place-items-center h-8 w-8 rounded-lg bg-black/5">
          {icon}
        </span>
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
