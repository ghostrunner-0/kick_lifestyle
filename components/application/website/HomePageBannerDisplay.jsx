"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function HomePageBannerDisplay({
  className = "",
  maxW = "max-w-[1600px]",
  radius = "rounded-xl sm:rounded-2xl", // gentle rounding
  padX = "px-2 md:px-3", // minimal padding incl. mobile
}) {
  const [img, setImg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/homepage-banner");
        setImg(data?.data?.image || null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !img?.path) return null;

  const ImageEl = (
    <img
      src={img.path}
      alt={img.alt || "Homepage banner"}
      className={`block w-full h-auto object-contain select-none ${radius}`}
      draggable={false}
      loading="lazy"
    />
  );

  return (
    <section className={`${padX} ${className}`}>
      <div className={`mx-auto w-full ${maxW} overflow-x-clip`}>
        {/* just a clip wrapper so the rounded corners apply cleanly */}
        <div className={`overflow-hidden ${radius}`}>
          {img.url ? (
            <a
              href={img.url}
              aria-label={img.alt || "Homepage banner"}
              className="block"
            >
              {ImageEl}
            </a>
          ) : (
            ImageEl
          )}
        </div>
      </div>

      {/* keep this section from creating a bottom scrollbar */}
      <style jsx>{`
        section {
          overflow-x: clip;
        }
        @supports not (overflow: clip) {
          section {
            overflow-x: hidden;
          }
        }
      `}</style>
    </section>
  );
}
