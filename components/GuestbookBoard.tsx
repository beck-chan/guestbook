"use client";

import { CommentBubbles } from "@/components/CommentBubbles";
import { GuestbookTitle } from "@/components/GuestbookTitle";
import {
  guestbookPageSize,
  guestbookThemeVars,
  useGuestbookSettings,
} from "@/lib/guestbookSettings";

export function GuestbookBoard() {
  const [settings] = useGuestbookSettings();

  return (
    <div className="guestbook-themed" style={guestbookThemeVars(settings)}>
      <GuestbookTitle />
      <CommentBubbles showHits={false} limit={guestbookPageSize(settings.pageSize)} />
    </div>
  );
}
