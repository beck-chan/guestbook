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
        <p className="docs-brand-title docs-not-found-kicker" aria-label="four oh four!">
          fou
          <span className="docs-brand-heart">
            {/* Hello Honey r.1 (\uE018) connects r to o with a heart */}
            {"\uE018"}
          </span>
          o
          <span className="docs-brand-heart">
            {/* Hello Honey h.1 (\uE008) connects h to f with a heart */}
            {"\uE008"}
          </span>
          four!
        </p>
      </header>
      <p className="docs-index-subtitle">
        The page you&apos;re looking for cannot be found.
      </p>
      <DocsSearch variant="bar" />
      <div className="docs-index-notes docs-not-found-notes">
        {NOTES.map((item) => (
          <section key={item.label} className="docs-toc">
            <p className="docs-toc-label" aria-hidden="true" />
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
