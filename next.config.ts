import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/marketing",
        destination: "/marketing/index.html",
      },
      {
        source: "/styles.css",
        destination: "/marketing/styles.css",
      },
      {
        source: "/app.js",
        destination: "/marketing/app.js",
      },
      {
        source: "/ISUP/:path*",
        destination: "/api/biometric/hikvision",
      },
      {
        source: "/isup/:path*",
        destination: "/api/biometric/hikvision",
      },
      {
        source: "/eHome/:path*",
        destination: "/api/biometric/hikvision",
      },
      {
        source: "/ehome/:path*",
        destination: "/api/biometric/hikvision",
      },
      {
        source: "/AccessControl/:path*",
        destination: "/api/biometric/hikvision",
      },
      {
        source: "/SDK/:path*",
        destination: "/api/biometric/hikvision",
      },
    ];
  },
};

export default nextConfig;

