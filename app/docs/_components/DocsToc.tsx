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

export function DocsToc({ items }: { items: DocsTocItem[] }) {
  const notes = chunkItems(items);
  const activeHref = useActiveTocHref(items);

  return (
    <nav className="docs-toc-stack" aria-label="Table of contents">
      {notes.map((group, index) => (
        <div
          key={group[0]?.href ?? index}
          className="docs-toc"
          style={{ zIndex: index + 1 }}
        >
          {index === 0 ? <p className="docs-toc-label">On this page</p> : null}
          <ol>
            {group.map((item) => {
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
      ))}
    </nav>
  );
}
