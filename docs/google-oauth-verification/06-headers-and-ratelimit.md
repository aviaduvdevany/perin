# Security Headers & Rate Limiting Audit

## Current Security Headers Implementation

### ✅ PASS - Basic Security Headers

**Middleware Implementation:**

```typescript
// From src/middleware.ts:23-27
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}
```

**Current Headers:**

- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: DENY`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`

### ❌ MISSING - Critical Security Headers

**Missing Headers:**

- ❌ `Strict-Transport-Security` (HSTS)
- ❌ `Permissions-Policy`
- ❌ `Content-Security-Policy`

## Rate Limiting Analysis

### ✅ PASS - AI Endpoint Rate Limiting

**Current Implementation:**

```typescript
// From src/middleware.ts:11-15
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
```

**Rate Limiting Features:**

- ✅ Per-user rate limiting
- ✅ Per-endpoint configuration
- ✅ Rate limit headers in response
- ✅ Proper error responses (429)

### ❌ MISSING - Google API Endpoint Rate Limiting

**Missing Rate Limits:**

- ❌ Gmail API endpoints (`/api/integrations/gmail/*`)
- ❌ Calendar API endpoints (`/api/integrations/calendar/*`)
- ❌ OAuth callback endpoints (`/api/integrations/*/callback`)

## Required Security Improvements

### 1. Enhanced Security Headers

**Update Middleware:**

```typescript
// Enhanced security headers implementation
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Basic security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Enhanced security headers
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );

  // Content Security Policy for Google APIs
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.openai.com https://oauth2.googleapis.com https://gmail.googleapis.com https://www.googleapis.com https://calendar.googleapis.com",
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
}
```

### 2. Google API Rate Limiting

**Enhanced Rate Limiting Configuration:**

```typescript
// From src/middleware.ts - Enhanced configuration
const SECURITY_CONFIG = {
  AI_ENDPOINTS: ["/api/ai/chat", "/api/ai/memory", "/api/ai/classify"],
  GOOGLE_API_ENDPOINTS: [
    "/api/integrations/gmail/emails",
    "/api/integrations/gmail/connect",
    "/api/integrations/gmail/callback",
    "/api/integrations/calendar/events",
    "/api/integrations/calendar/availability",
    "/api/integrations/calendar/connect",
    "/api/integrations/calendar/callback",
  ],
  RATE_LIMITS: {
    // AI endpoints
    "/api/ai/chat": { requests: 10, windowMs: 60000 },
    "/api/ai/memory": { requests: 20, windowMs: 60000 },
    "/api/ai/classify": { requests: 30, windowMs: 60000 },

    // Google API endpoints
    "/api/integrations/gmail/emails": { requests: 30, windowMs: 60000 },
    "/api/integrations/gmail/connect": { requests: 5, windowMs: 60000 },
    "/api/integrations/gmail/callback": { requests: 10, windowMs: 60000 },
    "/api/integrations/calendar/events": { requests: 50, windowMs: 60000 },
    "/api/integrations/calendar/availability": {
      requests: 100,
      windowMs: 60000,
    },
    "/api/integrations/calendar/connect": { requests: 5, windowMs: 60000 },
    "/api/integrations/calendar/callback": { requests: 10, windowMs: 60000 },
  },
  MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
  TIMEOUT_MS: 30000, // 30 seconds
};
```

**Enhanced Rate Limiting Logic:**

```typescript
// Enhanced rate limiting check
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

  // Check for exact match first
  if (limits[endpoint]) {
    config = limits[endpoint];
  } else {
    // Check for prefix match
    for (const [path, pathConfig] of Object.entries(limits)) {
      if (endpoint.startsWith(path)) {
        config = pathConfig;
        break;
      }
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
    cleanupRateLimitStore();
  }

  return {
    allowed: entry.count <= config.requests,
    count: entry.count,
    limit: config.requests,
    resetTime: entry.resetTime,
  };
}
```

### 3. Enhanced Middleware Logic

**Complete Enhanced Middleware:**

```typescript
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Enhanced security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.openai.com https://oauth2.googleapis.com https://gmail.googleapis.com https://www.googleapis.com https://calendar.googleapis.com",
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);

  // Check if this is a protected endpoint
  const isProtectedEndpoint =
    SECURITY_CONFIG.AI_ENDPOINTS.some((endpoint) =>
      request.nextUrl.pathname.startsWith(endpoint)
    ) ||
    SECURITY_CONFIG.GOOGLE_API_ENDPOINTS.some((endpoint) =>
      request.nextUrl.pathname.startsWith(endpoint)
    );

  if (isProtectedEndpoint) {
    // Authentication check
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
```

## HTTPS/TLS Verification

### ✅ PASS - Production HTTPS

**Vercel Configuration:**

- ✅ HTTPS enforced in production
- ✅ Automatic SSL certificate management
- ✅ HSTS headers (to be implemented)

### ⚠️ PARTIAL - Development Configuration

**Development Setup:**

```typescript
// From src/lib/integrations/oauth2-manager.ts:125-129
const finalRedirectUri =
  redirectUri ||
  process.env[`GOOGLE_${integrationType.toUpperCase()}_REDIRECT_URI`] ||
  process.env.GOOGLE_REDIRECT_URI ||
  `http://localhost:3000/api/integrations/${integrationType}/callback`; // ⚠️ HTTP in dev
```

**Status:** HTTP allowed in development (acceptable for local testing).

## Security Assessment

### Current Security Score: 6/10

**Strengths:**

- ✅ Basic security headers implemented
- ✅ AI endpoint rate limiting
- ✅ Authentication checks on protected endpoints
- ✅ Request size validation
- ✅ HTTPS in production

**Critical Gaps:**

- ❌ Missing HSTS headers
- ❌ Missing CSP headers
- ❌ Missing Permissions-Policy
- ❌ No rate limiting on Google API endpoints
- ❌ No rate limiting on OAuth callbacks

## Implementation Priority

### High Priority (Required for Google OAuth):

1. **Add HSTS headers** - Critical for production security
2. **Add CSP headers** - Required for Google API integration
3. **Add Google API rate limiting** - Prevent abuse of Google APIs

### Medium Priority:

1. **Add Permissions-Policy** - Additional security layer
2. **Enhance rate limiting logic** - Better endpoint matching
3. **Add OAuth callback rate limiting** - Prevent callback abuse

### Low Priority:

1. **Optimize rate limiting storage** - Consider Redis for production
2. **Add monitoring and alerting** - Track rate limit violations

## Summary

The current security implementation provides basic protection but lacks critical headers and Google API rate limiting required for Google OAuth verification. The proposed enhancements will bring the security score to 9/10 and meet all Google OAuth requirements.
