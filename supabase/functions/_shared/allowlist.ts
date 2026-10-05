import { createClient } from "npm:@supabase/supabase-js@2";

export async function loadAllowlist(): Promise<string[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  let key = "";
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { default?: string };
      key = typeof parsed.default === "string" ? parsed.default : "";
    } catch {
      key = "";
    }
  }
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
