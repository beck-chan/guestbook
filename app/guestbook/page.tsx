import type { Metadata } from "next";
import { DeskBookmarks } from "@/components/DeskBookmarks";
import { GuestbookBoard } from "@/components/GuestbookBoard";
import { HitCounter } from "@/components/HitCounter";
import { MobileMenu } from "@/components/MobileMenu";

export const metadata: Metadata = {
  title: "Guestbook",
  description: "Sign the guestbook.",
};

export default function GuestbookPage() {
  return (
    <main className="admin-page guestbook-page">
      <DeskBookmarks />
      <MobileMenu />
      <HitCounter />
      <div className="admin-shell">
        <GuestbookBoard />
      </div>
    </main>
  );
}
