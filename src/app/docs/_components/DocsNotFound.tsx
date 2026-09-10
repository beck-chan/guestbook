import Link from "next/link";
import { docsUrl } from "@/lib/flags";
import { DOCS_NAV_SECTIONS, type DocsNavItem } from "../_nav/docs-nav-data";
import { DocsSearch } from "./DocsSearch";

function navItem(label: string): DocsNavItem | undefined {
  return DOCS_NAV_SECTIONS.flatMap((section) => section.items ?? []).find(
    (item) => item.label === label,
  );
}

const NOTES: DocsNavItem[] = [
  navItem("Report Issue"),
  { label: "Documentation", href: docsUrl },
  navItem("Sign Guestbook"),
].filter((item): item is DocsNavItem & { href: string } => Boolean(item?.href));

export function DocsNotFound() {
  return (
    <div className="docs-index">
      <header className="docs-index-head">
        <p className="docs-brand-kicker docs-not-found-kicker">404!</p>
      </header>
      <p className="docs-index-subtitle">
        The page you&apos;re looking for cannot be found.
      </p>
      <DocsSearch variant="bar" />
      <div className="docs-index-notes docs-not-found-notes">
        {NOTES.map((item) => (
          <section key={item.label} className="docs-toc">
            <ol>
              <li>
                <Link href={item.href!} target={item.target} rel={item.rel}>
                  {item.label}
                </Link>
              </li>
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
