import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/admin/example.css",
        destination: "/admin/example",
      },
    ];
  },
};

export default nextConfig;
