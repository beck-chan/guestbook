declare module "*.mdx" {
  import type { MDXProps } from "mdx/types";

  export const toc: { href: string; label: string; depth?: 2 | 3 }[];
  export const frontmatter: { subtitle?: string };
  export default function MDXContent(props: MDXProps): React.ReactElement;
}
