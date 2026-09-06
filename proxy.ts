import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

function redirectWithCookies(url: URL, sessionResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach(({ name, value }) => {
    redirectResponse.cookies.set(name, value);
  });
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLogin = pathname === "/admin/login";

  if (!isAdminPath) {
    return supabaseResponse;
  }

  const role =
    user && typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role
      : null;
  const isAdmin = role === "admin";

  if (!user) {
    if (isLogin) {
      return supabaseResponse;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    return redirectWithCookies(loginUrl, supabaseResponse);
  }

  if (!isAdmin) {
    await supabase.auth.signOut();
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "admin_error=1";
    return redirectWithCookies(homeUrl, supabaseResponse);
  }

  if (isLogin) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    adminUrl.search = "";
    return redirectWithCookies(adminUrl, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|css)$).*)",
  ],
};
