import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_GUESTBOOK_SETTINGS,
  normalizeGuestbookSettings,
  type GuestbookSettings,
  type GuestbookSettingsRow,
} from "@/lib/guestbookSettingsShared";

export async function loadGuestbookSettings(): Promise<GuestbookSettings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("guestbook_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      return { ...DEFAULT_GUESTBOOK_SETTINGS };
    }

    return normalizeGuestbookSettings(data as GuestbookSettingsRow);
  } catch {
    return { ...DEFAULT_GUESTBOOK_SETTINGS };
  }
}
