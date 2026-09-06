import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_GUESTBOOK_SETTINGS,
  guestbookSettingsToRow,
  normalizeGuestbookSettings,
  type GuestbookSettings,
  type GuestbookSettingsRow,
} from "@/lib/guestbookSettingsShared";

export type { GuestbookSettingsRow };

export function mapSettingsRow(
  row: GuestbookSettingsRow | null | undefined,
): GuestbookSettings {
  return normalizeGuestbookSettings(row);
}

export { guestbookSettingsToRow as settingsToRow };

export async function fetchSettings(
  supabase: SupabaseClient,
): Promise<GuestbookSettings> {
  const { data, error } = await supabase
    .from("guestbook_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return { ...DEFAULT_GUESTBOOK_SETTINGS };
  }

  return mapSettingsRow(data as GuestbookSettingsRow);
}

export async function updateSettings(
  supabase: SupabaseClient,
  settings: GuestbookSettings,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("guestbook_settings")
    .update(guestbookSettingsToRow(settings))
    .eq("id", 1);

  if (error) {
    return { error: error.message || "Could not save settings." };
  }

  return {};
}
