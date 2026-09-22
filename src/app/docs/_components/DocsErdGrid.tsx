import { Children, isValidElement, type ReactNode } from "react";
import { DocsErdLegend } from "./DocsErdLegend";

export function DocsErdGrid({
  children,
  layout = "book",
}: {
  children: ReactNode;
  layout?: "book" | "chat";
}) {
  const items = Children.toArray(children).filter((child) => isValidElement(child));

  if (layout === "chat") {
    const [session, limits, query, section] = items;
    return (
      <div className="docs-erd-grid docs-erd-grid-chat">
        <div className="docs-erd-session">{session}</div>
        <div className="docs-erd-side">
          <div className="docs-erd-limits">{limits}</div>
          <div className="docs-erd-section">{section}</div>
          <DocsErdLegend />
        </div>
        <div className="docs-erd-query">{query}</div>
      </div>
    );
  }

  const [admin, comments, settings, poems] = items;

  return (
    <div className="docs-erd-grid">
      <div className="docs-erd-admin">{admin}</div>
      <div className="docs-erd-comments">{comments}</div>
      <DocsErdLegend />
      <div className="docs-erd-settings">{settings}</div>
      <div className="docs-erd-poems">{poems}</div>
    </div>
  );
}
