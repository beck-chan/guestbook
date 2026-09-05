import { notFound } from "next/navigation";
import { flags } from "@/lib/flags";
import { DocsToc, type DocsTocItem } from "./DocsToc";

export function DocsPage({
  toc = [],
  frontmatter,
  children,
}: {
  toc?: DocsTocItem[];
  frontmatter?: { public?: boolean };
  children: React.ReactNode;
}) {
  if (flags.public && frontmatter?.public === false) {
    notFound();
  }

  return (
    <>
      {toc.length > 0 ? <DocsToc items={toc} /> : null}
      <article className="docs-article">{children}</article>
    </>
  );
}
