# Token Revocation Implementation

This document describes the implementation of full token revocation on disconnect for OAuth integrations.

## Overview

When users disconnect their integrations, the system now:

1. **Revokes tokens** with the OAuth provider (Google)
2. **Removes encrypted tokens** and metadata from the database
3. **Logs all actions** for audit purposes
4. **Returns appropriate status codes** (200 for success, 207 for partial success)

## Implementation Details

### 1. Enhanced Token Revocation (`src/lib/integrations/token-revocation.ts`)

#### Key Functions:

- `revokeGoogleToken(accessToken, refreshToken?)` - Revokes tokens with Google
- `revokeIntegrationTokens(integration, userId)` - Handles integration-specific revocation
- `revokeAllGoogleTokens(integrations, userId)` - Bulk revocation for multiple integrations

#### Features:

- **Dual token revocation**: Revokes both access and refresh tokens
- **Error handling**: Graceful handling of network errors and invalid tokens
- **Audit logging**: Logs all revocation attempts with timestamps and results
- **Status tracking**: Returns detailed results including HTTP status codes

### 2. Enhanced Disconnect Service (`src/lib/integrations/service.ts`)

#### New Function:

- `disconnectIntegrationWithRevocation(userId, typeOrId)` - Full disconnection with revocation

#### Process:

1. **Read integration data** from database (with decrypted tokens)
2. **Revoke tokens** with OAuth provider
3. **Remove data** from database completely
4. **Return detailed results** including revocation status

### 3. Updated API Endpoint (`src/app/api/integrations/route.ts`)

#### DELETE `/api/integrations` Changes:

- Uses `disconnectIntegrationWithRevocation` instead of simple deactivation
- Returns **200** for complete success (revocation + DB cleanup)
- Returns **207 Multi-Status** for partial success (DB cleanup succeeded, revocation failed)
- Returns **404** for integration not found
- Returns **500** for other errors

#### Response Format:

```json
{
  "success": true,
  "message": "Integration disconnected and tokens revoked successfully"
}
```

Or for partial success:

```json
{
  "success": false,
  "error": "Integration disconnected but token revocation failed",
  "details": {
    "revocationError": "HTTP 400: Bad Request",
    "revocationStatusCode": 400
  }
}
```

### 4. Database Changes (`src/lib/queries/integrations.ts`)

#### New Function:

- `removeIntegrationData(integrationId, userId)` - Completely removes integration data

#### Behavior:

- **Hard delete** from database (not just deactivation)
- **Removes all tokens** and metadata
- **Audit logging** of removal actions

## Security Features

### Token Revocation

- **Google OAuth endpoint**: `https://oauth2.googleapis.com/revoke`
- **Both token types**: Access and refresh tokens are revoked
- **Error handling**: Network failures don't prevent database cleanup
- **Audit trail**: All revocation attempts are logged

### Data Cleanup

- **Complete removal**: Integration data is deleted, not just deactivated
- **Encrypted tokens**: Tokens are decrypted only for revocation, then removed
- **Metadata cleanup**: All Google-related metadata is removed

### Audit Logging

- **Structured logs**: JSON format with timestamps and user IDs
- **Success/failure tracking**: Logs both successful and failed revocations
- **Error details**: Includes HTTP status codes and error messages
- **User context**: Links all actions to specific users and integrations

## Testing

### Integration Tests

```bash
npm run test:revocation
```

Tests cover:

- Token revocation with dummy tokens
- Network error handling
- Non-Google integration handling
- Google integration handling

### CLI Test Script

```bash
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

## Usage Examples

### Disconnect by Integration Type

```bash
curl -X DELETE "https://api.perin.com/api/integrations?type=gmail" \
  -H "Authorization: Bearer <user-token>"
```

### Disconnect by Integration ID

```bash
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

## Error Handling

### Revocation Failures

- **Network errors**: Logged but don't prevent database cleanup
- **Invalid tokens**: Expected for expired/revoked tokens
- **Provider errors**: HTTP status codes are captured and logged

### Database Failures

- **Integration not found**: Returns 404
- **Permission errors**: Returns 403
- **Database errors**: Returns 500

### Partial Success (207 Multi-Status)

- **Database cleanup succeeded** but **token revocation failed**
- **Detailed error information** in response
- **Audit log** contains both success and failure details

## Compliance & Security

### GDPR Compliance

- **Right to erasure**: Complete data removal on disconnect
- **Data minimization**: Only necessary data is retained
- **Audit trail**: All deletion actions are logged

### OAuth Security

- **Token revocation**: Prevents unauthorized access
- **Immediate effect**: Tokens are invalidated at the provider
- **No token reuse**: Revoked tokens cannot be used again

### Audit Requirements

- **Structured logging**: Machine-readable audit logs
- **User attribution**: All actions linked to user IDs
- **Timestamp tracking**: Precise timing of all operations
- **Error tracking**: Failed operations are logged with details

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

## Future Enhancements

### Planned Features

- **Retry logic**: Automatic retry for transient failures
- **Bulk operations**: Disconnect multiple integrations at once
- **Webhook notifications**: Notify users of disconnection status
- **Advanced audit**: Integration with external audit systems

### Key Rotation Support

- **Multiple encryption keys**: Support for key rotation
- **Backward compatibility**: Decrypt tokens with old keys
- **Migration tools**: Tools for re-encrypting with new keys

## Troubleshooting

### Common Issues

1. **"Token revocation failed"**

   - Check network connectivity to Google OAuth endpoint
   - Verify token format and validity
   - Check Google OAuth service status

2. **"Database cleanup failed"**

   - Check database connectivity
   - Verify user permissions
   - Check for foreign key constraints

3. **"Integration not found"**
   - Verify integration ID or type
   - Check if integration is already disconnected
   - Verify user ownership of integration

### Debug Commands

```bash
# Test revocation endpoint
npm run revoke:test

# Run integration tests
npm run test:revocation

# Check logs for audit trail
grep "Token revocation" /var/log/app.log
```

## Migration Notes

### For Existing Deployments

1. **Deploy the new code** with enhanced revocation
2. **Existing integrations** will use the new revocation flow on next disconnect
3. **No data migration** required - existing data remains compatible
4. **Audit logs** will start appearing for new disconnections

### Backward Compatibility

- **Legacy disconnect function** still available for non-Google integrations
- **Existing API clients** will receive enhanced response information
- **Database schema** remains unchanged
