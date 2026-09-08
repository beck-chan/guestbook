"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DocsHeart } from "../_components/DocsHeart";
import type { OpenApiNavSection } from "@/lib/docs/typesToOpenApi";

export function DocsApiNav({
  sections,
  onNavigate,
}: {
  sections: OpenApiNavSection[];
  onNavigate?: () => void;
}) {
  const [hash, setHash] = useState("");

  useEffect(() => {
    function sync() {
      setHash(window.location.hash);
    }

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <nav className="docs-nav docs-api-nav" aria-label="API operations">
      {sections.map((section) => (
        <div key={section.title} className="docs-nav-section">
          <p className="docs-nav-heading">{section.title}</p>
          {section.items.length ? (
            <ul className="docs-nav-list">
              {section.items.map((item) => {
                const active = hash === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      className={`docs-nav-link docs-api-nav-link${active ? " is-active" : ""}`}
                      href={item.href}
                      onClick={onNavigate}
                    >
                      <span className="docs-api-nav-method" data-method={item.method}>
                        {item.method}
                      </span>
                      <span className="docs-api-nav-label">{item.label}</span>
                      {active ? (
                        <DocsHeart filled className="docs-nav-heart" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
