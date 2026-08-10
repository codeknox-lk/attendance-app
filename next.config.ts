import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
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

