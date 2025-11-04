// app/kick-yatayat/page.jsx
"use client";

import KickYatayatDarazLight from "./KickYatayatDaraz";

const products = [
  {
    id: "x2-neo",
    stop: 1,
    name: "Phantom Buds X2 Neo",
    spec: "Dual-mic ENC • 50H",
    image: "/daraz/x2-neo.png",
    link: "https://www.daraz.com.np/products/kick-phantom-buds-x2-neo-50h-playtime-10mm-dynamic-bass-boom-drivers-duo-mic-enc-kick-signature-sound-lavish-leather-finish-ipx4-water-resistant-i498868820-s2232858684.html?spm=a2a0e.8553159.0.0.48946b08GkhdTW&search=store&mp=3",
  },
  {
    id: "x-elite",
    stop: 2,
    name: "Phantom Buds X Elite",
    spec: "Up to 30dB Pro ANC",
    image: "/daraz/elite.webp",
    link: "https://www.daraz.com.np/products/kick-phantom-buds-x-elite-up-to-30db-pro-anc-quad-mic-ai-enc-kick-signature-sound-with-10mm-drivers-50ms-low-latency-50h-playtime-spark-charge-10min-120min-bt-54-ipx4-splash-resistant-i421426141-s1835639874.html?spm=a2a0e.8553159.0.0.48946b08GkhdTW&search=store&mp=3",
  },
  {
    id: "watch-ultra",
    stop: 3,
    name: "Phantom Watch Ultra",
    spec: `1.85" HD+ Display `,
    image: "/daraz/ultra.webp",
    link: "https://www.daraz.com.np/products/kick-phantom-watch-ultra-185-hd-display-600-nits-brightness-bt-calling-v54-premium-metal-strap-8-days-battery-backup-ip67-dust-water-resistant-24x7-heart-rate-monitoring-step-tracking-100-sports-modes-customizable-watch-f-i491675573-s2207022549.html?spm=a2a0e.8553159.0.0.48946b08GkhdTW&search=store&mp=3",
  },
  {
    id: "s2-master",
    stop: 4,
    name: "Buds S2 Master Edition",
    spec: "45dB Pro ANC",
    image: "/daraz/s2.webp",
    link: "https://www.daraz.com.np/products/kick-buds-s2-master-edition-45db-pro-anc-360-spatial-sound-heylink-app-support-75h-battery-backup-13mm-titanium-drivers-45ms-low-latency-hexa-mic-enc-bt-v54-i436057074-s1908498040.html?spm=a2a0e.8553159.0.0.48946b08GkhdTW&search=store&mp=3",
  },
];

export default function Page() {
  return (
    <KickYatayatDarazLight
      heroImage="/daraz/banner.jpg"
      darazUrl="https://www.daraz.com.np/shop/d4uo7luk/"
      instagramUrl="https://www.instagram.com/kicklifestyle.shop/"
      instagramTicketUrl="https://www.instagram.com/kicklifestyle.shop/" // <-- your ticket post
      products={products}
      offset={96} // scroll anchor offset (for sticky header)
      fabOffsetMobile={0} // above your bottom navbar on mobile
      fabOffsetDesktop={40} // bottom gap on md+
    />
  );
}
