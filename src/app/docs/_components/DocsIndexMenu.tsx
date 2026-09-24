"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { DocsNavItem } from "../_nav/docs-nav-data";

export function DocsIndexMenu({
  label,
  items,
}: {
  label: string;
  items: DocsNavItem[];
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const links = items.filter((item) => item.href);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function focusItem(index: number) {
    const entries = rootRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]');
    if (!entries?.length) {
      return;
    }
    const next = (index + entries.length) % entries.length;
    entries[next]?.focus();
  }

  return (
    <div ref={rootRef} className={`docs-index-menu${open ? " is-open" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="docs-index-menu-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
            return;
          }
          event.preventDefault();
          setOpen(true);
          const target = event.key === "ArrowUp" ? -1 : 0;
          requestAnimationFrame(() => focusItem(target));
        }}
      >
        {label}
        <svg className="docs-index-menu-caret" viewBox="0 0 12 8" aria-hidden="true">
          <path
            d="M1 1.5 6 6.5 11 1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <ul id={menuId} className="docs-index-menu-panel" role="menu" hidden={!open}>
        {links.map((item, index) => (
          <li key={item.label} role="none">
            <Link
              role="menuitem"
              href={item.href!}
              target={item.target}
              rel={item.rel}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusItem(index + 1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  focusItem(index - 1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  focusItem(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  focusItem(links.length - 1);
                }
              }}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
