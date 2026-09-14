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
} & React.ComponentProps<"li">) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <li
      className={[className, checked ? "is-checked" : undefined]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <button
        type="button"
        className="docs-task-toggle"
        role="checkbox"
        aria-checked={checked}
        aria-label={checked ? "Mark as not done" : "Mark as done"}
        onClick={() => setChecked((value) => !value)}
      >
        <DocsHeart filled={checked} className="docs-list-heart docs-task-heart" />
      </button>
      {children}
    </li>
  );
}
