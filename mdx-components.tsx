import type { MDXComponents } from "mdx/types";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { DocsCallout } from "@/app/docs/_components/DocsCallout";
import { DocsColumn, DocsColumns } from "@/app/docs/_components/DocsColumns";
import { DocsHeart } from "@/app/docs/_components/DocsHeart";
import { DocsTab, DocsTabset } from "@/app/docs/_components/DocsTabset";
import { DocsTaskItem } from "@/app/docs/_components/DocsTaskItem";

function classNames(className: unknown) {
  if (Array.isArray(className)) {
    return className.filter(Boolean).map(String);
  }
  if (typeof className === "string") {
    return className.split(/\s+/).filter(Boolean);
  }
  return [];
}

function isCheckbox(node: ReactNode): node is ReactElement<{
  type?: string;
  checked?: boolean;
}> {
  return (
    isValidElement(node) &&
    node.type === "input" &&
    (node.props as { type?: string }).type === "checkbox"
  );
}

function extractTaskState(children: ReactNode) {
  let checked = false;

  const withoutCheckbox = (node: ReactNode): ReactNode => {
    if (isCheckbox(node)) {
      checked = Boolean((node.props as { checked?: boolean }).checked);
      return null;
    }
    if (!isValidElement(node)) {
      return node;
    }
    const nested = (node.props as { children?: ReactNode }).children;
    if (nested == null) {
      return node;
    }
    const next = Children.map(nested, withoutCheckbox);
    const kept = Children.toArray(next).filter((child) => child != null);
    if (kept.length === Children.count(nested)) {
      return node;
    }
    return cloneElement(node, undefined, kept);
  };

  const rest = Children.toArray(children)
    .map(withoutCheckbox)
    .filter((child) => child != null);

  return { checked, rest };
}

const components: MDXComponents = {
  h1: ({ children, ...props }) => (
    <h1 {...props} className="docs-title">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 {...props} className="docs-heading">
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 {...props} className="docs-subheading">
      {children}
    </h3>
  ),
  pre: ({ children, className, ...props }) => (
    <pre {...props} className={["docs-code", className].filter(Boolean).join(" ")}>
      {children}
    </pre>
  ),
  li: ({ children, className, ...props }) => {
    const names = classNames(className);
    const isTask = names.includes("task-list-item");
    if (isTask) {
      const task = extractTaskState(children);
      return (
        <DocsTaskItem
          defaultChecked={task.checked}
          className={["docs-list-item", ...names].filter(Boolean).join(" ")}
          {...props}
        >
          {task.rest}
        </DocsTaskItem>
      );
    }
    return (
      <li className={["docs-list-item", ...names].filter(Boolean).join(" ")} {...props}>
        <DocsHeart filled className="docs-list-heart" />
        {children}
      </li>
    );
  },
  DocsCallout,
  DocsColumns,
  DocsColumn,
  DocsTabset,
  DocsTab,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
