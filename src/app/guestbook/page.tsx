import type { Metadata } from "next";
import { getPublicCommentsPage } from "@/app/actions/comments";
import { DeskBookmarks } from "@/components/_shared/DeskBookmarks";
import { GuestbookBoard } from "@/components/_guestbook/GuestbookBoard";
import { HitCounter } from "@/components/_shared/HitCounter";
import { MobileMenu } from "@/components/_shared/MobileMenu";
import { ReportIssueLink } from "@/components/_shared/ReportIssueLink";
import { getUniqueVisitors } from "@/lib/uniqueVisitors";

export const metadata: Metadata = {
  title: "guestbook",
  description: "Sign the guestbook.",
};

export default async function GuestbookPage() {
  const [hitCount, commentsPage] = await Promise.all([
    getUniqueVisitors(),
    getPublicCommentsPage(1),
  ]);

  return (
    <main className="admin-page guestbook-page">
      <DeskBookmarks publicMode />
      <MobileMenu publicMode />
      <ReportIssueLink />
      <HitCounter count={hitCount} />
      <div className="admin-shell">
        <GuestbookBoard
          initialComments={commentsPage.comments}
          initialPage={commentsPage.page}
          initialTotalPages={commentsPage.totalPages}
        />
      </div>
    </main>
  );
}
