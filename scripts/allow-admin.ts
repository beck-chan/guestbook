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

  // Stamp app_metadata.role on an existing Auth user (signup trigger only runs on insert).
  let stamped = false;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error: listError } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (listError) {
      console.error("Allowlist saved, but listing users failed:", listError.message);
      process.exit(1);
    }
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        match.id,
        { app_metadata: { ...match.app_metadata, role: "admin" } },
      );
      if (updateError) {
        console.error(
          "Allowlist saved, but failed to set app_metadata.role:",
          updateError.message,
        );
        process.exit(1);
      }
      stamped = true;
      break;
    }
    if (data.users.length < 200) {
      break;
    }
  }

  console.log(`Allowed admin: ${email}`);
  if (stamped) {
    console.log("Set app_metadata.role=admin on existing Auth user.");
  } else {
    console.log(
      "No existing Auth user with that email yet; role will be set on first signup.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
