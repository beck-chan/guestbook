import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const role =
        user && typeof user.app_metadata?.role === "string"
          ? user.app_metadata.role
          : null;

      if (role === "admin") {
        return NextResponse.redirect(new URL(next, origin));
      }

      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/?admin_error=1", origin));
    }
  }

  return NextResponse.redirect(new URL("/?admin_error=1", origin));
}
