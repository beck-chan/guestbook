"use client";

import {
  guestbookDisplayTitle,
  useGuestbookDocumentTitle,
  useGuestbookSettings,
} from "@/lib/guestbookSettings";

export function GuestbookTitle() {
  const [settings] = useGuestbookSettings();
  const title = guestbookDisplayTitle(settings.title);
  useGuestbookDocumentTitle(title);

  return (
    <>
      <title>{title}</title>
      <h1 className={`guestbook-title${settings.marquee ? "" : " is-static"}`}>
        {settings.marquee ? (
          <span className="guestbook-marquee">{title}</span>
        ) : (
          title
        )}
      </h1>
    </>
  );
}
