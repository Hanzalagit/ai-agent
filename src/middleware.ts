import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = request.cookies.get("admin_session")?.value;

    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      const parsed = JSON.parse(session);
      if (!parsed.email) {
        const response = NextResponse.redirect(new URL("/admin/login", request.url));
        response.cookies.set("admin_session", "", { path: "/", maxAge: 0 });
        return response;
      }
    } catch {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.set("admin_session", "", { path: "/", maxAge: 0 });
      return response;
    }

    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");
    return response;
  }

  if (pathname === "/admin/login") {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");
    return response;
  }

  if (pathname.startsWith("/dashboard")) {
    const sessionToken = request.cookies.get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/chat") && !pathname.startsWith("/api/tenant") && !pathname.startsWith("/api/health") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/api/admin")) {
    const sessionToken = request.cookies.get("session_token")?.value;
    const apiKey = request.headers.get("x-api-key");

    if (!sessionToken && !apiKey) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/api/:path*"],
};
