// components/Thumb40.tsx (or .tsx/.jsx as you prefer)
import Image from "next/image";

export default function Thumb40({ src, alt }) {
  if (!src) {
    return <div className="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700" />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={40}
      className="h-10 w-10 rounded object-cover"
      sizes="40px"
    />
  );
}
