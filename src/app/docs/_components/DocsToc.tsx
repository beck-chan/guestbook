"use client";

import { useEffect, useState } from "react";
import { DocsHeart } from "./DocsHeart";

export type DocsTocItem = {
  href: string;
  label: string;
  depth?: 2 | 3;
};

const ITEMS_PER_NOTE = 3;
const ACTIVE_OFFSET = 120;

function DocsTocHeart({ active }: { active: boolean }) {
  return <DocsHeart className={active ? "is-visible" : undefined} />;
}

function chunkItems(items: DocsTocItem[]) {
  const notes: DocsTocItem[][] = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_NOTE) {
    notes.push(items.slice(i, i + ITEMS_PER_NOTE));
  }
  return notes.length > 0 ? notes : [[]];
}

function itemDepth(item: DocsTocItem) {
  return item.depth ?? 2;
}

/** Active H2 section href, if any. */
function activeSectionHref(items: DocsTocItem[], activeHref: string) {
  let currentH2: string | null = null;
  for (const item of items) {
    if (itemDepth(item) === 2) {
      currentH2 = item.href;
    }
    if (item.href === activeHref) {
      return currentH2;
    }
  }
  return null;
}

/** H3s under the active H2 section only. */
function activeSectionChildren(items: DocsTocItem[], activeHref: string) {
  const section = activeSectionHref(items, activeHref);
  if (!section) {
    return [];
  }

  const children: DocsTocItem[] = [];
  let currentH2: string | null = null;
  for (const item of items) {
    if (itemDepth(item) === 2) {
      currentH2 = item.href;
      continue;
    }
    if (currentH2 === section) {
      children.push(item);
    }
  }
  return children;
}

function useActiveTocHref(items: DocsTocItem[]) {
  const [activeHref, setActiveHref] = useState("");
  const hrefKey = items.map((item) => item.href).join(" ");

  useEffect(() => {
    const headings = items.flatMap((item) => {
      const id = item.href.startsWith("#") ? item.href.slice(1) : item.href;
      const element = document.getElementById(id);
      return element ? [{ href: item.href, element }] : [];
    });

    if (headings.length === 0) {
      return;
    }

    function currentHref() {
      let current = headings[0].href;
      for (const heading of headings) {
        if (heading.element.getBoundingClientRect().top <= ACTIVE_OFFSET) {
          current = heading.href;
        }
      }
      return current;
    }

    let frame = 0;
    function update() {
      setActiveHref(currentHref());
    }

    function onScroll() {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", update);
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", update);
      window.removeEventListener("resize", onScroll);
    };
  }, [hrefKey, items]);

  return activeHref;
}

function TocNote({
  items,
  activeHref,
  label,
  className,
  zIndex,
}: {
  items: DocsTocItem[];
  activeHref: string;
  label?: string;
  className?: string;
  zIndex?: number;
}) {
  return (
    <div
      className={["docs-toc", className].filter(Boolean).join(" ")}
      style={zIndex != null ? { zIndex } : undefined}
    >
      {label ? <p className="docs-toc-label">{label}</p> : null}
      <ol>
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={item.depth === 3 ? "docs-toc-h3" : "docs-toc-h2"}
                aria-current={active ? "location" : undefined}
              >
                <DocsTocHeart active={active} />
                {item.label}
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function DocsToc({ items }: { items: DocsTocItem[] }) {
  const activeHref = useActiveTocHref(items);
  const h2Items = items.filter((item) => itemDepth(item) === 2);
  const notes = chunkItems(h2Items);
  const childNotes = chunkItems(activeSectionChildren(items, activeHref));

  return (
    <nav className="docs-toc-stack" aria-label="Table of contents">
      <div className="docs-toc-primary">
        {notes.map((group, index) => (
          <TocNote
            key={group[0]?.href ?? index}
            items={group}
            activeHref={activeHref}
            label={index === 0 ? "on this page" : undefined}
            zIndex={index + 1}
          />
        ))}
      </div>
      {childNotes[0]?.length ? (
        <div className="docs-toc-secondary">
          {childNotes.map((group, index) => (
            <TocNote
              key={group[0]?.href ?? index}
              items={group}
              activeHref={activeHref}
              className="docs-toc-children"
              label={index === 0 ? "in this section" : undefined}
              zIndex={index + 1}
            />
          ))}
        </div>
      ) : null}
    </nav>
  );
}
