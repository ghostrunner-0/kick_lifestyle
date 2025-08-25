// components/blog/ArticleHero.jsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

export default function ArticleHero({ cover, alt, title, publishedAt, readingTime }) {
  const prefersReduced = useReducedMotion();

  const hero = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut", staggerChildren: prefersReduced ? 0 : 0.06 },
    },
  };
  const item = { hidden: { opacity: 0, y: prefersReduced ? 0 : 10 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="relative">
      {cover ? (
        <motion.div
          initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mx-auto mb-8 aspect-[16/7] w-full max-w-6xl overflow-hidden rounded-2xl"
        >
          <Image src={cover} alt={alt || title} fill priority className="object-cover" />
        </motion.div>
      ) : null}

      <motion.div
        variants={hero}
        initial="hidden"
        animate="show"
        className="mx-auto mb-6 w-full max-w-6xl px-5 md:px-6"
      >
        <motion.nav variants={item} className="mb-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/blogs" className="hover:underline">Blog</Link>
        </motion.nav>

        <motion.h1 variants={item} className="text-3xl font-semibold tracking-tight md:text-5xl">
          {title}
        </motion.h1>

        <motion.div
          variants={item}
          className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground"
        >
          <time dateTime={publishedAt}>
            {new Date(publishedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span aria-hidden>•</span>
          <span>{readingTime} min read</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
