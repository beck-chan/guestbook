import type { Metadata } from "next";
import { DeskBookmarks } from "@/components/_shared/DeskBookmarks";
import { GuestbookBoard } from "@/components/_guestbook/GuestbookBoard";
import { HitCounter } from "@/components/_shared/HitCounter";
import { MobileMenu } from "@/components/_shared/MobileMenu";
import { ReportIssueLink } from "@/components/_shared/ReportIssueLink";
import { getUniqueVisitors } from "@/lib/uniqueVisitors";

export const metadata: Metadata = {
  title: "y2k guestbook",
  description: "Sign the retro-inspired guestbook.",
};

export default async function GuestbookPage() {
  const hitCount = await getUniqueVisitors();

  return (
    <main className="admin-page guestbook-page">
      <DeskBookmarks publicMode />
      <MobileMenu publicMode />
      <ReportIssueLink />
      <HitCounter count={hitCount} />
      <div className="admin-shell">
        <GuestbookBoard />
      </div>
    </main>
  );
}
