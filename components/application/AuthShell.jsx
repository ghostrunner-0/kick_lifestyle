"use client";

import React from "react";
import Image from "next/image";
import Logo from "@/public/assets/images/logo-black.png";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

/* Brand gold */
const GOLD = "#fcba17";

/* Desktop-only glow border card */
const GlowBorder = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="relative hidden sm:flex items-center justify-center"
  >
    <div className="relative rounded-3xl p-[1px] overflow-hidden">
      <div className="absolute inset-0 opacity-60 blur-xl bg-[conic-gradient(at_top_left,_#fcba17,_#ffd75e,_#fcba17)]" />
      <div className="relative rounded-3xl bg-white/90 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-white/10">
        {children}
      </div>
    </div>
  </motion.div>
);

/**
 * AuthShell
 * - Mobile: shows Logo at top + renders children (scrollable page)
 * - Desktop: renders a Glow animated Card (no logo)
 */
export default function AuthShell({ children }) {
  return (
    <div className="w-full">
      {/* Mobile: logo header + scrollable form */}
      <div className="sm:hidden flex flex-col min-h-screen">
        {/* Sticky logo */}
        <div className="flex items-center justify-center pt-10 pb-6">
          <Image
            src={Logo}
            alt="Kick Lifestyle"
            width={640}
            height={640}
            className="h-auto w-[170px]"
            priority
          />
        </div>
        {/* Form area scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-10">{children}</div>
      </div>

      {/* Desktop: glow card WITHOUT logo */}
      <GlowBorder>
        <Card className="border-0 shadow-2xl rounded-3xl max-w-[520px]">
          <CardContent className="px-6 sm:px-8 pt-8 pb-8">{children}</CardContent>
        </Card>
      </GlowBorder>
    </div>
  );
}
