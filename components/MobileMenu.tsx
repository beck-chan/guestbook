"use client";

import { useState } from "react";

type MobileMenuLink = {
  href: string;
  label: string;
};

const DEFAULT_LINKS: MobileMenuLink[] = [
  { href: "/docs", label: "view docs" },
  { href: "/admin", label: "admin login" },
];

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
            <a key={link.href} className="mobile-nav-link" href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
