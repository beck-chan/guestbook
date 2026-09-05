"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href?: string;
  target?: string;
  rel?: string;
};

type NavSection = {
  title: string;
  items?: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    title: "Installation",
    items: [
      { label: "Prerequisites" },
      { label: "Quickstart", href: "/docs/quickstart" },
      { label: "Install with `npm`" },
    ],
  },
  {
    title: "Guides",
    items: [
      { label: "Set Up Admin Users" },
      { label: "Customize Settings" },
      { label: "Moderate Comments" },
      { label: "Add Analytics" },
    ],
  },
  {
    title: "Reference",
    items: [
      { label: "API Reference" },
    ],
  },
  {
    title: "Etc.",
    items: [
      { label: "Releases", href: "https://github.com/beck-chan/y2k-guestbook/releases", target: "_blank", rel: "noopener noreferrer" },
      { label: "Report Issue", href: "https://github.com/beck-chan/y2k-guestbook/issues", target: "_blank", rel: "noopener noreferrer" },
      { label: "Donate", href: "https://ko-fi.com/beckchan", target: "_blank", rel: "noopener noreferrer" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname === `${href}/`;
}

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav className="docs-nav" aria-label="Documentation">
      {SECTIONS.map((section) => (
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
