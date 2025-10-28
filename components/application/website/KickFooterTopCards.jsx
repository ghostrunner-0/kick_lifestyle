"use client";

import { ShieldCheck, Truck } from "lucide-react";

export default function KickFooterTopCards({ className = "" }) {
  return (
    <section
      className={[
        "w-full select-none",
        "bg-gradient-to-b from-white/60 to-white/30 dark:from-neutral-900/60 dark:to-neutral-900/40 backdrop-blur-sm",
        "border-b border-border/40",
      ].join(" ")}
    >
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 2xl:px-16 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Card 1 - Warranty */}
          <div
            className="
              flex items-center gap-5 rounded-2xl border border-[#fcba17]/20 bg-white/80 dark:bg-neutral-950/50
              shadow-[0_4px_16px_rgba(252,186,23,0.08)]
              px-6 py-5 transition-all hover:shadow-[0_6px_22px_rgba(252,186,23,0.15)]
            "
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fcba17]/15 text-[#fcba17]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Brand Warranty Coverage
              </h3>
              <p className="text-sm text-muted-foreground">
                Authentic Kick products with warranty support across Nepal
              </p>
            </div>
          </div>

          {/* Card 2 - Delivery */}
          <div
            className="
              flex items-center gap-5 rounded-2xl border border-[#fcba17]/20 bg-white/80 dark:bg-neutral-950/50
              shadow-[0_4px_16px_rgba(252,186,23,0.08)]
              px-6 py-5 transition-all hover:shadow-[0_6px_22px_rgba(252,186,23,0.15)]
            "
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fcba17]/15 text-[#fcba17]">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                All-Nepal Delivery
              </h3>
              <p className="text-sm text-muted-foreground">
                Fast & reliable nationwide shipping with trusted partners
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
