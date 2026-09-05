import type { Metadata } from "next";
import { DocsNav } from "./DocsNav";
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
      <aside className="docs-sidenav">
        <div className="docs-brand">
          <p className="docs-brand-kicker">y2k guestbook</p>
          <p className="docs-brand-title">
            {/* Hello Honey s.1 (\uE019) is the ending heart flourish */}
            Doc{"\uE019"}
          </p>
        </div>
        <DocsNav />
      </aside>
      <main className="docs-main">{children}</main>
    </div>
  );
}
