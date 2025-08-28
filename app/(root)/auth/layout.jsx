"use client";

import React from "react";
import Image from "next/image";
import Logo from "@/public/assets/images/logo-white.png";

const GOLD = "#fcba17";

export default function Layout({ children }) {
  return (
  // parent fills screen; grid columns for xl+
  <div className="min-h-screen w-full grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] bg-white">
      {/* LEFT cover (xl+) */}
  <aside className="relative hidden xl:flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f12] via-[#141417] to-[#1a1b1f]" />
        <div
          className="absolute inset-0 opacity-[0.16] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, ${GOLD} 1px, transparent 1px),
              linear-gradient(to bottom, ${GOLD} 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(120% 120% at 50% 40%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-white/6 blur-2xl" />
          <div className="absolute -left-10 bottom-10 h-64 w-64 rounded-full bg-[#fcba17]/20 blur-3xl" />
        </div>
        <div className="relative z-10">
          <Image
            src={Logo}
            alt="Kick Lifestyle"
            width={2000}
            height={2000}
            className="h-auto w-[400px] 2xl:w-[520px] drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
            priority
          />
        </div>
        <div
          className="pointer-events-none absolute -bottom-16 left-1/2 -translate-x-1/2 h-[260px] w-[60%] rounded-[44px] blur-3xl opacity-30"
          style={{ background: `radial-gradient(60% 100% at 50% 0%, ${GOLD}, transparent)` }}
        />
      </aside>

  {/* RIGHT form column: fills viewport, scrolls on mobile, no scroll on desktop */}
  <main className="flex justify-center items-start xl:items-center min-h-screen overflow-y-auto xl:overflow-hidden">
        <div className="w-full max-w-[520px] px-4 sm:px-10 py-10">{children}</div>
      </main>
    </div>
  );
}
