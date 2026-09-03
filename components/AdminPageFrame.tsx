"use client";

import {
  guestbookThemeVars,
  useGuestbookSettings,
} from "@/lib/guestbookSettings";

export function AdminPageFrame({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const [settings] = useGuestbookSettings();

  return (
    <main
      className={`${className} guestbook-themed`}
      style={guestbookThemeVars(settings)}
    >
      {children}
    </main>
  );
}
