import type { Metadata } from "next";
import { CommentBubbles } from "@/components/CommentBubbles";
import { HitCounter } from "@/components/HitCounter";
import { MobileMenu } from "@/components/MobileMenu";

export const metadata: Metadata = {
  title: "Guestbook",
  description: "Sign the guestbook.",
};

export default function GuestbookPage() {
  return (
    <main className="admin-page guestbook-page">
      <div className="desk-bookmarks">
        <a
          className="desk-bookmark desk-bookmark-labeled"
          href="/docs"
          aria-label="view docs"
        >
          <span className="desk-bookmark-ribbon" aria-hidden="true" />
          <span className="desk-bookmark-label">
            view
            <br />
            docs
          </span>
        </a>
        <a
          className="desk-bookmark desk-bookmark-short desk-bookmark-admin"
          href="/admin"
          aria-label="admin login"
        >
          <span className="desk-bookmark-ribbon" aria-hidden="true">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points="98.5,0 98.5,98.5 50,77 1.5,98.5 1.5,0" />
            </svg>
          </span>
          <span className="desk-bookmark-label">admin login</span>
        </a>
      </div>
      <MobileMenu />
      <HitCounter />
      <div className="admin-shell">
        <h1 className="guestbook-title">
          <span className="demobook-marquee">guestbook</span>
        </h1>
        <CommentBubbles showHits={false} limit={6} />
      </div>
    </main>
  );
}
