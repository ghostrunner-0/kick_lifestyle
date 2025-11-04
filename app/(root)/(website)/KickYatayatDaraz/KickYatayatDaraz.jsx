// components/KickYatayatDarazLight.jsx
"use client";

import Image from "next/image";
import {
  ShoppingBag,
  Instagram,
  Ticket,
  Bus,
  ShieldCheck,
  Trophy,
  Coins,
  AlarmClock,
  CircleHelp,
  Copy,
  Share2,
} from "lucide-react";
import { useCallback, useMemo, useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";

/* -------------------- ANIMATIONS -------------------- */
const fadeUp = (d = 0) => ({
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut", delay: d },
  },
});
const pop = (d = 0) => ({
  hidden: { opacity: 0, scale: 0.98 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: "easeOut", delay: d },
  },
});
const staggerWrap = (staggerChildren = 0.08, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

/* -------------------- FLOATING CENTER BAR (PORTAL) -------------------- */
function FloatingCenterBar({
  instagramTicketUrl,
  darazUrl,
  mobileOffset = 88, // px above your bottom navbar on mobile
  desktopOffset = 40, // px from bottom on md+
  zIndex = 100000,
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const bar = (
    <motion.div
      className="fixed left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 md:gap-4 bottom-[calc(env(safe-area-inset-bottom)+88px)] md:bottom-10 z-[100000]"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        // in case you pass custom offsets via props:
        bottom: undefined,
      }}
    >
      <div className="flex items-center justify-center gap-3 md:gap-4">
        {instagramTicketUrl && (
          <HoverFab
            side="left"
            href={instagramTicketUrl}
            ariaLabel="Get Ticket"
            icon={<Instagram className="h-5 w-5 md:h-6 md:w-6" />}
            label="Get Ticket"
            pillClass="bg-white/90 backdrop-blur-sm text-black shadow-lg border border-black/5"
            btnClass="bg-[#fcba17] text-black ring-1 ring-black/5 hover:brightness-110 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#fcba17]/60 focus-visible:ring-offset-white"
          />
        )}
        <HoverFab
          side="right"
          href={darazUrl}
          ariaLabel="Shop on Daraz"
          icon={
            <ShoppingBag className="h-5 w-5 md:h-6 md:w-6 text-[#fcba17]" />
          }
          label="Shop on Daraz"
          pillClass="bg-black/90 backdrop-blur-sm text-white shadow-lg border border-white/10"
          btnClass="bg-black text-white ring-1 ring-black/10 hover:bg-gray-900 active:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/50 focus-visible:ring-offset-white"
        />
      </div>
    </motion.div>
  );

  return createPortal(bar, document.body);
}

/** One FAB; md+ shows a hover text pill.
 *  side="left"  -> pill appears on the *left* of the icon
 *  side="right" -> pill appears on the *right* of the icon
 *  Pill is absolute so width never changes (bar stays centered).
 */
function HoverFab({
  side = "right",
  href,
  ariaLabel,
  icon,
  label,
  btnClass,
  pillClass,
}) {
  const pos =
    side === "left"
      ? "right-full -translate-x-2 group-hover:-translate-x-3 mr-2"
      : "left-full  translate-x-2 group-hover:translate-x-3  ml-2";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={[
        "group relative grid place-items-center h-12 w-12 md:h-14 md:w-14 rounded-full",
        // ✨ premium shadow
        "shadow-lg shadow-black/10 md:shadow-xl",
        "hover:shadow-2xl hover:shadow-black/20",
        // smoothen
        "transition-transform transition-shadow duration-200",
        // keep your incoming styles
        btnClass,
      ].join(" ")}
    >
      {icon}
      <span
        className={[
          "pointer-events-none absolute top-1/2 hidden md:inline-flex -translate-y-1/2",
          pos,
          // pill styling comes from props, we just ensure smooth anim
          "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100",
          "whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold",
          "transition-all duration-200 ease-out",
          pillClass,
        ].join(" ")}
      >
        {label}
      </span>
    </a>
  );
}

/* -------------------- MAIN COMPONENT -------------------- */
export default function KickYatayatDarazLight({
  heroImage = "/images/kick-yatayat-hero.jpg",
  darazUrl = "#",
  instagramUrl = "https://www.instagram.com/kicklifestylenepal",
  instagramTicketUrl = "https://www.instagram.com/p/...", // replace
  products = [],
  offset = 96, // anchor scroll offset only
  shareCaption = "Boarding Kick Yatayat 🚍 My stop: ______ | #KickYatayat #KickLifestyle #Daraz1111",
  fabOffsetMobile = 88,
  fabOffsetDesktop = 40,
}) {
  const prefersReducedMotion = useReducedMotion();

  /* UTM-safe Daraz link */
  const trackedDarazUrl = useMemo(() => {
    try {
      const u = new URL(darazUrl, "https://example.com");
      if (!u.searchParams.has("utm_source"))
        u.searchParams.set("utm_source", "kick-site");
      if (!u.searchParams.has("utm_medium"))
        u.searchParams.set("utm_medium", "landing");
      if (!u.searchParams.has("utm_campaign"))
        u.searchParams.set("utm_campaign", "daraz-11-11-kick-yatayat");
      return darazUrl.includes("http") ? u.toString() : darazUrl;
    } catch {
      return darazUrl;
    }
  }, [darazUrl]);

  /* Share helpers */
  const [copied, setCopied] = useState(false);
  const copyCaption = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareCaption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      alert("Copy failed. Long-press and copy manually.");
    }
  }, [shareCaption]);

  const webShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Kick Yatayat Ticket 🎫",
          text: shareCaption,
          url: instagramTicketUrl || instagramUrl,
        });
      } else await copyCaption();
    } catch {}
  }, [shareCaption, instagramTicketUrl, instagramUrl, copyCaption]);

  /* Motion safety for prefers-reduced-motion users */
  const safeFade = prefersReducedMotion ? {} : fadeUp;
  const safePop = prefersReducedMotion ? {} : pop;
  const safeStagger = prefersReducedMotion
    ? () => ({ hidden: {}, show: {} })
    : staggerWrap;

  return (
    <main className="min-h-screen w-full bg-white text-neutral-900 scroll-smooth selection:bg-[#fcba17] selection:text-black">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        {/* soft background glows */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 -top-28 h-80 w-80 rounded-full bg-[#fcba17]/15 blur-3xl" />
          <div className="absolute -right-16 bottom-[-3rem] h-[22rem] w-[22rem] rounded-full bg-[#fcba17]/10 blur-3xl" />
          <div className="absolute inset-x-0 bottom-[-20%] h-[55%] bg-gradient-to-t from-[#fcba17]/8 to-transparent" />
        </div>

        <motion.div
          variants={safeStagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-16 grid lg:grid-cols-[1.02fr_1fr] items-center gap-10"
        >
          {/* LEFT COPY */}
          <motion.div variants={safeFade(0.06)}>
            <motion.div
              variants={safePop(0.04)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 backdrop-blur px-3 py-1 text-[11px] sm:text-xs text-gray-700 shadow"
            >
              <Bus className="h-3.5 w-3.5 text-[#fcba17]" />
              Kick Yatayat • Daraz 11.11
            </motion.div>

            <motion.h1
              variants={safeFade(0.1)}
              className="mt-3 text-[30px] sm:text-5xl font-extrabold leading-[1.12] tracking-tight"
            >
              Kick Yatayat this Daraz 11.11
              <span className="block text-[#fcba17]">
                Win Singapore–Malaysia Trip
              </span>
            </motion.h1>

            <motion.p
              variants={safeFade(0.14)}
              className="mt-3 text-base sm:text-lg text-gray-600"
            >
              Up to 70% OFF on Kick products • Special 11.11 fares • Daily
              silver coins
            </motion.p>

            <motion.div
              variants={safeStagger(0.06, 0.16)}
              className="mt-6 flex flex-wrap gap-3"
            >
              {instagramTicketUrl && (
                <motion.a
                  variants={safePop(0)}
                  href={instagramTicketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#fcba17] px-5 py-2.5 text-sm md:text-base font-semibold text-black shadow hover:brightness-110 active:brightness-95 transition"
                >
                  <Instagram className="h-4 w-4" />
                  Get Ticket
                </motion.a>
              )}
              <motion.a
                variants={safePop(0.02)}
                href="#how-to"
                className="inline-flex items-center gap-2 rounded-full border border-[#fcba17]/70 px-5 py-2.5 text-sm font-semibold text-[#fcba17] hover:bg-[#fcba17]/10 transition"
              >
                How to Participate
              </motion.a>
              <motion.a
                variants={safePop(0.04)}
                href="#offers"
                className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold hover:bg-gray-50 transition"
              >
                See Offers
              </motion.a>
            </motion.div>

            <motion.div variants={safeFade(0.18)} className="mt-8">
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px] sm:text-sm text-gray-700">
                {[
                  {
                    icon: ShieldCheck,
                    text: "Nepal’s favorite tech accessories",
                  },
                  { icon: ShieldCheck, text: "1-Year Warranty" },
                  { icon: Trophy, text: "100,000+ KickStars" },
                ].map(({ icon: Icon, text }, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-2 border border-gray-200 shadow-sm"
                  >
                    <Icon className="h-4 w-4 text-[#fcba17]" />
                    {text}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          {/* RIGHT POSTER */}
          <motion.div
            variants={safePop(0.12)}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[480px] md:max-w-[560px]">
              {/* gradient frame */}
              <div className="rounded-[26px] p-[2px] bg-[conic-gradient(from_140deg,rgba(252,186,23,0.85),rgba(252,186,23,0.25),transparent_70%)] shadow-[0_25px_60px_-30px_rgba(0,0,0,0.45)]">
                {/* transparent tilted ticket */}
                <div className="relative rounded-[24px] overflow-hidden border border-gray-200 bg-transparent">
                  <div className="relative aspect-[2/3] md:aspect-[4/5] rotate-[2deg]">
                    <Image
                      src={heroImage}
                      alt="Kick Yatayat Hero"
                      fill
                      priority
                      className="object-contain bg-transparent mix-blend-multiply select-none"
                      sizes="(max-width: 768px) 92vw, (max-width: 1200px) 50vw, 560px"
                    />
                  </div>
                </div>
              </div>

              {/* floating badges */}
              <div className="pointer-events-none absolute -left-3 -top-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur border border-black/5 px-3 py-1.5 text-xs font-semibold shadow">
                  <Ticket className="h-4 w-4 text-[#fcba17]" /> 11.11 Boarding
                </span>
              </div>
              <motion.div
                variants={safePop(0.18)}
                className="pointer-events-none absolute -right-3 -bottom-4"
              >
                <span className="inline-flex items-center rounded-full bg-[#fcba17] px-3 py-1.5 text-xs font-bold text-black shadow">
                  Up to 70% OFF
                </span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ================= WHAT IS IT ================= */}
      <motion.section
        className="bg-gray-50"
        variants={safeFade(0.05)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <motion.h2
            variants={safeFade(0.02)}
            className="text-2xl sm:text-3xl font-bold"
          >
            What is Kick Yatayat?
          </motion.h2>
          <motion.p
            variants={safeFade(0.05)}
            className="mt-2 text-gray-700 text-[15px] sm:text-base"
          >
            Kick Yatayat = Kick Lifestyle’s 11.11 festival ride on Daraz. Four{" "}
            <span className="text-[#fcba17] font-semibold">stops</span> — our
            top products — go on special fares during the sale, plus surprise
            drops and prizes.
          </motion.p>

          <motion.div
            variants={safeStagger(0.07, 0.05)}
            className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5 md:gap-5"
          >
            {[
              { label: "X2 Neo", desc: "Dual-mic ENC • 50H" },
              { label: "X Elite", desc: "Low latency • ANC" },
              { label: "Watch Ultra", desc: "BT calling • Big display" },
              { label: "S2 Master", desc: "Hybrid ANC • 13mm" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                variants={safePop(i * 0.05)}
                whileHover={
                  prefersReducedMotion
                    ? {}
                    : { y: -3, transition: { duration: 0.2 } }
                }
                className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition"
              >
                <div className="flex items-center gap-2 text-[#fcba17] font-semibold text-sm">
                  <Ticket className="h-4 w-4" /> Stop {i + 1}
                </div>
                <div className="mt-1 text-base font-semibold">{s.label}</div>
                <div className="text-xs text-gray-600">{s.desc}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ================= HOW TO WIN ================= */}
      <motion.section
        id="how-to"
        style={{ scrollMarginTop: offset }}
        variants={safeFade(0.05)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <motion.h2
            variants={safeFade(0.02)}
            className="text-2xl sm:text-3xl font-bold"
          >
            How to Win the Singapore–Malaysia Trip
          </motion.h2>

          <motion.div
            variants={safeStagger(0.08, 0.05)}
            className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            <Card title="1) Open the Ticket Post" icon={<Instagram />}>
              Tap{" "}
              <a
                href={instagramTicketUrl}
                className="text-[#fcba17] underline"
                target="_blank"
                rel="noreferrer"
              >
                this Instagram post
              </a>
              , take a screenshot of your stop (product).
            </Card>

            <Card title="2) Share to Story" icon={<Share2 />}>
              Share to Instagram Story with <b>#KickYatayat</b> and tag{" "}
              <a
                href={instagramUrl}
                className="text-[#fcba17] underline"
                target="_blank"
                rel="noreferrer"
              >
                @kicklifestylenepal
              </a>
              . Keep it public for 24 hours.
              <div className="mt-3 flex flex-wrap gap-2">
                <motion.button
                  whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                  onClick={copyCaption}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300/60 focus-visible:ring-offset-white"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied!" : "Copy Caption"}
                </motion.button>
                <motion.button
                  whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                  onClick={webShare}
                  className="inline-flex items-center gap-2 rounded-full bg-black text-white px-3 py-2 text-sm font-semibold hover:bg-gray-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/50 focus-visible:ring-offset-white"
                >
                  <Share2 className="h-4 w-4 text-[#fcba17]" />
                  Share
                </motion.button>
              </div>
            </Card>

            <Card title="3) Buy & Enter Draw" icon={<Trophy />}>
              Buy your chosen Kick product on Daraz during 11.11 (up to 70%
              OFF). All verified buyers enter the <b>Singapore–Malaysia Trip</b>{" "}
              draw. <Coins className="inline h-4 w-4 -mt-1" /> Daily silver coin
              winners too.
            </Card>
          </motion.div>
        </div>
      </motion.section>

      {/* ================= OFFERS (NO PRICES) ================= */}
      <motion.section
        id="offers"
        style={{ scrollMarginTop: offset }}
        variants={safeFade(0.05)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <motion.h2
            variants={safeFade(0.02)}
            className="text-2xl sm:text-3xl font-bold mb-5 md:mb-6"
          >
            Product Stops (Offers)
          </motion.h2>
          <motion.div
            variants={safeStagger(0.08, 0.05)}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                variants={safePop(i * 0.03)}
                whileHover={
                  prefersReducedMotion
                    ? {}
                    : { y: -3, transition: { duration: 0.25 } }
                }
                className="rounded-2xl overflow-hidden border border-gray-200 bg-white hover:shadow-md transition"
              >
                {/* IMAGE ON TOP */}
                {!!p.image && (
                  <motion.div
                    className="aspect-[1/1] relative rounded-t-2xl overflow-hidden border-b border-gray-100 bg-gray-50 shadow-inner"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  >
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      className="object-contain p-6 md:p-8"
                      sizes="(max-width:768px) 90vw, (max-width:1200px) 30vw, 25vw"
                    />
                  </motion.div>
                )}

                {/* TEXT BELOW IMAGE */}
                <div className="px-4 md:px-5 pt-4 md:pt-5">
                  <div className="inline-flex items-center gap-2 text-[#fcba17] font-semibold text-sm">
                    <Ticket className="h-4 w-4" /> Stop {p.stop}
                  </div>
                  <h3 className="mt-1 text-base md:text-lg font-semibold">
                    {p.name}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600">{p.spec}</p>
                </div>

                {/* CTA BUTTON */}
                <div className="px-4 md:px-5 pb-4 md:pb-5 pt-3 md:pt-4">
                  <motion.a
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    href={p.link || trackedDarazUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center w-full rounded-full bg-[#fcba17] px-4 py-2 font-semibold text-black shadow hover:brightness-110 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#fcba17]/60 focus-visible:ring-offset-white"
                  >
                    View on Daraz
                  </motion.a>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={safeFade(0.05)}
            className="mt-5 md:mt-6 flex items-center gap-2 text-gray-600 text-sm"
          >
            <AlarmClock className="h-4 w-4 text-[#fcba17]" />
            Prices activate during scheduled fare slots on Daraz.
          </motion.div>
        </div>
      </motion.section>

      {/* ================= FAQs ================= */}
      <motion.section
        className="bg-gray-50"
        variants={safeFade(0.05)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <motion.h2
            variants={safeFade(0.02)}
            className="text-2xl sm:text-3xl font-bold"
          >
            FAQs
          </motion.h2>
          <motion.div
            variants={safeStagger(0.08, 0.05)}
            className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            <Faq
              q="Do I need to tag you?"
              a={
                <>
                  Yes — include <b>#KickYatayat</b> and tag{" "}
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#fcba17] underline"
                  >
                    @kicklifestylenepal
                  </a>
                  . Keep your Story public for 24h.
                </>
              }
            />
            <Faq
              q="How is the trip winner chosen?"
              a="Random draw from verified Daraz orders (see T&Cs)."
            />
            <Faq
              q="When are winners announced?"
              a="Daily silver coin winners during the sale; grand trip winner after the sale ends."
            />
          </motion.div>
        </div>
      </motion.section>

      {/* ================= TERMS & CONDITIONS ================= */}
      <motion.section
        id="tnc"
        style={{ scrollMarginTop: offset }}
        variants={safeFade(0.05)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <motion.h2
            variants={safeFade(0.02)}
            className="text-2xl sm:text-3xl font-bold"
          >
            Terms & Conditions
          </motion.h2>

          <motion.ul
            variants={safeStagger(0.06, 0.05)}
            className="mt-4 space-y-2 text-gray-700 text-sm"
          >
            {[
              "Valid for Nepal residents only.",
              "Instagram Story must remain public for at least 24 hours.",
              "Purchase must be from Kick’s official Daraz store during 11.11 campaign dates.",
              "One entry per verified order; refunds cancel eligibility.",
              "Trip covers flights + hotel for 1. Additional details apply as per full T&Cs.",
            ].map((item, i) => (
              <motion.li
                key={i}
                variants={safeFade(i * 0.02)}
                className="flex items-start gap-2"
              >
                <CircleHelp className="mt-0.5 h-4 w-4 text-[#fcba17]" />
                <span>{item}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </motion.section>

      {/* ===== ONE FINAL BORDER ONLY ===== */}
      <div className="border-t border-gray-200" />

      {/* ===== CENTERED PORTAL FABs (side-aware labels) ===== */}
      <FloatingCenterBar
        instagramTicketUrl={instagramTicketUrl}
        darazUrl={trackedDarazUrl}
        mobileOffset={fabOffsetMobile}
        desktopOffset={fabOffsetDesktop}
        zIndex={100000}
      />
    </main>
  );
}

/* -------------------- HELPERS -------------------- */
function Card({ title, icon, children }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      variants={prefersReducedMotion ? {} : pop(0.1)}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition focus-within:shadow-md"
      whileHover={
        prefersReducedMotion ? {} : { y: -3, transition: { duration: 0.2 } }
      }
    >
      <div className="text-[#fcba17] font-semibold flex items-center gap-2 mb-1.5">
        {icon} <span>{title}</span>
      </div>
      <p className="text-gray-700 text-sm">{children}</p>
    </motion.div>
  );
}

function Faq({ q, a }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      variants={prefersReducedMotion ? {} : pop(0.05)}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition"
      whileHover={
        prefersReducedMotion ? {} : { y: -3, transition: { duration: 0.2 } }
      }
    >
      <div className="flex items-center gap-2 font-semibold">
        <CircleHelp className="h-5 w-5 text-[#fcba17]" /> <span>{q}</span>
      </div>
      <p className="mt-2 text-gray-700 text-sm">{a}</p>
    </motion.div>
  );
}
