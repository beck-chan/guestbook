import Link from "next/link";
import { DocsHeart } from "./_components/DocsHeart";
import { DocsSearch } from "./_components/DocsSearch";
import { DOCS_NAV_SECTIONS } from "./_nav/docs-nav-data";

const LANDING_TITLES = new Set(["Installation", "Guides", "Reference"]);

export default function DocsPage() {
  const sections = DOCS_NAV_SECTIONS.filter((section) =>
    LANDING_TITLES.has(section.title),
  );
  const etcLinks =
    DOCS_NAV_SECTIONS.find((section) => section.title === "Etc.")?.items?.filter(
      (item) => item.href,
    ) ?? [];

  return (
    <div className="docs-index">
      <header className="docs-index-head">
        <p className="docs-brand-kicker">y2k guestbook</p>
        <p className="docs-brand-title">
          Doc
          <span className="docs-brand-heart">
            {/* Hello Honey s.1 (\uE019) is the ending heart flourish */}
            {"\uE019"}
          </span>
        </p>
      </header>
      <DocsSearch variant="bar" />
      <div className="docs-index-notes">
        {sections.map((section) => (
          <section key={section.title} className="docs-toc">
            <p className="docs-toc-label">{section.title}</p>
            <ol>
              {section.items?.map((item) => (
                <li key={item.label}>
                  {item.href ? (
                    <Link href={item.href} target={item.target} rel={item.rel}>
                      {item.href === "/docs/quickstart" ? (
                        <DocsHeart filled />
                      ) : null}
                      {item.label}
                    </Link>
                  ) : (
                    <span className="docs-nav-pending">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      {etcLinks.length > 0 ? (
        <nav className="docs-index-etc" aria-label="More">
          {etcLinks.map((item) => (
            <Link
              key={item.label}
              className="docs-cta"
              href={item.href!}
              target={item.target}
              rel={item.rel}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
