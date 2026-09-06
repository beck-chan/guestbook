import type { SupabaseClient } from "@supabase/supabase-js";

function roleOf(user: { app_metadata?: Record<string, unknown> } | null) {
  const role = user?.app_metadata?.role;
  return typeof role === "string" ? role : null;
}

/** True when JWT already has role=admin, or allowlist stamp + refresh succeeded. */
export async function resolveAdminSession(
  supabase: SupabaseClient,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }
  if (roleOf(user) === "admin") {
    return true;
  }

  const { data, error } = await supabase.rpc("ensure_admin_role");
  if (error || data !== true) {
    return false;
  }

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return false;
  }

  const {
    data: { user: refreshed },
  } = await supabase.auth.getUser();
  return roleOf(refreshed) === "admin";
}
