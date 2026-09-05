import type { Metadata } from "next";
import { DeskBookmarks } from "@/components/_shared/DeskBookmarks";
import { GuestbookBoard } from "@/components/_guestbook/GuestbookBoard";
import { HitCounter } from "@/components/_shared/HitCounter";
import { MobileMenu } from "@/components/_shared/MobileMenu";
import { ReportIssueLink } from "@/components/_shared/ReportIssueLink";

export const metadata: Metadata = {
  title: "Guestbook",
  description: "Sign the guestbook.",
};

export default function GuestbookPage() {
  return (
    <main className="admin-page guestbook-page">
      <DeskBookmarks publicMode />
      <MobileMenu publicMode />
      <ReportIssueLink />
      <HitCounter />
      <div className="admin-shell">
        <GuestbookBoard />
      </div>
    </main>
  );
}
