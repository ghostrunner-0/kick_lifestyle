/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Use remotePatterns instead of deprecated domains for Next.js 13+
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000", // change to your dev port if different
        pathname: "/shared/**",  // changed from /uploads/**
      },
      // Add your production domain if needed, e.g.:
      // {
      //   protocol: "https",
      //   hostname: "yourdomain.com",
      //   pathname: "/shared/**",  // also change here if needed
      // },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/shared/:path*",
        destination: "/api/shared/:path*", // route to API serving shared files
      },
    ];
  },
};

export default nextConfig;
