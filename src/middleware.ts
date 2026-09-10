import { NextResponse, type NextRequest } from "next/server";

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    return (
      cookie.name === "authjs.session-token" ||
      cookie.name === "__Secure-authjs.session-token" ||
      cookie.name.startsWith("authjs.session-token.") ||
      cookie.name.startsWith("__Secure-authjs.session-token.")
    );
  });
}

function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/403";
}

/**
 * Edge-safe redirects only. Does not read Prisma or `isActive`.
 * Authorization is enforced in Node via `requireActiveUser()`.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const signedIn = hasSessionCookie(request);

  if (!signedIn && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (signedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
