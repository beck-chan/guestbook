import type { Metadata } from "next";
import { DocsSidenav } from "./DocsSidenav";
import "./docs.css";

export const metadata: Metadata = {
  title: "y2k Guestbook Docs",
  description: "Guestbook documentation.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="docs-shell">
      <DocsSidenav />
      <main className="docs-main">{children}</main>
    </div>
  );
}
