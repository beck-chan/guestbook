import type { Metadata } from "next";
import { loadDatabaseOpenApiOrNull } from "@/lib/docs/loadDatabaseOpenApi";
import { openApiNav } from "@/lib/docs/typesToOpenApi";
import { getDocsSearchIndex } from "@/lib/docs/searchIndex";
import { DocsSearchProvider } from "./_components/DocsSearch";
import { DocsSidenav } from "./_nav/DocsSidenav";
import "./docs.css";

export const metadata: Metadata = {
  title: {
    default: "y2k Guestbook Docs",
    template: "%s · y2k Guestbook Docs",
  },
  description: "Guestbook documentation.",
};

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const catalog = await loadDatabaseOpenApiOrNull();
  const apiNav = catalog.spec ? openApiNav(catalog.spec) : [];
  const searchDocuments = getDocsSearchIndex();

  return (
    <DocsSearchProvider documents={searchDocuments}>
      <div className="docs-shell">
        <DocsSidenav apiNav={apiNav} />
        <main className="docs-main">{children}</main>
      </div>
    </DocsSearchProvider>
  );
}
