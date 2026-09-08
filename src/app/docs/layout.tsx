import type { Metadata } from "next";
import { loadDatabaseOpenApi } from "@/lib/docs/loadDatabaseOpenApi";
import { openApiNav } from "@/lib/docs/typesToOpenApi";
import { DocsSidenav } from "./_nav/DocsSidenav";
import "./docs.css";

export const metadata: Metadata = {
  title: {
    default: "y2k Guestbook Docs",
    template: "%s · y2k Guestbook Docs",
  },
  description: "Guestbook documentation.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const apiNav = openApiNav(loadDatabaseOpenApi());

  return (
    <div className="docs-shell">
      <DocsSidenav apiNav={apiNav} />
      <main className="docs-main">{children}</main>
    </div>
  );
}
