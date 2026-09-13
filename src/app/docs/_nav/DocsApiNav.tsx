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

function findTagToggle(href: string) {
  const root = document.getElementById(tagId(href));
  if (!root) {
    return null;
  }
  const heading = root.querySelector<HTMLElement>(
    "h1, h2, h3, h4, [class*='section-header']",
  );
  const fromHeading = heading?.querySelector<HTMLElement>(
    "button[aria-expanded], summary",
  );
  if (fromHeading) {
    return fromHeading;
  }
  if (heading?.hasAttribute("aria-expanded")) {
    return heading;
  }
  return root.querySelector<HTMLElement>(":scope > button[aria-expanded]");
}

function tagShowsOperations(href: string) {
  const id = tagId(href);
  const root = document.getElementById(id);
  if (!root) {
    return false;
  }
  for (const el of root.querySelectorAll<HTMLElement>(
    `[id^="${CSS.escape(`${id}/`)}"]`,
  )) {
    if (el.getClientRects().length > 0) {
      return true;
    }
  }
  return false;
}

function readTagExpanded(href: string) {
  if (tagShowsOperations(href)) {
    return true;
  }
  const root = document.getElementById(tagId(href));
  if (!root) {
    return null;
  }
  if (root instanceof HTMLDetailsElement) {
    return root.open;
  }
  const toggle = findTagToggle(href);
  if (toggle instanceof HTMLDetailsElement) {
    return toggle.open;
  }
  if (toggle?.hasAttribute("aria-expanded")) {
    return toggle.getAttribute("aria-expanded") === "true";
  }
  return null;
}

function showMoreAction(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (normalized === "show more" || normalized === "show all") {
    return "open" as const;
  }
  if (normalized === "show less") {
    return "close" as const;
  }
  return null;
}

function sectionHrefFromNode(
  node: Element,
  sections: OpenApiNavSection[],
) {
  let current: Element | null = node;
  while (current) {
    const id = current.id;
    if (id) {
      const href = `#${id}`;
      const tag = sections.find((section) => section.href === href);
      if (tag) {
        return tag.href;
      }
      const parent = sections.find((section) =>
        id.startsWith(`${tagId(section.href)}/`),
      );
      if (parent) {
        return parent.href;
      }
    }
    current = current.parentElement;
  }
  return null;
}

function isTagSectionId(id: string) {
  return /^api\/tag\/[^/]+$/.test(id);
}

function findShowMoreControl(href: string, action: "open" | "close") {
  const root = document.getElementById(tagId(href));
  if (!root) {
    return null;
  }
  const scope: Element[] = [root];
  let sibling = root.nextElementSibling;
  while (sibling && !isTagSectionId(sibling.id)) {
    scope.push(sibling);
    sibling = sibling.nextElementSibling;
  }
  for (const node of scope) {
    const candidates = [
      ...(node instanceof HTMLElement &&
      node.matches("button, a, [role='button']")
        ? [node]
        : []),
      ...node.querySelectorAll<HTMLElement>("button, a, [role='button']"),
    ];
    for (const el of candidates) {
      if (showMoreAction(el.textContent ?? "") === action) {
        return el;
      }
    }
  }
  return null;
}

function setTagExpanded(href: string, open: boolean) {
  const shown = tagShowsOperations(href);
  if (shown === open) {
    return;
  }
  const control = findShowMoreControl(href, open ? "open" : "close");
  if (control) {
    control.click();
    return;
  }
  const root = document.getElementById(tagId(href));
  if (!root) {
    return;
  }
  if (root instanceof HTMLDetailsElement) {
    root.open = open;
    return;
  }
  const toggle = findTagToggle(href);
  if (!toggle) {
    return;
  }
  if (toggle instanceof HTMLDetailsElement) {
    toggle.open = open;
    return;
  }
  const expanded = toggle.getAttribute("aria-expanded") === "true";
  if (expanded !== open) {
    toggle.click();
  }
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

  useEffect(() => {
    function sync() {
      setHash(window.location.hash);
    }

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const match = sections.find(
      (section) =>
        hash === section.href ||
        section.items.some((item) => item.href === hash),
    );
    if (!match) {
      return;
    }
    setOpenHrefs((current) => {
      if (current.has(match.href)) {
        return current;
      }
      const next = new Set(current);
      next.add(match.href);
      return next;
    });
  }, [hash, sections]);

  useEffect(() => {
    const host = document.querySelector(".docs-api-reference");
    if (!host || sections.length === 0) {
      return;
    }

    function syncFromExplorer() {
      setOpenHrefs((current) => {
        let changed = false;
        const next = new Set(current);
        for (const section of sections) {
          const expanded = readTagExpanded(section.href);
          if (expanded === true && !next.has(section.href)) {
            next.add(section.href);
            changed = true;
          } else if (expanded === false && next.has(section.href)) {
            const hashNow = window.location.hash;
            const pinned =
              hashNow === section.href ||
              section.items.some((item) => item.href === hashNow);
            if (!pinned) {
              next.delete(section.href);
              changed = true;
            }
          }
        }
        return changed ? next : current;
      });
    }

    function onExplorerClick(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const control = target.closest("button, a, [role='button']");
      if (!(control instanceof HTMLElement)) {
        return;
      }
      const action = showMoreAction(control.textContent ?? "");
      if (!action) {
        return;
      }
      const href = sectionHrefFromNode(control, sections);
      if (!href) {
        return;
      }
      requestAnimationFrame(() => {
        setOpenHrefs((current) => {
          const next = new Set(current);
          if (action === "open") {
            if (next.has(href)) {
              return current;
            }
            next.add(href);
          } else if (!next.has(href)) {
            return current;
          } else {
            next.delete(href);
          }
          return next;
        });
        syncFromExplorer();
      });
    }

    syncFromExplorer();
    const observer = new MutationObserver(syncFromExplorer);
    observer.observe(host, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-expanded", "open", "hidden"],
    });
    host.addEventListener("click", onExplorerClick);
    return () => {
      observer.disconnect();
      host.removeEventListener("click", onExplorerClick);
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
    setTagExpanded(section.href, nextOpen);
    if (nextOpen) {
      scrollToScalarHash(section.href);
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
                          scrollToScalarHash(item.href);
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
