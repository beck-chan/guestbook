import type { NextConfig } from "next";
import { flags } from "./lib/flags";

const nextConfig: NextConfig = {
  async redirects() {
    return flags.public
      ? [{ source: "/guestbook", destination: "/", permanent: false }]
      : [];
  },
  async rewrites() {
    return {
      beforeFiles: flags.public
        ? [{ source: "/", destination: "/guestbook" }]
        : [],
      afterFiles: [
        {
          source: "/admin/example.css",
          destination: "/admin/example",
        },
      ],
    };
  },
};

export default nextConfig;
