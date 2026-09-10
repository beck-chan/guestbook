import { DocsNotFound } from "./docs/_components/DocsNotFound";
import { DocsSearchProvider } from "./docs/_components/DocsSearch";
import { getDocsSearchIndex } from "@/lib/docs/searchIndex";
import "./docs/docs.css";

export const metadata = { title: "404!" };

export default function NotFound() {
  const searchDocuments = getDocsSearchIndex();

  return (
    <DocsSearchProvider documents={searchDocuments}>
      <div className="docs-shell">
        <main className="docs-main">
          <DocsNotFound />
        </main>
      </div>
    </DocsSearchProvider>
  );
}
