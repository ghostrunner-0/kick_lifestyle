"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6"
    >
      <h1 className="text-[90px] font-extrabold text-slate-900 dark:text-white leading-none mb-2">
        404
      </h1>

      <p className="text-lg text-slate-600 dark:text-neutral-400 mb-8">
        The page you’re looking for doesn’t exist or may have been moved.
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-full bg-[#fcba17] hover:bg-[#e9ae12] transition-colors px-6 py-2.5 font-semibold text-black"
      >
        Go Home
      </Link>
    </motion.section>
  );
}
