import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("qulf_access")?.value;
  const { pathname } = request.nextUrl;

  // Static assets and internal next routes
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".");

  if (isPublicAsset) {
    return NextResponse.next();
  }

  const isAuthRoute = pathname.startsWith("/login");

  // Root path: redirect to dashboard if authenticated, or login if not
  if (pathname === "/") {
    return NextResponse.redirect(new URL(token ? "/dashboard" : "/login", request.url));
  }

  // If already authenticated and accessing login, redirect to dashboard
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If unauthenticated and accessing protected routes, redirect to login
  if (!isAuthRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
