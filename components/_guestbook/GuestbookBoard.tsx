"use client";

import { CommentBubbles } from "@/components/_shared/CommentBubbles";
import { GuestbookTitle } from "@/components/_guestbook/GuestbookTitle";
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
