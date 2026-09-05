"use client";

import { useState } from "react";
import { docsUrl, flags, getStartedUrl, reportIssueUrl } from "@/lib/flags";

type MobileMenuLink = {
  href: string;
  label: string;
  target?: string;
  rel?: string;
  className?: string;
};

const REPORT_ISSUE_LINK: MobileMenuLink = {
  href: reportIssueUrl,
  label: "report issue",
  target: "_blank",
  rel: "noopener noreferrer",
  className: "is-small",
};

const DEFAULT_LINKS: MobileMenuLink[] = flags.docs
  ? [
      {
        href: docsUrl,
        label: "view docs",
        target: "_blank",
        rel: "noopener noreferrer",
      },
      { href: "/admin", label: "admin login" },
      REPORT_ISSUE_LINK,
    ]
  : [{ href: "/admin", label: "admin login" }, REPORT_ISSUE_LINK];

const PUBLIC_LINKS: MobileMenuLink[] = [
  {
    href: getStartedUrl,
    label: "get started",
    target: "_blank",
    rel: "noopener noreferrer",
  },
  {
    href: docsUrl,
    label: "view docs",
    target: "_blank",
    rel: "noopener noreferrer",
  },
  REPORT_ISSUE_LINK,
];

type MobileMenuProps = {
  links?: MobileMenuLink[];
  panelId?: string;
  publicMode?: boolean;
};

export function MobileMenu({
  links,
  panelId = "mobile-nav-panel",
  publicMode = false,
}: MobileMenuProps) {
  const resolvedLinks = links ?? (publicMode ? PUBLIC_LINKS : DEFAULT_LINKS);
  const [open, setOpen] = useState(false);

  return (
    <nav className={`mobile-nav${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        menu
        <span className="mobile-nav-caret" aria-hidden="true" />
      </button>
      <div id={panelId} className="mobile-nav-panel">
        <div className="mobile-nav-panel-inner">
          {resolvedLinks.map((link) => (
            <a
              key={link.href}
              className={`mobile-nav-link${link.className ? ` ${link.className}` : ""}`}
              href={link.href}
              target={link.target}
              rel={link.rel}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
