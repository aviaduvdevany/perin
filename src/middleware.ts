import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Add custom middleware logic here if needed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect all routes under /api except auth routes
        if (req.nextUrl.pathname.startsWith("/api/")) {
          // Allow auth routes
          if (req.nextUrl.pathname.startsWith("/api/auth/")) {
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
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"],
};
