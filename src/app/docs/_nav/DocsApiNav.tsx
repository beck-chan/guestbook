"use client";

import { useEffect, useState } from "react";
import { DocsHeart } from "../_components/DocsHeart";
import type { OpenApiNavSection } from "@/lib/docs/typesToOpenApi";

function tagId(href: string) {
  return href.startsWith("#") ? href.slice(1) : href;
}

function scrollToScalarHash(hash: string) {
  const id = tagId(hash);
  if (window.location.hash !== `#${id}`) {
    window.location.hash = id;
  } else {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  const target =
    document.getElementById(id) ??
    document.querySelector(`[id="${CSS.escape(id)}"]`) ??
    document.querySelector(`[id^="${CSS.escape(id)}/"]`);
  target?.scrollIntoView({ block: "start" });
}

function hrefFromScalarTagId(id: string, sections: OpenApiNavSection[]) {
  const normalized = id.replace(/^#/, "");
  const href = `#${normalized}`;
  const exact = sections.find((section) => section.href === href);
  if (exact) {
    return exact.href;
  }
  return (
    sections.find((section) => {
      const sectionId = tagId(section.href);
      return (
        normalized === sectionId ||
        normalized.endsWith(`/${sectionId}`) ||
        sectionId.endsWith(`/${normalized}`)
      );
    })?.href ?? null
  );
}

function sectionHrefFromNode(node: Element, sections: OpenApiNavSection[]) {
  const button = node.closest("button.show-more");
  if (button?.id) {
    const fromButton = hrefFromScalarTagId(button.id, sections);
    if (fromButton) {
      return fromButton;
    }
  }
  let current: Element | null = node;
  while (current) {
    const id = current.id;
    if (id) {
      const href = hrefFromScalarTagId(id, sections);
      if (href) {
        return href;
      }
    }
    current = current.parentElement;
  }
  return null;
}

function findShowMoreButton(href: string) {
  const id = tagId(href);
  const byId = document.querySelector<HTMLElement>(
    `button.show-more[id="${CSS.escape(id)}"]`,
  );
  if (byId) {
    return byId;
  }
  const root = document.getElementById(id);
  if (!root) {
    return null;
  }
  if (root.matches("button.show-more")) {
    return root;
  }
  const container =
    root.closest(".tag-section-container") ?? root.parentElement ?? root;
  return container.querySelector<HTMLElement>("button.show-more");
}

function expandTagInExplorer(href: string) {
  findShowMoreButton(href)?.click();
}

function SectionCaret() {
  return (
    <svg
      className="docs-api-nav-caret"
      viewBox="0 0 12 8"
      aria-hidden="true"
    >
      <path
        d="M1 1.5 6 6.5 11 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DocsApiNav({
  sections,
  onNavigate,
}: {
  sections: OpenApiNavSection[];
  onNavigate?: () => void;
}) {
  const [hash, setHash] = useState("");
  const [openHrefs, setOpenHrefs] = useState<Set<string>>(() => new Set());
  const [openedForHash, setOpenedForHash] = useState({
    hash: "",
    href: null as string | null,
  });

  const hashSectionHref =
    sections.find(
      (section) =>
        hash === section.href ||
        section.items.some((item) => item.href === hash),
    )?.href ?? null;

  if (hash !== openedForHash.hash || hashSectionHref !== openedForHash.href) {
    setOpenedForHash({ hash, href: hashSectionHref });
    if (hashSectionHref) {
      setOpenHrefs((current) => {
        if (current.has(hashSectionHref)) {
          return current;
        }
        const next = new Set(current);
        next.add(hashSectionHref);
        return next;
      });
    }
  }

  useEffect(() => {
    function sync() {
      setHash(window.location.hash);
    }

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    function openFromTagId(id: string) {
      const href = hrefFromScalarTagId(id, sections);
      if (!href) {
        return;
      }
      setOpenHrefs((current) => {
        if (current.has(href)) {
          return current;
        }
        const next = new Set(current);
        next.add(href);
        return next;
      });
    }

    function onShowMore(event: Event) {
      const tagIdValue =
        event instanceof CustomEvent
          ? String(event.detail?.tagId ?? "")
          : "";
      if (tagIdValue) {
        openFromTagId(tagIdValue);
      }
    }

    function onExplorerClick(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const control = target.closest("button.show-more");
      if (!(control instanceof HTMLElement)) {
        return;
      }
      const href = sectionHrefFromNode(control, sections);
      if (href) {
        openFromTagId(tagId(href));
      }
    }

    window.addEventListener("docs-api:show-more", onShowMore);
    document.addEventListener("click", onExplorerClick);
    return () => {
      window.removeEventListener("docs-api:show-more", onShowMore);
      document.removeEventListener("click", onExplorerClick);
    };
  }, [sections]);

  function toggleSection(section: OpenApiNavSection) {
    const nextOpen = !openHrefs.has(section.href);
    setOpenHrefs((current) => {
      const next = new Set(current);
      if (nextOpen) {
        next.add(section.href);
      } else {
        next.delete(section.href);
      }
      return next;
    });
    if (nextOpen) {
      expandTagInExplorer(section.href);
      requestAnimationFrame(() => {
        scrollToScalarHash(section.href);
      });
    } else {
      window.dispatchEvent(
        new CustomEvent("docs-api:collapse-tag", {
          detail: { tagId: tagId(section.href) },
        }),
      );
    }
  }

  return (
    <nav className="docs-nav docs-api-nav" aria-label="API operations">
      {sections.map((section) => {
        const expanded = openHrefs.has(section.href);
        const sectionActive = hash === section.href;
        const listId = `${tagId(section.href)}-nav`;
        return (
          <div
            key={section.title}
            className={`docs-nav-section${expanded ? " is-expanded" : ""}`}
          >
            <a
              className={`docs-nav-heading${expanded ? " is-expanded" : ""}${sectionActive ? " is-active" : ""}`}
              href={section.href}
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={(event) => {
                event.preventDefault();
                toggleSection(section);
              }}
            >
              {section.title}
              <SectionCaret />
              {sectionActive ? (
                <DocsHeart filled className="docs-nav-heart" />
              ) : null}
            </a>
            {section.items.length ? (
              <ul
                id={listId}
                className="docs-nav-list"
                hidden={!expanded}
              >
                {section.items.map((item) => {
                  const active = hash === item.href;
                  return (
                    <li key={item.href}>
                      <a
                        className={`docs-nav-link docs-api-nav-link${active ? " is-active" : ""}`}
                        href={item.href}
                        onClick={(event) => {
                          event.preventDefault();
                          setOpenHrefs((current) => {
                            if (current.has(section.href)) {
                              return current;
                            }
                            const next = new Set(current);
                            next.add(section.href);
                            return next;
                          });
                          expandTagInExplorer(section.href);
                          requestAnimationFrame(() => {
                            scrollToScalarHash(item.href);
                          });
                          onNavigate?.();
                        }}
                      >
                        <span className="docs-api-nav-method" data-method={item.method}>
                          {item.method}
                        </span>
                        <span className="docs-api-nav-label">{item.label}</span>
                        {active ? (
                          <DocsHeart filled className="docs-nav-heart" />
                        ) : null}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
