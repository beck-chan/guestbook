import path from "node:path";
import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { flags } from "./lib/flags";

const root = process.cwd(); // docs MDX plugins resolve from here

const nextConfig: NextConfig = {
  env: {
    FLAG_DOCS: process.env.FLAG_DOCS,
    FLAG_COUNTER: process.env.FLAG_COUNTER,
    FLAG_COUNTER_URL: process.env.FLAG_COUNTER_URL,
    FLAG_PUBLIC: process.env.FLAG_PUBLIC,
  },
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
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

const withMDX = createMDX({
  options: {
    // Tuple form includes `{ rev }` in the loader options hash so plugin edits
    // bust @mdx-js/loader's processor cache (functions alone hash as null).
    remarkPlugins: [
      "remark-gfm",
      [path.join(root, "lib/mdx/remark-docs-syntax.mjs"), { rev: 4 }],
    ],
    rehypePlugins: [
      "rehype-slug",
      [path.join(root, "lib/mdx/rehype-docs-highlight.mjs"), { rev: 1 }],
    ],
  },
});

export default withMDX(nextConfig);
