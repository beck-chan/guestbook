"use client";

import {
  guestbookDisplayTitle,
  useGuestbookSettings,
} from "@/lib/guestbookSettings";

export function GuestbookTitle() {
  const [settings] = useGuestbookSettings();
  const title = guestbookDisplayTitle(settings.title);

  return (
    <h1 className={`guestbook-title${settings.marquee ? "" : " is-static"}`}>
      {settings.marquee ? (
        <span className="demobook-marquee">{title}</span>
      ) : (
        title
      )}
    </h1>
  );
}
