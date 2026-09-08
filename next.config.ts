import path from "node:path";
import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { flags } from "./lib/flags";
import {
  guestbookAdminExamplePath,
  guestbookAdminPath,
} from "./lib/guestbookPaths";

const root = process.cwd(); // docs MDX plugins resolve from here

const nextConfig: NextConfig = {
  agentRules: false,
  env: {
    FLAG_DOCS: process.env.FLAG_DOCS,
    FLAG_DOCSONLY: process.env.FLAG_DOCSONLY,
    FLAG_COUNTER: process.env.FLAG_COUNTER,
    FLAG_COUNTER_URL: process.env.FLAG_COUNTER_URL,
    FLAG_PUBLIC: process.env.FLAG_PUBLIC,
  },
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  async redirects() {
    if (flags.docsOnly) {
      const admin = guestbookAdminPath();
      return [
        { source: "/", destination: "/docs", permanent: false },
        { source: "/guestbook", destination: "/docs", permanent: false },
        { source: admin, destination: "/docs", permanent: false },
        { source: `${admin}/:path*`, destination: "/docs", permanent: false },
      ];
    }
    return flags.public
      ? [{ source: "/guestbook", destination: "/", permanent: false }]
      : [];
  },
  async rewrites() {
    return {
      beforeFiles: flags.docsOnly
        ? []
        : flags.public
          ? [{ source: "/", destination: "/guestbook" }]
          : [],
      afterFiles: [
        {
          source: `${guestbookAdminPath()}/example.css`,
          destination: guestbookAdminExamplePath(),
        },
      ],
    };
  },
};

const withMDX = createMDX({
  options: {
    // Tuple form includes `{ rev }` in the loader options hash so plugin edits
    // bust @mdx-js/loader's processor cache (functions alone hash as null).
    remarkPlugins: [
      "remark-gfm",
      [path.join(root, "lib/mdx/remark-docs-syntax.mjs"), { rev: 11 }],
    ],
    rehypePlugins: [
      "rehype-slug",
      [path.join(root, "lib/mdx/rehype-docs-highlight.mjs"), { rev: 2 }],
    ],
  },
});

export default withMDX(nextConfig);
