"use client";

import { useState } from "react";
import { DocsHeart } from "./DocsHeart";

export function DocsTaskItem({
  defaultChecked = false,
  className,
  children,
  ...props
}: {
  defaultChecked?: boolean;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"li">, "onClick" | "onKeyDown">) {
  const [checked, setChecked] = useState(defaultChecked);

  function toggle() {
    setChecked((value) => !value);
  }

  return (
    <li
      className={[className, checked ? "is-checked" : undefined]
        .filter(Boolean)
        .join(" ")}
      {...props}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) {
          return;
        }
        toggle();
      }}
    >
      <button
        type="button"
        className="docs-task-toggle"
        role="checkbox"
        aria-checked={checked}
        aria-label={checked ? "Mark as not done" : "Mark as done"}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
      >
        <DocsHeart filled={checked} className="docs-list-heart docs-task-heart" />
      </button>
      {children}
    </li>
  );
}
