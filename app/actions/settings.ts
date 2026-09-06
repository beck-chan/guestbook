"use server";

import { revalidatePath } from "next/cache";
import {
  guestbookSettingsToRow,
  type GuestbookSettings,
} from "@/lib/guestbookSettingsShared";
import { loadGuestbookSettings } from "@/lib/loadGuestbookSettings";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionResult =
  | { ok: true; settings: GuestbookSettings }
  | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role =
    user && typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role
      : null;
  if (!user || role !== "admin") {
    return { supabase: null, error: "Not authorized." as const };
  }
  return { supabase, error: null };
}

export async function fetchGuestbookSettings(): Promise<GuestbookSettings> {
  return loadGuestbookSettings();
}

export async function saveGuestbookSettings(
  settings: GuestbookSettings,
): Promise<SettingsActionResult> {
  const { supabase, error: authError } = await requireAdmin();
  if (!supabase) {
    return { ok: false, error: authError };
  }

  const row = guestbookSettingsToRow(settings);
  const { error } = await supabase
    .from("guestbook_settings")
    .update(row)
    .eq("id", 1);

  if (error) {
    return { ok: false, error: error.message };
  }

  const next = await loadGuestbookSettings();
  revalidatePath("/");
  revalidatePath("/guestbook");
  revalidatePath("/admin");
  return { ok: true, settings: next };
}

export async function loadGuestbookSettingsAction(): Promise<GuestbookSettings> {
  return loadGuestbookSettings();
}

export async function saveGuestbookSettingsAction(
  settings: GuestbookSettings,
): Promise<SettingsActionResult> {
  return saveGuestbookSettings(settings);
}

