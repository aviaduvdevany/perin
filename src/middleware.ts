import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const publicRoutes = ["/api/health"];
const protectedRoutes = ["/dashboard", "/onboarding"];
const authRoutes = ["/api/auth/"];

const isPublicRoute = (path: string) => {
  return publicRoutes.includes(path);
};

const isProtectedRoute = (path: string) => {
  return protectedRoutes.includes(path);
};

const isAuthRoute = (path: string) => {
  return authRoutes.includes(path);
};

export default withAuth(
  function middleware() {
    // Add custom middleware logic here if needed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect all routes under /api except auth routes
        if (isPublicRoute(req.nextUrl.pathname)) {
          // Allow auth routes
          if (isAuthRoute(req.nextUrl.pathname)) {
            return true;
          }

          // Allow health check
          if (req.nextUrl.pathname === "/api/health") {
            return true;
          }

          // Require authentication for other API routes
          return !!token;
        }

        // Protect dashboard and other protected pages
        if (isProtectedRoute(req.nextUrl.pathname)) {
          return !!token;
        }

        return false;
      },
    },
  }
);

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/onboarding/:path*"],
};
