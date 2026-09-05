import type { MDXComponents } from "mdx/types";
import { DocsCallout } from "@/app/docs/_components/DocsCallout";
import { DocsColumn, DocsColumns } from "@/app/docs/_components/DocsColumns";
import { DocsTab, DocsTabset } from "@/app/docs/_components/DocsTabset";

const components: MDXComponents = {
  h1: ({ children, ...props }) => (
    <h1 {...props} className="docs-title">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 {...props} className="docs-heading">
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 {...props} className="docs-subheading">
      {children}
    </h3>
  ),
  pre: ({ children, className, ...props }) => (
    <pre {...props} className={["docs-code", className].filter(Boolean).join(" ")}>
      {children}
    </pre>
  ),
  DocsCallout,
  DocsColumns,
  DocsColumn,
  DocsTabset,
  DocsTab,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
