import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveAdminSession } from "@/lib/adminAuth";
import { guestbookAdminPath } from "@/lib/guestbookPaths";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const adminPath = guestbookAdminPath();
  const nextParam = searchParams.get("next") ?? adminPath;
  const next = nextParam.startsWith("/") ? nextParam : adminPath;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const appOrigin =
    !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;

  if (!code) {
    return NextResponse.redirect(new URL("/?admin_error=1", appOrigin));
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/?admin_error=1", appOrigin));
  }

  const isAdmin = await resolveAdminSession(supabase);
  if (!isAdmin) {
    await supabase.auth.signOut();
  }

  const response = NextResponse.redirect(
    new URL(isAdmin ? next : "/?admin_error=1", appOrigin),
  );

  for (const { name, value, options } of cookieJar) {
    response.cookies.set(name, value, options);
  }

  return response;
}
