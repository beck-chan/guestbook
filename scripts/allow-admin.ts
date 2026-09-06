import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const raw = process.argv.slice(2).find((arg) => arg !== "--");
  const email = raw?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    console.error("Usage: npm run allow-admin -- you@gmail.com");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("admin_allowlist").upsert({ email });

  if (error) {
    console.error("Failed to allow admin:", error.message);
    process.exit(1);
  }

  console.log(`Allowed admin: ${email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
