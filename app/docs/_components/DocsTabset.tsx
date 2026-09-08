"use client";

import { Children, isValidElement, useEffect, useId, useRef, useState } from "react";

export type DocsTab = {
  label: string;
  content: React.ReactNode;
};

export function DocsTab({
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

function tabsFromChildren(children: React.ReactNode): DocsTab[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ label?: string; children?: React.ReactNode }>(child)) {
      return [];
    }
    if (typeof child.props.label !== "string") {
      return [];
    }
    return [{ label: child.props.label, content: child.props.children }];
  });
}

function moveSibling(
  event: React.KeyboardEvent<HTMLButtonElement>,
  next: number,
  selector: string,
) {
  event.preventDefault();
  const siblings = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
    selector,
  );
  siblings?.[next]?.focus();
}

export function DocsTabset({
  tabs,
  children,
}: {
  tabs?: DocsTab[];
  children?: React.ReactNode;
}) {
  const resolved = tabs ?? tabsFromChildren(children);
  const baseId = useId();
  const selectRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const last = resolved.length - 1;
  const activeTab = resolved[active];

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");

    function sync() {
      if (!media.matches) {
        setMenuOpen(false);
      }
    }

    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!selectRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function choose(index: number) {
    setActive(index);
    setMenuOpen(false);
  }

  return (
    <div className="docs-tabset">
      <div className="docs-tabset-list" role="tablist">
        {resolved.map((tab, index) => {
          const selected = index === active;

          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              id={`${baseId}-tab-${index}`}
              className={`docs-tabset-tab${selected ? " is-active" : ""}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${index}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  const next = index === last ? 0 : index + 1;
                  setActive(next);
                  moveSibling(event, next, '[role="tab"]');
                } else if (event.key === "ArrowLeft") {
                  const next = index === 0 ? last : index - 1;
                  setActive(next);
                  moveSibling(event, next, '[role="tab"]');
                } else if (event.key === "Home") {
                  setActive(0);
                  moveSibling(event, 0, '[role="tab"]');
                } else if (event.key === "End") {
                  setActive(last);
                  moveSibling(event, last, '[role="tab"]');
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="docs-tabset-select" ref={selectRef}>
        <button
          type="button"
          className="docs-tabset-select-trigger"
          aria-expanded={menuOpen}
          aria-controls={`${baseId}-select-menu`}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="docs-tabset-select-label">{activeTab?.label}</span>
          <svg
            className="docs-tabset-select-chevron"
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
        </button>
        <div
          id={`${baseId}-select-menu`}
          className="docs-tabset-select-menu"
          role="menu"
          hidden={!menuOpen}
        >
          {resolved.map((tab, index) => {
            const selected = index === active;

            return (
              <button
                key={tab.label}
                type="button"
                role="menuitem"
                className={`docs-tabset-select-option${selected ? " is-active" : ""}`}
                onClick={() => choose(index)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    moveSibling(event, index === last ? 0 : index + 1, '[role="menuitem"]');
                  } else if (event.key === "ArrowUp") {
                    moveSibling(event, index === 0 ? last : index - 1, '[role="menuitem"]');
                  } else if (event.key === "Home") {
                    moveSibling(event, 0, '[role="menuitem"]');
                  } else if (event.key === "End") {
                    moveSibling(event, last, '[role="menuitem"]');
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {resolved.map((tab, index) => {
        const selected = index === active;

        return (
          <div
            key={tab.label}
            role="tabpanel"
            id={`${baseId}-panel-${index}`}
            className={`docs-tabset-panel${selected ? " is-active" : ""}`}
            aria-labelledby={`${baseId}-tab-${index}`}
            hidden={!selected}
          >
            {tab.content}
          </div>
        );
      })}
    </div>
  );
}
