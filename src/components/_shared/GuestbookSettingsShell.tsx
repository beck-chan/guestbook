import { CustomTheme } from "@/components/_shared/CustomTheme";
import { GuestbookSettingsProvider } from "@/lib/guestbookSettings";
import { loadGuestbookSettings } from "@/lib/loadGuestbookSettings";

export async function GuestbookSettingsShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await loadGuestbookSettings();

  return (
    <GuestbookSettingsProvider initialSettings={settings}>
      {children}
      <CustomTheme />
    </GuestbookSettingsProvider>
  );
}
