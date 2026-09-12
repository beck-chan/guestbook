import { loadDatabaseOpenApiOrNull } from "@/lib/docs/loadDatabaseOpenApi";
import { DocsApiReferenceView } from "./DocsApiReferenceView";

export async function DocsApiReference() {
  const catalog = await loadDatabaseOpenApiOrNull();
  if (!catalog.spec) {
    return (
      <aside className="docs-callout">
        <h3 className="docs-subheading">API catalog could not be loaded</h3>
        <p>{catalog.error}</p>
      </aside>
    );
  }
  return <DocsApiReferenceView spec={catalog.spec} />;
}
