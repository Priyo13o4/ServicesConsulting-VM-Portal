import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthPath, isPortalPath, routes } from "@/lib/router";

/**
 * Optimistic client navigation redirector (proxy.ts)
 * Note (AGENTS.md Rule 3): proxy.ts only does optimistic redirects to /login.
 * Real authorization MUST happen on the server in every query and action.
 */
export function proxyMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Better Auth session cookie
  // better-auth uses "better-auth.session_token" or "__Secure-better-auth.session_token"
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  const isAuthenticated = Boolean(sessionCookie?.value);

  // If unauthenticated user tries to access protected portal pages, redirect to /login
  if (!isAuthenticated && isPortalPath(pathname)) {
    const loginUrl = new URL(routes.auth.login, request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated user tries to hit login/register, redirect to dashboard
  if (isAuthenticated && isAuthPath(pathname) && pathname !== routes.auth.awaitingActivation) {
    return NextResponse.redirect(new URL(routes.portal.dashboard, request.url));
  }

  return NextResponse.next();
}
