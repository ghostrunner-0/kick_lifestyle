/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // If you ever pass absolute URLs like http://localhost:3000/shared/...
    // or http://localhost:3000/payments/... to <Image />, allow them here.
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/shared/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/payments/**",
      },
      // Add production domain(s) if you serve from the same paths in prod:
      // {
      //   protocol: "https",
      //   hostname: "yourdomain.com",
      //   pathname: "/shared/**",
      // },
      // {
      //   protocol: "https",
      //   hostname: "yourdomain.com",
      //   pathname: "/payments/**",
      // },
    ],
  },

  async rewrites() {
    return [
      // serve media from your API routes
      { source: "/shared/:path*", destination: "/api/shared/:path*" },
      { source: "/payments/:path*", destination: "/api/payments/:path*" },
    ];
  },
};

export default nextConfig;
