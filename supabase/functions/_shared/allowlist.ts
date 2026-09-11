import { createClient } from "npm:@supabase/supabase-js@2";

export async function loadAllowlist(): Promise<string[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return [];

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from("admin_allowlist").select("email");
  if (error || !data) return [];

  return data
    .map((row) =>
      typeof row.email === "string" ? row.email.trim().toLowerCase() : "",
    )
    .filter((email) => email.includes("@"));
}
