"use client";

import React from "react";
import PropTypes from "prop-types";
import { motion, useReducedMotion } from "framer-motion";

function cn(...a) { return a.filter(Boolean).join(" "); }

export default function TitleCard(props) {
  const {
    title,
    subtitle,
    badge,
    actions,
    accent = "#fcba17",
    variant = "solid",
    pattern = "grid",
    align = "left",
    size = "md",
    imageUrl,
    rounded = "rounded-2xl",
    className,
    as: Tag = "section",
  } = props;

  const prefersReduced = useReducedMotion();

  const pad =
    ({ sm: "p-4 sm:p-6", md: "p-5 sm:p-8 lg:p-10", lg: "p-6 sm:p-10 lg:p-14" }[size]) ||
    "p-5 sm:p-8 lg:p-10";

  const desktopHeading =
    ({ sm: "sm:text-3xl", md: "sm:text-4xl", lg: "sm:text-5xl" }[size]) || "sm:text-4xl";

  const subtext =
    ({ sm: "text-sm", md: "text-sm/6", lg: "text-base/7" }[size]) || "text-sm/6";

  const isCenter = align === "center";

  const bgBase =
    variant === "glass"
      ? "border bg-white/10 dark:bg-neutral-900/20 backdrop-blur-md border-white/15 dark:border-white/10"
      : variant === "soft"
      ? "border bg-[color:rgb(0_0_0_/0.02)] dark:bg-white/[0.03] border-black/5 dark:border-white/10"
      : variant === "image"
      ? "border bg-neutral-950/80 dark:bg-black/80 border-white/10 overflow-hidden"
      : "border bg-gradient-to-b from-neutral-900 to-black text-white border-white/10";

  const patternLayer =
    pattern === "grid"
      ? {
          backgroundImage:
            "linear-gradient(to right, rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px, 24px 24px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.55))",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.55))",
        }
      : pattern === "dots"
      ? {
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.06) 1px, transparent 0)",
          backgroundSize: "16px 16px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6))",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6))",
        }
      : {};

  const imageStyle =
    variant === "image" && imageUrl
      ? {
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.6), rgba(0,0,0,.75)), url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : undefined;

  const container = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: "easeOut", when: "beforeChildren", staggerChildren: prefersReduced ? 0 : 0.06 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 12, scale: prefersReduced ? 1 : 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: "easeOut" } },
  };

  return (
    <Tag
      role="region"
      aria-label={typeof title === "string" ? title : "Title section"}
      className={cn("relative mx-auto", className)}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className={cn(
          // xs: centered & limited; ≥sm: fill parent width like before
          "relative mx-auto max-w-[92vw] sm:max-w-none sm:w-full overflow-hidden",
          pad,
          rounded,
          bgBase
        )}
        style={imageStyle}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-25 hidden sm:block"
          style={{ background: accent }}
        />
        {pattern !== "none" && (
          <div aria-hidden className="pointer-events-none absolute inset-0" style={patternLayer} />
        )}

        {/* Mobile center; ≥sm follow `align` */}
        <div className={cn("relative text-center", isCenter ? "sm:text-center" : "sm:text-left")}>
          {/* Badge: compact (no full width) */}
          {badge ? (
            <motion.div
              variants={item}
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1",
                "text-[11px] sm:text-xs",
                "whitespace-nowrap overflow-hidden text-ellipsis max-w-[90vw] sm:max-w-none",
                variant === "solid" || variant === "image"
                  ? "border-white/20 text-white/90"
                  : "border-black/10 dark:border-white/20 text-foreground/80"
              )}
              style={{
                backgroundColor:
                  variant === "solid" || variant === "image" ? "rgba(255,255,255,0.06)" : "transparent",
              }}
            >
              {typeof badge === "string" ? <span className="truncate">{badge}</span> : badge}
            </motion.div>
          ) : null}

          {/* Title: capitalized; 1 line on mobile, normal wrap on ≥sm */}
          <motion.h1
            variants={item}
            className={cn(
              "mt-2 font-semibold tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis capitalize",
              "text-[clamp(18px,8vw,28px)]",
              desktopHeading,
              "sm:whitespace-normal sm:overflow-visible sm:leading-tight",
              variant === "solid" || variant === "image" ? "text-white" : "text-foreground"
            )}
          >
            {title}
          </motion.h1>

          {subtitle ? (
            <motion.p
              variants={item}
              className={cn(
                "mt-2 max-w-[65ch] text-pretty mx-auto",
                subtext,
                variant === "solid" || variant === "image" ? "text-white/80" : "text-muted-foreground",
                isCenter ? "sm:mx-auto" : "sm:mx-0"
              )}
            >
              {subtitle}
            </motion.p>
          ) : null}

          {actions ? (
            <motion.div
              variants={item}
              className={cn(
                "mt-4 flex flex-wrap items-center gap-2 sm:gap-3 justify-center",
                isCenter ? "sm:justify-center" : "sm:justify-start"
              )}
            >
              {actions}
            </motion.div>
          ) : null}
        </div>

        {variant === "image" ? <div className="pointer-events-none absolute inset-0 -z-10 min-h-40 sm:min-h-0" /> : null}
      </motion.div>
    </Tag>
  );
}

TitleCard.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  badge: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  actions: PropTypes.node,
  accent: PropTypes.string,
  variant: PropTypes.oneOf(["solid", "soft", "glass", "image"]),
  pattern: PropTypes.oneOf(["none", "grid", "dots"]),
  align: PropTypes.oneOf(["left", "center"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  imageUrl: PropTypes.string,
  rounded: PropTypes.string,
  className: PropTypes.string,
  as: PropTypes.any,
};
