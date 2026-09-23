import { loadBotOpenApiOrNull } from "@/lib/docs/loadDatabaseOpenApi";
import { DocsBotApiReferenceView } from "./DocsBotApiReferenceView";

export async function DocsBotApiReference() {
  const catalog = await loadBotOpenApiOrNull();
  if (!catalog.spec || Object.keys(catalog.spec.paths ?? {}).length === 0) {
    return (
      <aside className="docs-callout">
        <h3 className="docs-subheading">API catalog could not be loaded</h3>
        <p>{catalog.error ?? "The docs chat tables are not in this API catalog."}</p>
      </aside>
    );
  }
  return <DocsBotApiReferenceView spec={catalog.spec} />;
}
