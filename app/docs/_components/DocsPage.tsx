import { DocsToc, type DocsTocItem } from "./DocsToc";

export function DocsPage({
  toc = [],
  children,
}: {
  toc?: DocsTocItem[];
  children: React.ReactNode;
}) {
  return (
    <>
      {toc.length > 0 ? <DocsToc items={toc} /> : null}
      <article className="docs-article">{children}</article>
    </>
  );
}
