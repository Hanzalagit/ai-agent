import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect ALL /admin routes (except /admin/login and /api/admin/*)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = request.cookies.get("admin_session")?.value;

    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      const parsed = JSON.parse(session);
      if (!parsed.email) {
        // Invalid session - clear and redirect
        const response = NextResponse.redirect(new URL("/admin/login", request.url));
        response.cookies.set("admin_session", "", { path: "/", maxAge: 0 });
        return response;
      }
    } catch {
      // Corrupted session - clear and redirect
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.set("admin_session", "", { path: "/", maxAge: 0 });
      return response;
    }

    // No-cache headers - back button se cached page na dikhe
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");
    return response;
  }

  // Login page pe bhi no-cache
  if (pathname === "/admin/login") {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
