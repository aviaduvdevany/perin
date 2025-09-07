# User Control & Data Deletion Audit

## Current Disconnect Implementation

### ✅ Disconnect Functionality

**API Endpoint:** `DELETE /api/integrations`

```typescript
// From src/app/api/integrations/route.ts:30-89
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");

  if (!id && !type) {
    return NextResponse.json({ error: "id or type is required" }, { status: 400 });
  }

  let ok = false;
  if (id) {
    ok = await disconnectIntegration(session.user.id, { id });
  } else if (type) {
    if (type === "gmail" || type === "calendar" || /* other types */) {
      ok = await disconnectIntegration(session.user.id, type);
    }
  }

  return NextResponse.json({ success: true });
}
```

**Service Layer:**

```typescript
// From src/app/services/integrations.ts:57-77
export const disconnectIntegrationService = async (params: {
  id?: string;
  type?: IntegrationType;
}) => {
  if (!params.id && !params.type) {
    throw new Error("id or type is required");
  }
  const search = new URLSearchParams();
  if (params.id) search.set("id", params.id);
  if (params.type) search.set("type", params.type);

  const response = await internalApiRequest(
    `integrations?${search.toString()}`,
    HTTPMethod.DELETE
  );
  return response as { success: boolean };
};
```

**Core Disconnect Logic:**

```typescript
// From src/lib/integrations/service.ts:263-286
export const disconnectIntegration = async (
  userId: string,
  typeOrId: IntegrationType | { id: string }
): Promise<boolean> => {
  try {
    if (typeof typeOrId === "string") {
      const integration = await integrationQueries.getUserIntegration(
        userId,
        typeOrId
      );
      if (!integration) return false;
      await integrationQueries.deactivateIntegration(userId, typeOrId);
      return true;
    } else {
      return await integrationQueries.deactivateIntegrationById(
        typeOrId.id,
        userId
      );
    }
  } catch (error) {
    console.error(`Error disconnecting integration:`, error);
    return false;
  }
};
```

### ✅ UI Integration

**Integration Manager Modal:**

```typescript
// From src/components/dock-modals/IntegrationManagerModal.tsx
// Disconnect button implementation with confirmation
const handleDisconnect = async (integration: UserIntegration) => {
  const confirmed = window.confirm(
    `Are you sure you want to disconnect ${integration.integration_type}?`
  );
  if (confirmed) {
    const success = await disconnect({ id: integration.id });
    if (success) {
      // Update UI state
    }
  }
};
```

**Provider Integration:**

```typescript
// From src/components/providers/IntegrationsProvider.tsx:82-98
const disconnect = useCallback(
  async (params: { id?: string; type?: IntegrationType }) => {
    try {
      if (params.id) {
        optimisticRemove(params.id);
      }
      const res = await disconnectIntegrationService(params);
      if (!res?.success) return false;
      await refresh();
      return true;
    } catch (e) {
      console.error("disconnect failed", e);
      return false;
    }
  },
  [optimisticRemove, refresh]
);
```

## Data Deletion Analysis

### ❌ CRITICAL: No Token Revocation

**Current Implementation:**

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

**Issue:** OAuth tokens remain valid with Google even after disconnect.

**Risk:** Tokens could be used to access user data if compromised.

### ⚠️ PARTIAL: Database Deactivation Only

**Current Database Action:**

```typescript
// From src/lib/queries/integrations.ts:196-213
export const deactivateIntegration = async (
  userId: string,
  integrationType: string
): Promise<boolean> => {
  const sql = `
    UPDATE ${USER_INTEGRATIONS_TABLE}
    SET is_active = false
    WHERE user_id = $1 AND integration_type = $2
  `;

  const result = await query(sql, [userId, integrationType]);
  return (result.rowCount || 0) > 0;
};
```

**Status:** Only sets `is_active = false`, doesn't delete data.

### ❌ MISSING: Complete Data Deletion

**Required Actions Not Implemented:**

1. Revoke OAuth tokens with Google
2. Delete stored Google identifiers/metadata
3. Clear related data (emails, calendar events in cache)
4. Audit log the deletion

## Required Implementation

### 1. Enhanced Disconnect with Token Revocation

**Create:** `src/lib/integrations/enhanced-disconnect.ts`

```typescript
import { revokeGoogleToken } from "./token-revocation";
import * as integrationQueries from "@/lib/queries/integrations";

export const disconnectIntegrationWithRevocation = async (
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
      const integrations = await integrationQueries.getUserIntegrations(userId);
      integration = integrations.find((i) => i.id === typeOrId.id) || null;
    }

    if (!integration) return false;

    // 1. Revoke Google tokens if applicable
    if (
      integration.integration_type === "gmail" ||
      integration.integration_type === "calendar"
    ) {
      const revoked = await revokeGoogleToken(integration.access_token);
      if (!revoked) {
        console.warn(
          `Failed to revoke token for integration ${integration.id}`
        );
        // Continue with disconnect even if revocation fails
      }
    }

    // 2. Delete stored Google data
    await deleteGoogleData(userId, integration.integration_type);

    // 3. Deactivate integration
    if (typeof typeOrId === "string") {
      await integrationQueries.deactivateIntegration(userId, typeOrId);
    } else {
      await integrationQueries.deactivateIntegrationById(typeOrId.id, userId);
    }

    // 4. Log the action
    await logDataDeletion(userId, integration.integration_type);

    return true;
  } catch (error) {
    console.error(`Error disconnecting integration:`, error);
    return false;
  }
};

const deleteGoogleData = async (userId: string, integrationType: string) => {
  // Delete any cached Google data
  // This would depend on your caching implementation
  console.log(`Deleting cached ${integrationType} data for user ${userId}`);
};

const logDataDeletion = async (userId: string, integrationType: string) => {
  // Log the data deletion for audit purposes
  console.log(`User ${userId} deleted ${integrationType} integration data`);
};
```

### 2. Complete Data Deletion API

**Create:** `src/app/api/integrations/google/disconnect/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import { disconnectIntegrationWithRevocation } from "@/lib/integrations/enhanced-disconnect";
import { ErrorResponses } from "@/lib/utils/error-handlers";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return ErrorResponses.unauthorized("Authentication required");
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || (type !== "gmail" && type !== "calendar")) {
      return ErrorResponses.badRequest("Invalid integration type");
    }

    const success = await disconnectIntegrationWithRevocation(userId, type);

    if (!success) {
      return ErrorResponses.notFound(
        "Integration not found or already disconnected"
      );
    }

    return NextResponse.json({
      success: true,
      message: `${type} integration disconnected and data deleted`,
    });
  } catch (error) {
    console.error("Error disconnecting Google integration:", error);
    return ErrorResponses.internalServerError(
      "Failed to disconnect integration"
    );
  }
}
```

### 3. Data Retention Policy Implementation

**Create:** `src/lib/integrations/data-retention.ts`

```typescript
export const cleanupExpiredIntegrations = async () => {
  // Delete integrations inactive for 90+ days
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const sql = `
    DELETE FROM user_integrations 
    WHERE is_active = false 
    AND connected_at < $1
  `;

  await query(sql, [cutoffDate.toISOString()]);
  console.log(
    `Cleaned up expired integrations older than ${cutoffDate.toISOString()}`
  );
};

export const cleanupUserData = async (userId: string) => {
  // Complete data deletion for user account closure
  const integrations = await getUserIntegrations(userId);

  // Revoke all Google tokens
  const googleIntegrations = integrations.filter(
    (i) => i.integration_type === "gmail" || i.integration_type === "calendar"
  );

  await Promise.all(
    googleIntegrations.map((integration) =>
      revokeGoogleToken(integration.access_token)
    )
  );

  // Delete all integration data
  await query(`DELETE FROM user_integrations WHERE user_id = $1`, [userId]);

  console.log(`Deleted all integration data for user ${userId}`);
};
```

## Current Compliance Status

### ✅ PASS - User Control

- Disconnect functionality implemented
- UI integration complete
- API endpoints available
- User can disconnect at any time

### ❌ FAIL - Data Deletion

- No token revocation with Google
- No complete data deletion
- No audit logging
- No retention policy enforcement

### ⚠️ PARTIAL - Privacy Compliance

- Basic disconnect works
- Missing comprehensive data deletion
- No GDPR-compliant data removal

## Recommendations

### Immediate Actions Required:

1. **Implement token revocation** (HIGH PRIORITY)
2. **Add complete data deletion** (HIGH PRIORITY)
3. **Create audit logging** (MEDIUM PRIORITY)
4. **Implement retention policies** (MEDIUM PRIORITY)

### Implementation Priority:

1. Token revocation with Google APIs
2. Complete data deletion on disconnect
3. Audit logging for compliance
4. Automated cleanup of expired data
5. User account closure data deletion

## Summary

The current disconnect functionality provides basic user control but lacks comprehensive data deletion and token revocation required for Google OAuth compliance. Critical security and privacy gaps must be addressed before production deployment.
