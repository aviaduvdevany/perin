# Google Integration Guide

This comprehensive guide covers all aspects of Google OAuth integration in Perin, including secure token storage, token revocation, and OAuth scope management.

## Table of Contents

1. [Overview](#overview)
2. [Secure Token Storage](#secure-token-storage)
3. [Token Revocation](#token-revocation)
4. [OAuth Scopes Management](#oauth-scopes-management)
5. [Implementation Details](#implementation-details)
6. [Security Features](#security-features)
7. [Testing](#testing)
8. [Deployment & Migration](#deployment--migration)
9. [Troubleshooting](#troubleshooting)
10. [Compliance](#compliance)

## Overview

Perin integrates with Google services through OAuth 2.0 to provide:

- **Gmail Integration**: Read recent emails for AI context
- **Calendar Integration**: Read events and create/update calendar entries
- **Secure Token Management**: Encrypted storage and proper revocation

### Key Security Principles

- **Principle of Least Privilege**: Request only necessary OAuth scopes
- **Encryption at Rest**: All tokens encrypted using AES-256-GCM
- **Complete Revocation**: Tokens revoked on disconnect
- **Audit Logging**: All operations logged for compliance

## Secure Token Storage

### Overview

OAuth access and refresh tokens are encrypted at rest using AES-256-GCM encryption before being stored in the database. This addresses the critical security vulnerability where tokens were previously stored in plain text.

### Implementation Details

#### Encryption Algorithm

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV**: 128 bits (16 bytes) - randomly generated for each encryption
- **Authentication**: Built-in authentication tag prevents tampering

#### Key Components

##### 1. Token Encryption Utility (`src/lib/utils/token-encryption.ts`)

```typescript
// Core encryption functions
export const encryptToken = (token: string): string
export const decryptToken = (encryptedToken: string): string

// Key rotation support
export const encryptTokenWithKid = (token: string, kid?: string): EncryptedToken
export const getKeyForKid = (kid: string): string

// Encrypted token interface
export interface EncryptedToken {
  data: string;
  kid?: string; // Key ID for rotation support
}
```

##### 2. Integration Queries (`src/lib/queries/integrations.ts`)

- All token storage operations use encryption
- Tokens encrypted before database storage
- Tokens decrypted when retrieved from database
- Returns decrypted tokens for immediate use

##### 3. Runtime Validation

```typescript
// Validates encryption key presence at startup
if (!ENCRYPTION_KEY) {
  throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY environment variable is required");
}

// Validates key format (64 hex characters for AES-256)
if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
  throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string");
}
```

### Environment Setup

#### 1. Generate Encryption Key

```bash
# Generate a new encryption key (one-liner)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2. Set Environment Variable

```bash
# For local development
echo "OAUTH_TOKEN_ENCRYPTION_KEY=your-generated-key-here" >> .env.local

# For production
OAUTH_TOKEN_ENCRYPTION_KEY=your-generated-key-here
```

#### 3. Key Requirements

- Must be exactly 64 hexadecimal characters (256 bits)
- Should be cryptographically random
- Must be kept secure and never committed to version control
- Use different keys for different environments

### Security Features

#### Authentication & Integrity

- AES-GCM provides built-in authentication
- Additional AAD (Additional Authenticated Data) prevents token reuse across contexts
- Tampering detection through authentication tags

#### Key Rotation Support

- Infrastructure ready for key rotation
- Optional KID (Key ID) support for multiple keys
- Backward compatibility with existing encrypted tokens

## Token Revocation

### Overview

When users disconnect their integrations, the system:

1. **Revokes tokens** with the OAuth provider (Google)
2. **Removes encrypted tokens** and metadata from the database
3. **Logs all actions** for audit purposes
4. **Returns appropriate status codes** (200 for success, 207 for partial success)

### Implementation Details

#### 1. Enhanced Token Revocation (`src/lib/integrations/token-revocation.ts`)

```typescript
// Core revocation functions
export const revokeGoogleToken = (accessToken: string, refreshToken?: string): Promise<RevocationResult>
export const revokeIntegrationTokens = (integration: UserIntegration, userId: string): Promise<RevocationResult>
export const revokeAllGoogleTokens = (integrations: UserIntegration[], userId: string): Promise<void>

// Result tracking
export interface RevocationResult {
  success: boolean;
  accessTokenRevoked: boolean;
  refreshTokenRevoked: boolean;
  errors: string[];
  statusCodes: number[];
}

// Audit logging
export interface RevocationAuditLog {
  timestamp: string;
  userId: string;
  integrationId: string;
  integrationType: string;
  result: RevocationResult;
}
```

#### 2. Enhanced Disconnect Service (`src/lib/integrations/service.ts`)

```typescript
export const disconnectIntegrationWithRevocation = async (
  userId: string,
  typeOrId: string
): Promise<{
  success: boolean;
  revocationResult?: RevocationResult;
  error?: string;
}> => {
  // 1. Read integration data (with decrypted tokens)
  // 2. Revoke tokens with OAuth provider
  // 3. Remove data from database completely
  // 4. Return detailed results
}
```

#### 3. Updated API Endpoint (`src/app/api/integrations/route.ts`)

```typescript
// DELETE /api/integrations
export async function DELETE(request: NextRequest) {
  const result = await disconnectIntegrationWithRevocation(userId, typeOrId);
  
  if (result.success && result.revocationResult?.success) {
    return NextResponse.json({ success: true, message: "Integration disconnected and tokens revoked successfully" }, { status: 200 });
  } else if (result.success) {
    return NextResponse.json({ 
      success: false, 
      error: "Integration disconnected but token revocation failed",
      details: result.revocationResult 
    }, { status: 207 }); // Multi-Status
  }
  // ... other error handling
}
```

### Security Features

#### Token Revocation

- **Google OAuth endpoint**: `https://oauth2.googleapis.com/revoke`
- **Both token types**: Access and refresh tokens are revoked
- **Error handling**: Network failures don't prevent database cleanup
- **Audit trail**: All revocation attempts are logged

#### Data Cleanup

- **Complete removal**: Integration data is deleted, not just deactivated
- **Encrypted tokens**: Tokens are decrypted only for revocation, then removed
- **Metadata cleanup**: All Google-related metadata is removed

#### Audit Logging

- **Structured logs**: JSON format with timestamps and user IDs
- **Success/failure tracking**: Logs both successful and failed revocations
- **Error details**: Includes HTTP status codes and error messages
- **User context**: Links all actions to specific users and integrations

## OAuth Scopes Management

### Current Scope Usage

#### Gmail Integration

**Current Scopes**: ✅ **OPTIMIZED**

```typescript
// Using minimal required scope
"https://www.googleapis.com/auth/gmail.readonly"
```

**What This Scope Allows**:
- ✅ Read messages (`gmail.users.messages.list`, `gmail.users.messages.get`)
- ❌ Send messages (not implemented)
- ❌ Modify messages (not implemented)
- ❌ Delete messages (not implemented)

**Actual Operations Performed**:
- ✅ `gmail.users.messages.list()` - List messages
- ✅ `gmail.users.messages.get()` - Get message content
- ❌ No send, modify, or delete operations

**Status**: ✅ **APPROPRIATE** - Scope matches actual usage

#### Google Calendar Integration

**Current Scopes**: ✅ **APPROPRIATE**

```typescript
"https://www.googleapis.com/auth/calendar.readonly"
"https://www.googleapis.com/auth/calendar.events"
```

**What These Scopes Allow**:
- ✅ `calendar.readonly` - Read calendar metadata and events
- ✅ `calendar.events` - Create, update, delete calendar events

**Actual Operations Performed**:
- ✅ Read calendar events (via `calendar.events.list()`)
- ✅ Create calendar events (when user requests scheduling)
- ✅ Update/delete events (when user requests changes)

**Status**: ✅ **APPROPRIATE** - Scopes match actual usage

### Scope Configuration Files

#### 1. Gmail Auth Configuration

```typescript
// src/lib/integrations/gmail/auth.ts
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly", // Read emails only
];
```

#### 2. OAuth2 Manager

```typescript
// src/lib/integrations/oauth2-manager.ts
export const createGmailOAuth2Manager = (): GoogleOAuth2Manager => {
  return createOAuth2Manager("gmail", undefined, [
    "https://www.googleapis.com/auth/gmail.readonly",
  ]);
};
```

#### 3. Integration Registry

```typescript
// src/lib/integrations/registry.ts
gmail: {
  type: "gmail",
  name: "Gmail",
  scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  oauth2Config: {
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  },
}
```

#### 4. Callback Handler

```typescript
// src/app/api/integrations/gmail/callback/route.ts
const integration = await integrationQueries.createUserIntegration(
  userId,
  "gmail",
  tokens.access_token,
  tokens.refresh_token || null,
  expiresAt,
  ["https://www.googleapis.com/auth/gmail.readonly"], // Read only
  { scope: tokens.scope, token_type: tokens.token_type }
);
```

### Authentication Flow

**Status**: ✅ **PROPERLY IMPLEMENTED**

- **Separate Google Connection**: Google OAuth is separate from user authentication
- **No Google Sign-In**: Only credentials provider in NextAuth configuration
- **Integration-Specific**: Google connection is for integrations only, not user login

## Implementation Details

### File Structure

```
src/
├── lib/
│   ├── utils/
│   │   └── token-encryption.ts          # AES-GCM encryption utilities
│   ├── integrations/
│   │   ├── token-revocation.ts          # Token revocation logic
│   │   ├── gmail/
│   │   │   └── auth.ts                  # Gmail OAuth configuration
│   │   ├── oauth2-manager.ts            # OAuth2 client management
│   │   └── registry.ts                  # Integration registry
│   └── queries/
│       └── integrations.ts              # Database operations with encryption
└── app/
    └── api/
        └── integrations/
            ├── route.ts                 # Main integration API
            └── gmail/
                └── callback/
                    └── route.ts         # Gmail OAuth callback
```

### Database Schema

No database schema changes required. Encryption/decryption happens at the application layer.

### Performance Impact

- **Encryption**: ~0.1ms per token (negligible)
- **Decryption**: ~0.1ms per token (negligible)
- **Storage**: Slightly larger encrypted tokens (~2x size)
- **Memory**: Tokens decrypted only when needed, encrypted in memory otherwise

## Security Features

### ✅ Implemented

- **Tokens encrypted at rest** using AES-256-GCM
- **Strong encryption algorithm** with authentication
- **Random IVs** prevent pattern analysis
- **Authentication prevents tampering**
- **Runtime key validation**
- **Complete token revocation** on disconnect
- **Audit logging** for all operations
- **Minimal OAuth scopes** (principle of least privilege)
- **Separate authentication flows** (no Google sign-in)

### 🔄 Future Enhancements

- **Key rotation implementation**
- **Hardware security module (HSM) integration**
- **Token expiration and cleanup policies**
- **Advanced audit logging** with external systems
- **Retry logic** for transient failures
- **Bulk operations** for multiple integrations

## Testing

### Unit Tests

```bash
# Test token encryption/decryption
npm test

# Test token revocation
npm run test:revocation
```

### Integration Tests

Tests cover:
- Basic encryption/decryption
- Different token formats and lengths
- Error handling for invalid inputs
- Key rotation infrastructure
- Environment validation
- Token revocation with dummy tokens
- Network error handling
- Non-Google integration handling

### CLI Test Script

```bash
# Test Google OAuth revocation endpoint
npm run revoke:test
```

Tests the Google OAuth revocation endpoint directly:
- Tests with dummy tokens (expects 400 Bad Request)
- Tests with empty tokens
- Tests with malformed tokens
- Verifies endpoint reachability

### Expected Results

- **400 Bad Request**: Expected for invalid/dummy tokens
- **Network errors**: Handled gracefully
- **Endpoint reachability**: Confirmed through HTTP responses

## Deployment & Migration

### For Existing Deployments

⚠️ **IMPORTANT**: Secure token storage is a breaking change for existing deployments.

1. **Backup existing tokens** before deploying
2. **Set the encryption key** in your environment
3. **Deploy the new code**
4. **Existing tokens will be unrecoverable** - users will need to re-authenticate

### For New Deployments

1. Generate and set the encryption key before first deployment
2. Deploy the code
3. All new tokens will be automatically encrypted

### Migration Notes

- **Legacy disconnect function** still available for non-Google integrations
- **Existing API clients** will receive enhanced response information
- **Database schema** remains unchanged
- **Audit logs** will start appearing for new disconnections

## Troubleshooting

### Common Issues

#### 1. Encryption Key Issues

**"OAUTH_TOKEN_ENCRYPTION_KEY environment variable is required"**
- Set the environment variable with a valid 64-character hex key
 
**"OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string"**
- Ensure the key is exactly 64 hex characters (0-9, a-f, A-F)

**"Error decrypting token"**
- Token may be corrupted or encrypted with different key
- Check if the encryption key has changed

#### 2. Token Revocation Issues

**"Token revocation failed"**
- Check network connectivity to Google OAuth endpoint
- Verify token format and validity
- Check Google OAuth service status

**"Database cleanup failed"**
- Check database connectivity
- Verify user permissions
- Check for foreign key constraints

**"Integration not found"**
- Verify integration ID or type
- Check if integration is already disconnected
- Verify user ownership of integration

#### 3. OAuth Scope Issues

**"Insufficient scope" errors**
- Verify scope configuration in all files
- Check if Google OAuth app is configured with correct scopes
- Ensure scope changes are deployed

### Debug Commands

```bash
# Test revocation endpoint
npm run revoke:test

# Run integration tests
npm run test:revocation

# Check logs for audit trail
grep "Token revocation" /var/log/app.log

# Verify scope configuration
grep -r "gmail.readonly" src/
```

### Recovery

#### If you lose the encryption key:
- **All encrypted tokens become unrecoverable**
- Users will need to re-authenticate their integrations
- No data recovery is possible without the key

#### If token revocation fails:
- **Database cleanup still proceeds**
- **Partial success (207)** is returned
- **Audit logs** contain failure details
- **Manual cleanup** may be required

## Compliance

### GDPR Compliance

- **Right to erasure**: Complete data removal on disconnect
- **Data minimization**: Only necessary data is retained
- **Audit trail**: All deletion actions are logged
- **Encryption**: Personal data (tokens) encrypted at rest

### OAuth Security

- **Token revocation**: Prevents unauthorized access
- **Immediate effect**: Tokens are invalidated at the provider
- **No token reuse**: Revoked tokens cannot be used again
- **Minimal scopes**: Only request necessary permissions

### Audit Requirements

- **Structured logging**: Machine-readable audit logs
- **User attribution**: All actions linked to user IDs
- **Timestamp tracking**: Precise timing of all operations
- **Error tracking**: Failed operations are logged with details

### Industry Standards

This implementation helps meet:
- **Google OAuth security requirements**
- **GDPR data protection requirements**
- **SOC 2 security controls**
- **Industry best practices** for token storage

## Monitoring & Alerting

### Key Metrics

- **Revocation success rate**: Percentage of successful token revocations
- **Database cleanup success rate**: Percentage of successful data removals
- **Partial success rate**: Percentage of 207 responses
- **Error rates**: Network, database, and provider errors

### Recommended Alerts

- **High revocation failure rate**: >10% revocation failures
- **Database cleanup failures**: Any database cleanup failures
- **Network connectivity issues**: Multiple consecutive network errors
- **Provider API issues**: Google OAuth endpoint returning 5xx errors

## Usage Examples

### Disconnect Integration

```bash
# Disconnect by integration type
curl -X DELETE "https://api.perin.com/api/integrations?type=gmail" \
  -H "Authorization: Bearer <user-token>"

# Disconnect by integration ID
curl -X DELETE "https://api.perin.com/api/integrations?id=integration-uuid" \
  -H "Authorization: Bearer <user-token>"
```

### Response Handling

```javascript
const response = await fetch("/api/integrations?id=123", { method: "DELETE" });
const result = await response.json();

if (response.status === 200) {
  console.log("✅ Complete success:", result.message);
} else if (response.status === 207) {
  console.log("⚠️ Partial success:", result.error);
  console.log("Revocation details:", result.details);
} else {
  console.log("❌ Error:", result.error);
}
```

## Conclusion

This comprehensive Google integration system provides:

- **Secure token storage** with AES-256-GCM encryption
- **Complete token revocation** on disconnect
- **Minimal OAuth scopes** following principle of least privilege
- **Comprehensive audit logging** for compliance
- **Robust error handling** and recovery mechanisms

The implementation ensures both security and compliance while maintaining excellent user experience and system reliability.
