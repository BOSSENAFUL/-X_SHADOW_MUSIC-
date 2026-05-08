import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

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

    if (!token) {
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
