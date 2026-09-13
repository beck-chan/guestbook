import { Suspense } from "react";
import { preload } from "react-dom";
import Guide, { title } from "./content.mdx";
import {
  DocsApiExplorerSkeleton,
  DocsApiReference,
} from "../_components/DocsApiReference";
import { SCALAR_STANDALONE_SRC } from "@/lib/docs/scalarConfig";

export const dynamic = "force-dynamic";
export const metadata = { title };

export default function Page() {
  preload(SCALAR_STANDALONE_SRC, { as: "script", fetchPriority: "high" });
  return (
    <>
      <article className="docs-article">
        <Guide />
      </article>
      <Suspense fallback={<DocsApiExplorerSkeleton />}>
        <DocsApiReference />
      </Suspense>
    </>
  );
}
