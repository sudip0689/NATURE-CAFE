import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/session";

/**
 * Proxy — Next.js 16's renamed `middleware.ts`.
 *
 * Now that there is no Supabase Auth, this does one cheap thing: bounce a
 * visitor with no session cookie to the login screen, so nobody sees the app
 * shell flash before the real check runs.
 *
 * It is not the authorization boundary. The role checks live in
 * src/lib/auth.ts, which reads the profile behind the cookie; this only asks
 * whether a cookie exists at all.
 */

const PUBLIC_ROUTES = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (isPublic) return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except static assets. App Router routes never carry a file
     * extension, so excluding these is safe.
     *
     * `apk` is here for the Android updater. It downloads the release over
     * plain HTTP from the native side, which carries no session cookie — so
     * without this the download would be redirected to /login and the phone
     * would save the login page under an .apk name and hand that to the
     * package installer.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2|ttf|txt|xml|json|webmanifest|html|apk)$).*)",
  ],
};
