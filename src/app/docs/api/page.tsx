import Guide, { title } from "./content.mdx";
import { DocsApiReference } from "../_components/DocsApiReference";

export const metadata = { title };

export default function Page() {
  return (
    <>
      <article className="docs-article">
        <Guide />
      </article>
      <DocsApiReference />
    </>
  );
}
