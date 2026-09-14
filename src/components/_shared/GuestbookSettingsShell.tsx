import { CustomTheme } from "@/components/_shared/CustomTheme";
import {
  GuestbookSettingsProvider,
  type GuestbookSettings,
} from "@/lib/guestbookSettings";

export function GuestbookSettingsShell({
  settings,
  children,
}: {
  settings: GuestbookSettings;
  children: React.ReactNode;
}) {
  return (
    <GuestbookSettingsProvider initialSettings={settings}>
      {children}
      <CustomTheme />
    </GuestbookSettingsProvider>
  );
}
