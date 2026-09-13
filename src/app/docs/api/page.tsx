import { preload } from "react-dom";
import Guide, { title } from "./content.mdx";
import { DocsApiReference } from "../_components/DocsApiReference";
import { SCALAR_STANDALONE_SRC } from "@/lib/docs/scalarConfig";

export const metadata = { title };

export default function Page() {
  preload(SCALAR_STANDALONE_SRC, { as: "script", fetchPriority: "high" });
  return (
    <>
      <article className="docs-article">
        <Guide />
      </article>
      <DocsApiReference />
    </>
  );
}
