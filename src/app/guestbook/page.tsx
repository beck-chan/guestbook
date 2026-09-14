import type { Metadata } from "next";
import { getPublicCommentsPage } from "@/app/actions/comments";
import { DeskBookmarks } from "@/components/_shared/DeskBookmarks";
import { GuestbookBoard } from "@/components/_guestbook/GuestbookBoard";
import { GuestbookSettingsShell } from "@/components/_shared/GuestbookSettingsShell";
import { HitCounter } from "@/components/_shared/HitCounter";
import { MobileMenu } from "@/components/_shared/MobileMenu";
import { PageReveal } from "@/components/_shared/PageReveal";
import { ReportIssueLink } from "@/components/_shared/ReportIssueLink";
import { loadGuestbookSettings } from "@/lib/loadGuestbookSettings";
import { getUniqueVisitors } from "@/lib/uniqueVisitors";

export const metadata: Metadata = {
  title: "guestbook",
  description: "Sign the guestbook.",
};

export default function GuestbookPage() {
  return (
    <PageReveal as="main" className="admin-page guestbook-page">
      <GuestbookBody />
    </PageReveal>
  );
}

async function GuestbookBody() {
  const [settings, hitCount, commentsPage] = await Promise.all([
    loadGuestbookSettings(),
    getUniqueVisitors(),
    getPublicCommentsPage(1),
  ]);

  return (
    <GuestbookSettingsShell settings={settings}>
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
    </GuestbookSettingsShell>
  );
}
