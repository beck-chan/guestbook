import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function siteUrl() {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) {
    throw new Error("SITE_URL is not configured.");
  }
  return raw.replace(/\/$/, "");
}

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const redirectTo = `${siteUrl()}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error || !data.url) {
    redirect("/?admin_error=1");
  }

  redirect(data.url);
}
