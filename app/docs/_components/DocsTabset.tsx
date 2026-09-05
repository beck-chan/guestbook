"use client";

import { Children, isValidElement, useId, useState } from "react";

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

export function DocsTabset({
  tabs,
  children,
}: {
  tabs?: DocsTab[];
  children?: React.ReactNode;
}) {
  const resolved = tabs ?? tabsFromChildren(children);
  const baseId = useId();
  const [active, setActive] = useState(0);

  function moveTo(event: React.KeyboardEvent<HTMLButtonElement>, next: number) {
    event.preventDefault();
    setActive(next);
    const tabsInList = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    );
    tabsInList?.[next]?.focus();
  }

  return (
    <div className="docs-tabset">
      <div className="docs-tabset-list" role="tablist">
        {resolved.map((tab, index) => {
          const selected = index === active;
          const last = resolved.length - 1;

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
                  moveTo(event, index === last ? 0 : index + 1);
                } else if (event.key === "ArrowLeft") {
                  moveTo(event, index === 0 ? last : index - 1);
                } else if (event.key === "Home") {
                  moveTo(event, 0);
                } else if (event.key === "End") {
                  moveTo(event, last);
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
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
