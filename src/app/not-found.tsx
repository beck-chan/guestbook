import { DocsNotFound } from "./docs/_components/DocsNotFound";
import "./docs/docs.css";

export const metadata = { title: "404!" };

export default function NotFound() {
  return (
    <div className="docs-shell">
      <main className="docs-main">
        <DocsNotFound />
      </main>
    </div>
  );
}
