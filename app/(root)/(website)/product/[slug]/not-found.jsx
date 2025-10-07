"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function ProductNotFound() {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center min-h-[75vh] text-center px-6"
    >
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
        Product Not Found
      </h2>

      <p className="text-slate-600 dark:text-neutral-400 mb-6 max-w-md">
        Looks like this product has been discontinued or moved.  
        Discover our latest collection below.
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-full bg-[#fcba17] hover:bg-[#e9ae12] transition-colors px-5 py-2 font-semibold text-black"
      >
        Browse Products
      </Link>
    </motion.section>
  );
}
