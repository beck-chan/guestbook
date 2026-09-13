import { loadDatabaseOpenApiOrNull } from "@/lib/docs/loadDatabaseOpenApi";
import { openApiNav } from "@/lib/docs/typesToOpenApi";
import { DocsApiNavHydrator } from "../_nav/DocsApiNavContext";
import { DocsApiReferenceView } from "./DocsApiReferenceView";

export function DocsApiExplorerSkeleton() {
  return (
    <div className="docs-api-explorer">
      <div className="docs-api-reference is-pending" aria-busy="true">
        <p className="docs-api-pending">Loading API reference…</p>
      </div>
    </div>
  );
}

export async function DocsApiReference() {
  const catalog = await loadDatabaseOpenApiOrNull();
  if (!catalog.spec) {
    return (
      <>
        <DocsApiNavHydrator sections={[]} />
        <aside className="docs-callout">
          <h3 className="docs-subheading">API catalog could not be loaded</h3>
          <p>{catalog.error}</p>
        </aside>
      </>
    );
  }
  return (
    <>
      <DocsApiNavHydrator sections={openApiNav(catalog.spec)} />
      <DocsApiReferenceView spec={catalog.spec} />
    </>
  );
}
