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
  return authRoutes.some((route) => path.startsWith(route));
};

const isApiRoute = (path: string) => {
  return path.startsWith("/api/");
};

export default withAuth(
  function middleware() {
    // Add custom middleware logic here if needed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Allow public routes (like health check)
        if (isPublicRoute(path)) {
          return true;
        }

        // Allow auth routes
        if (isAuthRoute(path)) {
          return true;
        }

        // Require authentication for all other API routes
        if (isApiRoute(path)) {
          return !!token;
        }

        // Require authentication for protected pages
        if (isProtectedRoute(path)) {
          return !!token;
        }

        // Allow all other routes (like home page, etc.)
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/onboarding/:path*"],
};
