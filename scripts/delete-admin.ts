import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const raw = process.argv.slice(2).find((arg) => arg !== "--");
  const email = raw?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    console.error("Usage: npm run delete-admin -- you@gmail.com");
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

  const { error, count } = await supabase
    .from("admin_allowlist")
    .delete({ count: "exact" })
    .eq("email", email);

  if (error) {
    console.error("Failed to remove from allowlist:", error.message);
    process.exit(1);
  }

  if ((count ?? 0) === 0) {
    console.log(`No allowlist row for ${email} (already absent).`);
  } else {
    console.log(`Removed ${email} from admin_allowlist.`);
  }

  // Clear app_metadata.role on an existing Auth user so JWT/admin checks fail.
  let cleared = false;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error: listError } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (listError) {
      console.error(
        "Allowlist updated, but listing users failed:",
        listError.message,
      );
      process.exit(1);
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );
    if (match) {
      const { role: _removed, ...rest } = match.app_metadata ?? {};
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        match.id,
        {
          // Merge: explicit null clears role; rest keeps other app_metadata keys.
          app_metadata: { ...rest, role: null },
        },
      );
      if (updateError) {
        console.error(
          "Allowlist updated, but failed to clear app_metadata.role:",
          updateError.message,
        );
        process.exit(1);
      }
      cleared = true;
      break;
    }

    if (data.users.length < 200) {
      break;
    }
  }

  if (cleared) {
    console.log("Cleared app_metadata.role on existing Auth user.");
    console.log(
      "They should sign out (or wait for the session to refresh) before admin access is gone.",
    );
  } else {
    console.log("No existing Auth user with that email; allowlist-only change.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
