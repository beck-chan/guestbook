"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_NAV_SECTIONS } from "./docs-nav-data";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname === `${href}/`;
}

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav className="docs-nav" aria-label="Documentation">
      {DOCS_NAV_SECTIONS.map((section) => (
        <div key={section.title} className="docs-nav-section">
          <p className="docs-nav-heading">{section.title}</p>
          {section.items?.length ? (
            <ul className="docs-nav-list">
              {section.items.map((item) => (
                <li key={item.label}>
                  {item.href ? (
                    <Link
                      className={`docs-nav-link${isActive(pathname, item.href) ? " is-active" : ""}`}
                      href={item.href}
                      target={item.target}
                      rel={item.rel}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="docs-nav-pending">{item.label}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
