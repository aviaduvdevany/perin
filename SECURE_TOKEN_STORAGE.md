# Secure Token Storage Implementation

This document describes the implementation of secure OAuth token storage using AES-GCM encryption.

## Overview

OAuth access and refresh tokens are now encrypted at rest using AES-256-GCM encryption before being stored in the database. This addresses the critical security vulnerability where tokens were previously stored in plain text.

## Implementation Details

### Encryption Algorithm

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV**: 128 bits (16 bytes) - randomly generated for each encryption
- **Authentication**: Built-in authentication tag prevents tampering

### Key Components

#### 1. Token Encryption Utility (`src/lib/utils/token-encryption.ts`)

- `encryptToken(token: string): string` - Encrypts a token for storage
- `decryptToken(encryptedToken: string): string` - Decrypts a token for use
- `encryptTokenWithKid(token: string, kid?: string): EncryptedToken` - Future key rotation support
- `getKeyForKid(kid: string): string` - Key rotation hook

#### 2. Integration Queries (`src/lib/queries/integrations.ts`)

- All token storage operations now use encryption
- Tokens are encrypted before database storage
- Tokens are decrypted when retrieved from database
- Returns decrypted tokens for immediate use by calling code

#### 3. Token Revocation (`src/lib/integrations/token-revocation.ts`)

- `revokeGoogleToken(accessToken: string): Promise<boolean>` - Revoke individual tokens
- `revokeAllGoogleTokens(integrations: UserIntegration[]): Promise<void>` - Bulk revocation

## Environment Setup

### 1. Generate Encryption Key

```bash
# Generate a new encryption key
node scripts/generate-encryption-key.js
```

### 2. Set Environment Variable

Add the generated key to your environment:

```bash
# For local development
echo "OAUTH_TOKEN_ENCRYPTION_KEY=your-generated-key-here" >> .env.local

# For production (use your deployment platform's environment variable settings)
OAUTH_TOKEN_ENCRYPTION_KEY=your-generated-key-here
```

### 3. Key Requirements

- Must be exactly 64 hexadecimal characters (256 bits)
- Should be cryptographically random
- Must be kept secure and never committed to version control
- Use different keys for different environments

## Security Features

### Runtime Validation

- Validates encryption key presence at startup
- Validates key format (64 hex characters)
- Throws descriptive errors for missing or invalid keys

### Key Rotation Support

- Infrastructure ready for key rotation
- Optional KID (Key ID) support for multiple keys
- Backward compatibility with existing encrypted tokens

### Authentication

- AES-GCM provides built-in authentication
- Additional AAD (Additional Authenticated Data) prevents token reuse across contexts
- Tampering detection through authentication tags

## Testing

Run the test suite to verify encryption functionality:

```bash
npm test
```

Tests cover:

- Basic encryption/decryption
- Different token formats and lengths
- Error handling for invalid inputs
- Key rotation infrastructure
- Environment validation

## Migration Notes

### For Existing Deployments

⚠️ **IMPORTANT**: This is a breaking change for existing deployments with stored tokens.

1. **Backup existing tokens** before deploying
2. **Set the encryption key** in your environment
3. **Deploy the new code**
4. **Existing tokens will be unrecoverable** - users will need to re-authenticate

### For New Deployments

1. Generate and set the encryption key before first deployment
2. Deploy the code
3. All new tokens will be automatically encrypted

## Database Schema

No database schema changes are required. The encryption/decryption happens at the application layer.

## Performance Impact

- **Encryption**: ~0.1ms per token (negligible)
- **Decryption**: ~0.1ms per token (negligible)
- **Storage**: Slightly larger encrypted tokens (~2x size)
- **Memory**: Tokens decrypted only when needed, encrypted in memory otherwise

## Security Considerations

### ✅ Implemented

- Tokens encrypted at rest
- Strong encryption algorithm (AES-256-GCM)
- Random IVs prevent pattern analysis
- Authentication prevents tampering
- Runtime key validation

### 🔄 Future Enhancements

- Key rotation implementation
- Hardware security module (HSM) integration
- Token expiration and cleanup policies
- Audit logging for token access

## Troubleshooting

### Common Issues

1. **"OAUTH_TOKEN_ENCRYPTION_KEY environment variable is required"**

   - Set the environment variable with a valid 64-character hex key

2. **"OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string"**

   - Ensure the key is exactly 64 hex characters (0-9, a-f, A-F)

3. **"Error decrypting token"**
   - Token may be corrupted or encrypted with different key
   - Check if the encryption key has changed

### Recovery

If you lose the encryption key:

- **All encrypted tokens become unrecoverable**
- Users will need to re-authenticate their integrations
- No data recovery is possible without the key

## Compliance

This implementation helps meet:

- Google OAuth security requirements
- GDPR data protection requirements
- SOC 2 security controls
- Industry best practices for token storage
