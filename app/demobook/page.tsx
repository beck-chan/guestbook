import type { Metadata } from "next";
import { CommentBubbles } from "@/components/CommentBubbles";

export const metadata: Metadata = {
  title: "y2k guestbook",
  description: "Sign the guestbook.",
};

export default function DemobookPage() {
  return (
    <main className="admin-page guestbook-page guestbook-mono demobook-public">
      <a className="demobook-login" href="/demobook/admin">
        admin login
      </a>
      <div className="admin-shell">
        <h1 className="demobook-title">
          <span className="demobook-marquee">y2k guestbook</span>
        </h1>
        <CommentBubbles showHits={false} limit={6} />
      </div>
    </main>
  );
}
