import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function siteUrl() {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) {
    throw new Error("SITE_URL is not configured.");
  }
  return raw.replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const cookieJar: {
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((cookie) => {
            const index = cookieJar.findIndex((entry) => entry.name === cookie.name);
            if (index >= 0) {
              cookieJar[index] = cookie;
            } else {
              cookieJar.push(cookie);
            }
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  const response = NextResponse.redirect(
    error || !data.url
      ? new URL("/?admin_error=1", request.url)
      : data.url,
  );

  for (const { name, value, options } of cookieJar) {
    response.cookies.set(name, value, options);
  }

  return response;
}
