"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";

const DEFAULT_TAGS = [
  "#KickLifestyle",
  "#KickEveryday",
  "#MoveFree",
  "#SoundOn",
  "#StayPowered",
  "#GoWireless",
];

export default function KickLifestyleTicker({
  tags = DEFAULT_TAGS,
  speed = 18,       // seconds per full cycle (lower = faster)
  className = "",
}) {
  const rowRef = useRef(null);
  const [rowW, setRowW] = useState(0);

  // re-measure when fonts/layout change
  useEffect(() => {
    if (!rowRef.current) return;
    const ro = new ResizeObserver(() => setRowW(rowRef.current.offsetWidth || 0));
    ro.observe(rowRef.current);
    setRowW(rowRef.current.offsetWidth || 0);
    return () => ro.disconnect();
  }, [tags]);

  // build one row of tags (duplicated below for seamless loop)
  const Row = useMemo(
    () => (
      <ul
        ref={rowRef}
        className="flex items-baseline whitespace-nowrap gap-[clamp(16px,4vw,40px)] pr-[clamp(16px,4vw,40px)] w-max leading-none"
      >
        {tags.map((t, i) => (
          <li
            key={`${t}-${i}`}
            className={[
              "font-extrabold",
              "text-[clamp(28px,6vw,56px)]",
              i % 3 === 0
                ? "text-white"
                : i % 3 === 1
                ? "text-gray-600"
                : "text-[#fcba17]",
            ].join(" ")}
          >
            {t}
          </li>
        ))}
      </ul>
    ),
    [tags]
  );

  return (
    <div className={["select-none py-6", className].join(" ")}>
      <div className="overflow-hidden">
        {/* track (two identical rows) */}
        <div
          className="flex will-change-transform"
          style={{
            // translate exactly the width of one row; prevents overlap
            animation: rowW
              ? `kickTicker ${speed}s linear infinite`
              : "none",
            // expose width to keyframes
            "--kick-w": `${rowW}px`,
          }}
        >
          {Row}
          {/* second copy for seamless loop */}
          <ul
            aria-hidden="true"
            className="flex items-baseline whitespace-nowrap gap-[clamp(16px,4vw,40px)] pr-[clamp(16px,4vw,40px)] w-max leading-none"
          >
            {tags.map((t, i) => (
              <li
                key={`dup-${t}-${i}`}
                className={[
                  "font-extrabold",
                  "text-[clamp(28px,6vw,56px)]",
                  i % 3 === 0
                    ? "text-white"
                    : i % 3 === 1
                    ? "text-gray-600"
                    : "text-[#fcba17]",
                ].join(" ")}
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style jsx>{`
        @keyframes kickTicker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-1 * var(--kick-w))); }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*="kickTicker"] { animation: none !important; transform: none !important; }
        }
      `}</style>
    </div>
  );
}
