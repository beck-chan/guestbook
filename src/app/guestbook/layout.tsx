import { GuestbookSettingsShell } from "@/components/_shared/GuestbookSettingsShell";

export default function GuestbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestbookSettingsShell>{children}</GuestbookSettingsShell>;
}
