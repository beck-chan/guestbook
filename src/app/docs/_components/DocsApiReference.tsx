import { loadDatabaseOpenApi } from "@/lib/docs/loadDatabaseOpenApi";
import { DocsApiReferenceView } from "./DocsApiReferenceView";

export async function DocsApiReference() {
  const spec = loadDatabaseOpenApi();
  return <DocsApiReferenceView spec={spec} />;
}
