import { DocsNotFound } from "./docs/_components/DocsNotFound";
import { DocsSearchProvider } from "./docs/_components/DocsSearch";
import "./docs/docs.css";

export const metadata = { title: "404!" };

export default function NotFound() {
  return (
    <DocsSearchProvider>
      <div className="docs-shell">
        <main className="docs-main">
          <DocsNotFound />
        </main>
      </div>
    </DocsSearchProvider>
  );
}
