"use client";

import { CommentBubbles } from "@/components/_shared/CommentBubbles";
import { GuestbookTitle } from "@/components/_guestbook/GuestbookTitle";
import type { GuestbookComment } from "@/lib/comments";
import {
  guestbookPageSize,
  guestbookThemeVars,
  useGuestbookSettings,
} from "@/lib/guestbookSettings";

type GuestbookBoardProps = {
  initialComments: GuestbookComment[];
  initialPage: number;
  initialTotalPages: number;
};

export function GuestbookBoard({
  initialComments,
  initialPage,
  initialTotalPages,
}: GuestbookBoardProps) {
  const [settings] = useGuestbookSettings();

  return (
    <div className="guestbook-themed" style={guestbookThemeVars(settings)}>
      <GuestbookTitle />
      <CommentBubbles
        showHits={false}
        limit={guestbookPageSize(settings.pageSize)}
        initialComments={initialComments}
        initialPage={initialPage}
        initialTotalPages={initialTotalPages}
      />
    </div>
  );
}
