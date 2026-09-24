import Link from "next/link";
import { docsIndexSubtitle, flags } from "@/lib/flags";
import { DocsHeart } from "./_components/DocsHeart";
import { DocsIndexMenu } from "./_components/DocsIndexMenu";
import { DocsSearch } from "./_components/DocsSearch";
import { DOCS_NAV_SECTIONS } from "./_nav/docs-nav-data";

const LANDING_TITLES = new Set(["Installation", "Guides", "Reference"]);

function DocsIndexSubtitleLine({ line }: { line: string }) {
  if (!line.startsWith("*")) {
    return line;
  }

  return (
    <>
      <span className="docs-index-subtitle-mark">*</span>
      {line.slice(1)}
    </>
  );
}

export default function DocsPage() {
  const sections = DOCS_NAV_SECTIONS.filter((section) =>
    LANDING_TITLES.has(section.title),
  );
  const internalGuides = flags.public
    ? []
    : (DOCS_NAV_SECTIONS.find((section) => section.title === "Internal")?.items ??
      []);
  const footerLinks = ["Etc.", "Support"].flatMap(
    (title) =>
      DOCS_NAV_SECTIONS.find((section) => section.title === title)?.items?.filter(
        (item) => item.href,
      ) ?? [],
  );

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
      <p className="docs-index-subtitle">
        {docsIndexSubtitle.split("\n").map((line, index) => (
          <span
            key={`${index}-${line}`}
            className={index > 0 ? "docs-index-subtitle-more" : undefined}
          >
            <DocsIndexSubtitleLine line={line} />
          </span>
        ))}
      </p>
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
              {section.title === "Reference" && internalGuides.length > 0 ? (
                <li>
                  <DocsIndexMenu label="Internal" items={internalGuides} />
                </li>
              ) : null}
            </ol>
          </section>
        ))}
      </div>
      {footerLinks.length > 0 ? (
        <nav className="docs-index-etc" aria-label="More">
          {footerLinks.map((item) => (
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
