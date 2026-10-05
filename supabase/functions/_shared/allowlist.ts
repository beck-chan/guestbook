import { createClient } from "npm:@supabase/supabase-js@2";

function namedSecretKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const preferred = parsed.default;
    if (typeof preferred === "string" && preferred.trim()) return preferred.trim();
    for (const value of Object.values(parsed)) {
      if (typeof value === "string" && value.startsWith("sb_secret_")) return value;
    }
  } catch {
    return "";
  }
  return "";
}

async function readEmails(url: string, key: string): Promise<string[] | null> {
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from("admin_allowlist").select("email");
  if (error || !data) return null;
  return data
    .map((row) =>
      typeof row.email === "string" ? row.email.trim().toLowerCase() : "",
    )
    .filter((email) => email.includes("@"));
}

export async function loadAllowlist(): Promise<string[]> {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) return [];

  const secret = namedSecretKey();
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (secret) {
    const emails = await readEmails(url, secret);
    if (emails) return emails;
  }
  if (legacy && legacy !== secret) {
    const emails = await readEmails(url, legacy);
    if (emails) return emails;
  }
  return [];
}
