import { Children, isValidElement, type ReactNode } from "react";
import { DocsErdLegend } from "./DocsErdLegend";

export function DocsErdGrid({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter((child) => isValidElement(child));
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
