import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security configuration
const SECURITY_CONFIG = {
  AI_ENDPOINTS: ["/api/ai/chat", "/api/ai/memory", "/api/ai/classify"],
  RATE_LIMITS: {
    "/api/ai/chat": { requests: 10, windowMs: 60000 }, // 10 requests per minute
    "/api/ai/memory": { requests: 20, windowMs: 60000 }, // 20 requests per minute
    "/api/ai/classify": { requests: 30, windowMs: 60000 }, // 30 requests per minute
  },
  MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
  TIMEOUT_MS: 30000, // 30 seconds
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Check if this is an AI endpoint
  const isAIEndpoint = SECURITY_CONFIG.AI_ENDPOINTS.some((endpoint) =>
    request.nextUrl.pathname.startsWith(endpoint)
  );

  if (isAIEndpoint) {
    // Authentication check for AI endpoints
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(request, token.sub as string);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          ),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
            ),
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": String(
              Math.max(0, rateLimitResult.limit - rateLimitResult.count)
            ),
            "X-RateLimit-Reset": String(rateLimitResult.resetTime),
          },
        }
      );
    }

    // Request size validation
    const contentLength = request.headers.get("content-length");
    if (
      contentLength &&
      parseInt(contentLength) > SECURITY_CONFIG.MAX_REQUEST_SIZE
    ) {
      return NextResponse.json(
        { error: "Request payload too large" },
        { status: 413 }
      );
    }

    // Add rate limit headers to successful requests
    response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
    response.headers.set(
      "X-RateLimit-Remaining",
      String(Math.max(0, rateLimitResult.limit - rateLimitResult.count))
    );
    response.headers.set(
      "X-RateLimit-Reset",
      String(rateLimitResult.resetTime)
    );
  }

  return response;
}

function checkRateLimit(
  request: NextRequest,
  userId: string
): {
  allowed: boolean;
  count: number;
  limit: number;
  resetTime: number;
} {
  const endpoint = request.nextUrl.pathname;
  const limits = SECURITY_CONFIG.RATE_LIMITS;

  // Find matching rate limit config
  let config = { requests: 100, windowMs: 60000 }; // Default
  for (const [path, pathConfig] of Object.entries(limits)) {
    if (endpoint.startsWith(path)) {
      config = pathConfig;
      break;
    }
  }

  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry || entry.resetTime <= now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  // Clean up old entries (simple cleanup)
  if (Math.random() < 0.01) {
    // 1% chance to cleanup
    cleanupRateLimitStore();
  }

  return {
    allowed: entry.count <= config.requests,
    count: entry.count,
    limit: config.requests,
    resetTime: entry.resetTime,
  };
}

function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
