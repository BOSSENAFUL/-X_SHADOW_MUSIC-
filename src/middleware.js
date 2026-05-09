import { NextResponse } from "next/server";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  try {
    // Check for NextAuth session cookie (much faster than getToken)
    const sessionToken =
      req.cookies.get("next-auth.session-token") ||
      req.cookies.get("__Secure-next-auth.session-token");

    const hasSession = !!sessionToken;

    // Public routes (auth pages) - accessible when NOT logged in
    const publicRoutes = [
      "/",
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ];

    // Private routes - require authentication
    const isPrivateRoute =
      pathname.startsWith("/music") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/settings");

    if (!hasSession) {
      if (isPrivateRoute) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    } else {
      if (publicRoutes.includes(pathname)) {
        return NextResponse.redirect(new URL("/music", req.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    // On error, redirect to login for safety
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - /public/ folder files
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/|public/).*)",
  ],
};
