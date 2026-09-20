import type { Metadata } from "next";
import { DocsSearchProvider } from "./_components/DocsSearch";
import { DocsChat } from "./_components/DocsChat";
import { DocsApiNavProvider } from "./_nav/DocsApiNavContext";
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
  return (
    <DocsApiNavProvider>
      <DocsSearchProvider>
        <div className="docs-shell">
          <DocsSidenav />
          <main className="docs-main">{children}</main>
          <DocsChat />
        </div>
      </DocsSearchProvider>
    </DocsApiNavProvider>
  );
}
