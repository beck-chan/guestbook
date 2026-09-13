import { GuestbookSettingsShell } from "@/components/_shared/GuestbookSettingsShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestbookSettingsShell>{children}</GuestbookSettingsShell>;
}
