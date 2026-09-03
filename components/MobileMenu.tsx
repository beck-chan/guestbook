"use client";

import { useState } from "react";
import { docsUrl, flags } from "@/lib/flags";

type MobileMenuLink = {
  href: string;
  label: string;
  target?: string;
  rel?: string;
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
    ]
  : [{ href: "/admin", label: "admin login" }];

type MobileMenuProps = {
  links?: MobileMenuLink[];
  panelId?: string;
};

export function MobileMenu({
  links = DEFAULT_LINKS,
  panelId = "mobile-nav-panel",
}: MobileMenuProps) {
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
          {links.map((link) => (
            <a
              key={link.href}
              className="mobile-nav-link"
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
