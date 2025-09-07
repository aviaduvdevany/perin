# Token Security Audit

## Current Token Storage Implementation

### Database Schema

```sql
-- From src/lib/tables.ts:5
export const USER_INTEGRATIONS_TABLE = "user_integrations";

-- From src/lib/queries/integrations.ts:4-18
export interface UserIntegration {
  id: string;
  user_id: string;
  integration_type: string;
  access_token: string;        -- ⚠️ STORED IN PLAIN TEXT
  refresh_token: string | null; -- ⚠️ STORED IN PLAIN TEXT
  token_expires_at: string;
  scopes: string[];
  connected_at: string;
  last_sync_at: string | null;
  is_active: boolean;
  account_email?: string | null;
  account_label?: string | null;
  metadata: Record<string, unknown>;
}
```

### Token Storage Code

```typescript
// From src/lib/queries/integrations.ts:42-149
export const createUserIntegration = async (
  userId: string,
  integrationType: string,
  accessToken: string, // ⚠️ Stored directly without encryption
  refreshToken: string | null, // ⚠️ Stored directly without encryption
  expiresAt: Date,
  scopes: string[],
  metadata: Record<string, unknown> = {},
  accountEmail?: string | null,
  accountLabel?: string | null
): Promise<UserIntegration> => {
  // Tokens stored directly in database without encryption
  const result = await query(sql, [
    userId,
    integrationType,
    accessToken, // ⚠️ Plain text storage
    refreshToken, // ⚠️ Plain text storage
    expiresAt.toISOString(),
    scopes,
    JSON.stringify(metadata),
    accountEmail || null,
    accountLabel || null,
  ]);
  return result.rows[0];
};
```

## Security Issues Identified

### ❌ CRITICAL: Tokens Not Encrypted at Rest

**Issue:** OAuth access and refresh tokens are stored in plain text in the database.

**Risk Level:** HIGH

- Database breach would expose all user OAuth tokens
- Tokens could be used to access user's Google data
- Violates Google OAuth security requirements

**Evidence:**

```typescript
// From src/lib/integrations/gmail/client.ts:54-58
oauth2Client.setCredentials({
  access_token: integration.access_token, // Retrieved as plain text
  refresh_token: integration.refresh_token, // Retrieved as plain text
});
```

### ❌ MISSING: Token Revocation

**Issue:** No Google token revocation when users disconnect integrations.

**Risk Level:** MEDIUM

- Tokens remain valid even after disconnect
- Potential unauthorized access if tokens are compromised

**Current Disconnect Implementation:**

```typescript
// From src/lib/integrations/service.ts:263-286
export const disconnectIntegration = async (
  userId: string,
  typeOrId: IntegrationType | { id: string }
): Promise<boolean> => {
  // Only deactivates in database, doesn't revoke with Google
  await integrationQueries.deactivateIntegration(userId, typeOrId);
  return true;
};
```

### ⚠️ PARTIAL: HTTPS/TLS Enforcement

**Status:** ✅ HTTPS enforced in production (Vercel)
**Status:** ⚠️ Development allows HTTP

**Evidence:**

```typescript
// From src/lib/integrations/oauth2-manager.ts:125-129
const finalRedirectUri =
  redirectUri ||
  process.env[`GOOGLE_${integrationType.toUpperCase()}_REDIRECT_URI`] ||
  process.env.GOOGLE_REDIRECT_URI ||
  `http://localhost:3000/api/integrations/${integrationType}/callback`; // ⚠️ HTTP in dev
```

### ✅ PASS: Secure Cookies

**Status:** ✅ NextAuth uses secure session management

```typescript
// From src/lib/auth.ts:57-59
session: {
  strategy: "jwt",
},
```

### ✅ PASS: Token Refresh Logic

**Status:** ✅ Proper token refresh implementation

```typescript
// From src/lib/integrations/gmail/client.ts:24-52
if (now >= expiresAt && integration.refresh_token) {
  try {
    const newTokens = await refreshGmailToken(integration.refresh_token);
    await integrationQueries.updateIntegrationTokens(
      integration.id,
      newTokens.access_token!,
      newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
    );
  } catch (error) {
    // Handle invalid grant errors
  }
}
```

## Required Security Fixes

### 1. Token Encryption Implementation

**Create:** `src/lib/utils/token-encryption.ts`

```typescript
import { createCipherGCM, createDecipherGCM, randomBytes } from "crypto";

const ENCRYPTION_KEY = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";

if (!ENCRYPTION_KEY) {
  throw new Error(
    "OAUTH_TOKEN_ENCRYPTION_KEY environment variable is required"
  );
}

export const encryptToken = (token: string): string => {
  const iv = randomBytes(16);
  const cipher = createCipherGCM(ALGORITHM, Buffer.from(ENCRYPTION_KEY, "hex"));
  cipher.setAAD(Buffer.from("perin-oauth-token"));

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
};

export const decryptToken = (encryptedToken: string): string => {
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipherGCM(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "hex")
  );
  decipher.setAAD(Buffer.from("perin-oauth-token"));
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
```

### 2. Update Integration Queries

**Modify:** `src/lib/queries/integrations.ts`

```typescript
import { encryptToken, decryptToken } from "@/lib/utils/token-encryption";

export const createUserIntegration = async (
  userId: string,
  integrationType: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date,
  scopes: string[],
  metadata: Record<string, unknown> = {},
  accountEmail?: string | null,
  accountLabel?: string | null
): Promise<UserIntegration> => {
  // Encrypt tokens before storage
  const encryptedAccessToken = encryptToken(accessToken);
  const encryptedRefreshToken = refreshToken
    ? encryptToken(refreshToken)
    : null;

  const result = await query(sql, [
    userId,
    integrationType,
    encryptedAccessToken, // ✅ Encrypted storage
    encryptedRefreshToken, // ✅ Encrypted storage
    expiresAt.toISOString(),
    scopes,
    JSON.stringify(metadata),
    accountEmail || null,
    accountLabel || null,
  ]);

  // Return with decrypted tokens for immediate use
  const integration = result.rows[0];
  return {
    ...integration,
    access_token: accessToken, // Return decrypted for immediate use
    refresh_token: refreshToken, // Return decrypted for immediate use
  };
};

export const getUserIntegration = async (
  userId: string,
  integrationType: string
): Promise<UserIntegration | null> => {
  const result = await query(sql, [userId, integrationType]);
  if (!result.rows[0]) return null;

  const integration = result.rows[0];
  return {
    ...integration,
    access_token: decryptToken(integration.access_token),
    refresh_token: integration.refresh_token
      ? decryptToken(integration.refresh_token)
      : null,
  };
};
```

### 3. Token Revocation Implementation

**Create:** `src/lib/integrations/token-revocation.ts`

```typescript
export const revokeGoogleToken = async (
  accessToken: string
): Promise<boolean> => {
  try {
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `token=${accessToken}`,
    });

    return response.ok;
  } catch (error) {
    console.error("Error revoking Google token:", error);
    return false;
  }
};

export const revokeAllGoogleTokens = async (
  integrations: UserIntegration[]
): Promise<void> => {
  const googleIntegrations = integrations.filter(
    (integration) =>
      integration.integration_type === "gmail" ||
      integration.integration_type === "calendar"
  );

  await Promise.all(
    googleIntegrations.map((integration) =>
      revokeGoogleToken(integration.access_token)
    )
  );
};
```

### 4. Update Disconnect Flow

**Modify:** `src/lib/integrations/service.ts`

```typescript
import { revokeGoogleToken } from "./token-revocation";

export const disconnectIntegration = async (
  userId: string,
  typeOrId: IntegrationType | { id: string }
): Promise<boolean> => {
  try {
    let integration: UserIntegration | null = null;

    if (typeof typeOrId === "string") {
      integration = await integrationQueries.getUserIntegration(
        userId,
        typeOrId
      );
    } else {
      // Get integration by ID
      const integrations = await integrationQueries.getUserIntegrations(userId);
      integration = integrations.find((i) => i.id === typeOrId.id) || null;
    }

    if (!integration) return false;

    // Revoke Google tokens if applicable
    if (
      integration.integration_type === "gmail" ||
      integration.integration_type === "calendar"
    ) {
      await revokeGoogleToken(integration.access_token);
    }

    // Deactivate in database
    if (typeof typeOrId === "string") {
      await integrationQueries.deactivateIntegration(userId, typeOrId);
    } else {
      await integrationQueries.deactivateIntegrationById(typeOrId.id, userId);
    }

    return true;
  } catch (error) {
    console.error(`Error disconnecting integration:`, error);
    return false;
  }
};
```

## Environment Variables Required

Add to `.env`:

```bash
# Generate with: openssl rand -hex 32
OAUTH_TOKEN_ENCRYPTION_KEY=your-32-byte-hex-key-here
```

## Security Headers Verification

### ✅ Current Security Headers

```typescript
// From src/middleware.ts:23-27
response.headers.set("X-Content-Type-Options", "nosniff");
response.headers.set("X-Frame-Options", "DENY");
response.headers.set("X-XSS-Protection", "1; mode=block");
response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
```

### ⚠️ Missing Security Headers

```typescript
// Add these headers:
response.headers.set(
  "Strict-Transport-Security",
  "max-age=31536000; includeSubDomains"
);
response.headers.set(
  "Permissions-Policy",
  "geolocation=(), microphone=(), camera=()"
);
response.headers.set(
  "Content-Security-Policy",
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com https://oauth2.googleapis.com https://gmail.googleapis.com https://www.googleapis.com;"
);
```

## Rate Limiting Status

### ✅ Current Rate Limiting

```typescript
// From src/middleware.ts:11-15
RATE_LIMITS: {
  "/api/ai/chat": { requests: 10, windowMs: 60000 },
  "/api/ai/memory": { requests: 20, windowMs: 60000 },
  "/api/ai/classify": { requests: 30, windowMs: 60000 },
}
```

### ⚠️ Missing Rate Limiting

- Gmail API endpoints
- Calendar API endpoints
- OAuth callback endpoints

## Summary

**Critical Issues:**

1. ❌ OAuth tokens not encrypted at rest
2. ❌ No token revocation on disconnect
3. ⚠️ Missing some security headers
4. ⚠️ Missing rate limiting on Google API endpoints

**Required Actions:**

1. Implement token encryption (HIGH PRIORITY)
2. Add token revocation (MEDIUM PRIORITY)
3. Add missing security headers (MEDIUM PRIORITY)
4. Add rate limiting to Google API endpoints (LOW PRIORITY)
