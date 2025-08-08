# Perin Network Feature

A permissioned, agent-to-agent scheduling system that lets two users connect their Perins, exchange structured proposals, and book meetings on both calendars with safety, auditability, and idempotency.

## Goals

- Securely connect two users with explicit, scoped permissions per connection
- Generate mutual availability proposals and confirm bookings on both calendars
- Provide resilience: idempotency, rollback, TTLs, rate limits, and audit logging
- Keep client usage simple via a service layer; never call APIs directly in components

## High-level Flow

1. User A invites User B to connect
2. User B accepts and sets permissions/constraints
3. User A starts a session with User B
4. Proposals are generated using both users’ availability and constraints
5. Either A or B confirms a slot
6. System creates events on both calendars (two-phase), audits, and notifies both users

## Architecture Overview

- UI pages: `/network`, `/network/permissions`, `/network/sessions`
- Service layer: `src/app/services/network.ts` (all client API calls go through here)
- API routes: `src/app/api/network/**` (NextAuth-protected)
- Smart queries: `src/lib/queries/network.ts`
- Scheduling: `src/lib/network/scheduling.ts` (mutual availability)
- Calendar integration: `src/lib/integrations/calendar` (create/delete events, free/busy)
- LangGraph: `src/lib/ai/langgraph` (guardrailed scheduling triggering)
- Utilities: input schemas, auth guards, idempotency, rate limiting, error responses

## Data Model Summary

Tables used (see `src/lib/tables.ts`):

- `user_connections`: id, requester_user_id, target_user_id, status(pending|active|revoked), created_at, updated_at
- `connection_permissions`: connection_id, scopes (string[]), constraints (JSONB), updated_at
- `agent_sessions`: id, type(schedule_meeting|proposal_only), initiator_user_id, counterpart_user_id, connection_id, status, ttl_expires_at, outcome(JSONB), timestamps
- `agent_messages`: id, session_id, from_user_id, to_user_id, type(proposal|accept|confirm|cancel|error), payload(JSONB), dedupe_key, created_at
- `audit_logs`: id, user_id, action, resource_type, resource_id, details(JSONB), created_at
- `idempotency_keys`: key, scope, created_at (used to dedupe)

## Permissions & Scopes

- `profile.basic.read` – basic profile details
- `calendar.availability.read` – free/busy only
- `calendar.events.propose` – propose slots
- `calendar.events.write.confirm` – manual confirm booking
- `calendar.events.write.auto` – auto-booking (optional)

Constraints (per-connection; JSON): working hours, min notice, meeting length range, location/video pref, etc.

## API Endpoints

All endpoints require authentication (NextAuth) and revalidate membership/active status/scopes.

- Connections

  - POST `/api/network/connections` – invite (create connection + set requester scopes/constraints)
  - GET `/api/network/connections?page&limit` – list my connections (paginated)
  - POST `/api/network/connections/:id/accept` – accept invite and set target scopes/constraints
  - GET `/api/network/connections/:id/permissions` – get connection permissions
  - PUT `/api/network/connections/:id/permissions` – update permissions
  - DELETE `/api/network/connections/:id` – revoke

- Sessions

  - POST `/api/network/sessions` – start session (30 min TTL)
  - GET `/api/network/sessions/:id` – get session
  - POST `/api/network/sessions/:id/proposals` – generate mutual slots, post message, notify (idempotent)
  - POST `/api/network/sessions/:id/confirm` – two-phase booking on both calendars (idempotent, concurrency-safe)
  - Messages
    - POST `/api/network/sessions/:id/messages` – post structured message (optional idempotency)
    - GET `/api/network/sessions/:id/messages?page&limit` – transcript (paginated)

- Cleanup
  - POST `/api/network/cleanup` – expire sessions and purge old idempotency keys (requires `x-network-cleanup-secret` header)

## Service Layer (Client)

Use `src/app/services/network.ts` exclusively from components:

- `createConnectionService(payload)`
- `acceptConnectionService(connectionId, payload)`
- `listConnectionsService()`
- `getConnectionPermissionsService(connectionId)`
- `updateConnectionPermissionsService(connectionId, payload)`
- `revokeConnectionService(connectionId)`
- `startNetworkSessionService(payload)`
- `getNetworkSessionService(sessionId)`
- `sendProposalsService(sessionId, payload)`
- `confirmMeetingService(sessionId, payload)`
- `postNetworkMessageService(sessionId, payload)`
- `getNetworkTranscriptService(sessionId)`

## Input Validation

Zod schemas: `src/app/api/network/schemas.ts`

- Validates scopes/constraints, session start, proposals, confirm payloads
- Enforces bounds on durations, limits, and string lengths
- Rejects invalid payloads with 400 and user-friendly messages

## Authorization & Lifecycle Guards

`src/lib/utils/network-auth.ts`:

- Membership: only connection participants act on a connection/session
- Active check: connection must be `active` for proposals/confirm
- Scopes: proposals require `calendar.availability.read` + `calendar.events.propose`; confirm requires `calendar.events.write.confirm` or `calendar.events.write.auto`
- TTL: sessions expire after 30 minutes; proposals/confirm reject expired sessions

## Idempotency & Concurrency

- Idempotency: Accept optional `Idempotency-Key` header; otherwise compute deterministic keys
  - Proposals: duplicate returns 409 Conflict
  - Confirm: duplicate returns 409 Conflict
- Concurrency: `setSessionConfirmedIfUnconfirmed` avoids double-confirm
  - If another confirm wins, current attempt rolls back any created events and returns 409

## Scheduling (Mutual Availability)

`src/lib/network/scheduling.ts` computes slots by:

- Pulling free/busy for both users (calendar integration)
- Respecting constraints (working hours, min notice)
- Iterating with a step (30m) and checking overlaps
- Returning up to `limit` slots

Privacy: proposals payload includes `{ start, end, tz }` only (no event details), and `durationMins`.

## Two-phase Booking

`POST /sessions/:id/confirm`:

- Create event on A’s calendar
- Create event on B’s calendar
- If any step fails → delete any created event(s), mark session error, return 500
- If both succeed → mark session `confirmed`, write audit logs, post confirm message, notify both
- Concurrency-safe: only one confirm succeeds per session

## Notifications & Transcript

- Notifications created on invite, accept, session start, proposals, and confirm
- Transcript (`GET /sessions/:id/messages`) lists structured messages for visibility and debugging

## Rate Limiting

`src/lib/utils/rate-limit.ts` – in-memory token bucket for dev/local

- Invites, accepts, revokes
- Session start, proposals, confirm, messages
- 429 Too Many Requests on exceeding per-minute limits

## Background Cleanup

`src/lib/queries/network.ts`:

- `expireAgentSessions()` – set expired sessions to `expired`
- `purgeOldIdempotencyKeys(days=7)` – delete old keys

`POST /api/network/cleanup` protected by `x-network-cleanup-secret` header.

## Error Semantics

- 400 Bad Request – validation or invalid state (e.g., expired session)
- 401 Unauthorized – not authenticated or not a participant
- 404 Not Found – connection/session not found
- 409 Conflict – idempotent duplicate or already confirmed race
- 429 Too Many Requests – rate-limited
- 500 Internal Server Error – unexpected failure (with audit/logs)

## LangGraph Guardrails

`src/lib/ai/langgraph/index.ts`:

- Network path requires explicit `connectionId` and `counterpartUserId` (no regex extraction from free text)
- Prevents accidental triggering via chat; UI should pass explicit IDs

## UI Surfaces

- `/network`: invite, accept, revoke; notifications
- `/network/permissions`: load and update scopes/constraints
- `/network/sessions`: start session, send proposals, pick & confirm, view transcript

## End-to-End Manual Test Plan

- Invite/Accept
- Permissions update (enable required scopes)
- Start session and send proposals
- Confirm a slot and verify events on both calendars
- Test idempotency (repeat with `Idempotency-Key`) → 409
- Test concurrency (confirm twice quickly) → single winner, 409 for the loser
- Revoke connection mid-flow → actions denied
- Rate limits produce 429 when exceeded
- Cleanup route returns counts

## Security & Privacy

- Least privilege via per-connection scopes
- Data minimization: proposals share free/busy windows only
- Immediate revocation effect
- All API routes are protected via NextAuth and membership checks

## Implementation Pointers

- Routes: `src/app/api/network/**`
- Queries: `src/lib/queries/network.ts`
- Service layer: `src/app/services/network.ts`
- Scheduling: `src/lib/network/scheduling.ts`
- Calendar: `src/lib/integrations/calendar/*`
- Schemas: `src/app/api/network/schemas.ts`
- Auth/session utils: `src/lib/utils/session-helpers.ts`, `src/lib/utils/network-auth.ts`
- Errors: `src/lib/utils/error-handlers.ts`

---

This document is the single source for the Network feature. If anything diverges from code, update both this document and the referenced files accordingly.
