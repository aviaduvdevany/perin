## Network MVP – Execution Checklist

Use this as the single source of truth for Network MVP readiness. Check off items as they are delivered. Each checkpoint includes acceptance criteria and file pointers.

- Owner:
- Last updated:

---

## P0 – Critical (must pass before E2E starts)

- [x] Centralized authorization and scope checks

  - What: Re-validate ownership, connection status, counterpart matching, and required scopes on every action.
  - Done:
    - Added `src/lib/utils/network-auth.ts` with `requireConnectionMembership`, `requireActiveConnection`, `requireScopes`, `requireCounterpartMatch`, `ensureSessionNotExpired`.
    - Applied membership/active/scopes checks in: `connections/*` (invite, accept, revoke, permissions), `sessions/*` (start, get), `sessions/[id]/proposals`, `sessions/[id]/confirm`, `sessions/[id]/messages`.
  - Accept:
    - Routes reject when user isn’t a participant, connection isn’t `active`, or scopes are missing.

- [x] Idempotency keys for proposals and confirm

  - What: Prevent duplicate proposal messages and duplicate booking on retries.
  - Done:
    - Kept `registerIdempotencyKey` in `src/lib/queries/network.ts` and wired optional `Idempotency-Key` header support.
    - Proposals/Confirm compute deterministic fallback keys when header is absent; duplicates short-circuit.
    - Also enabled optional idempotency for `messages` route.
  - Accept:
    - Repeated requests with same idempotency key are deduped.

- [x] Two-phase booking with robust rollback and concurrency safety

  - What: Tentative holds on both calendars; confirm both or rollback; avoid double-confirm.
  - Done:
    - Create events for both users; if any step fails, rollback the other using `deleteCalendarEvent`.
    - Added `setSessionConfirmedIfUnconfirmed` in `src/lib/queries/network.ts` to gate double-confirmation.
    - On contention, newly created events are rolled back and an error is returned.
  - Accept:
    - No single-sided confirmation; at most one confirmation wins.

- [x] Session lifecycle and TTL enforcement

  - What: Sessions must expire and state transitions must be valid.
  - Done:
    - Added `ensureSessionNotExpired` and used in proposals/confirm endpoints.
    - Session start sets 30m TTL as before; proposals/confirm reject expired sessions.
  - Accept:
    - Expired sessions return a clear error.

- [x] Revocation mid-flow

  - What: Any action must re-check connection active/scopes.
  - Done:
    - Proposals and confirm re-fetch connection and enforce `status === 'active'` before proceeding.
  - Accept:
    - Revoked connections block actions.

- [x] Input validation + safety limits

  - What: Strict schema validation for all route payloads and params.
  - Done:
    - Added Zod schemas at `src/app/api/network/schemas.ts` for create/accept/update permissions, start session, proposals, confirm.
    - Enforced bounds: duration, limits, string lengths; validated optional ranges/timezone fields.
  - Accept:
    - Invalid payloads respond with 400 and helpful messages.

- [x] Lightweight rate limiting

  - What: Avoid abuse and accidental storms.
  - Done:
    - Implemented `src/lib/utils/rate-limit.ts` (token bucket, per-user per-endpoint).
    - Applied to: invite, accept, revoke, session start, proposals, confirm, messages.
    - Added `ErrorResponses.tooManyRequests` (429).
  - Accept:
    - Exceeding usage returns 429.

- [ ] Observability and audit linking

  - What: Correlate everything to debug E2E.
  - Status:
    - Audit logs already emitted on invite and confirm.
    - Correlation IDs/log shape standardization not added yet (left for P1/observability task).
  - Accept:
    - Basic audit exists; extended logging pending (post-P0).

- [x] Pagination and deduplication

  - What: Stable lists and stable notification streams.
  - Done:
    - Added `listConnectionsForUserPaginated` and `listAgentMessagesPaginated` in queries.
    - Updated `GET /api/network/connections` and `GET /api/network/sessions/:id/messages` to accept `page`/`limit`.
  - Accept:
    - Lists paginate reliably.

- [x] Inbound message trust boundary (internal-only for MVP)
  - What: Keep the “webhook-style” endpoint internal until federation.
  - Done:
    - Endpoints are NextAuth-protected and only allow participants to post/read session messages.
    - No external federation exposure added yet; HMAC signed paths deferred to federation phase.
  - Accept:
    - No external callers can inject messages.

---

## P1 – High impact after P0

- [x] Background cleanup jobs

  - Done: Added `POST /api/network/cleanup` protected by `x-network-cleanup-secret` (env: `NETWORK_CLEANUP_SECRET`). Implements `expireAgentSessions()` and `purgeOldIdempotencyKeys()` in `src/lib/queries/network.ts`.
  - Accept: No unbounded table growth; stale holds pending future clientRequestId support.

- [x] Privacy hygiene for proposals

  - Done: Proposals payload now includes `tz` per slot; only free/busy windows are shared.

- [x] Error taxonomy + consistent responses

  - Done: Added `ErrorResponses.conflict` (409). Duplicate proposals/confirm and already-confirmed races now return 409.

- [x] LangGraph guardrails

  - Done: Disabled regex-based extraction; network path requires explicit IDs from UI.

- [ ] UI validation and toasts
  - Status: Basic validation exists; richer toasts/UX polish pending.

---

## P2 – Post-MVP polish

- [ ] Realtime push (Pusher/Ably/Vercel Realtime) instead of polling
- [ ] Email notifications for critical events
- [ ] Multi-party scheduling and resources
- [ ] Federation (HMAC signing, replay protection, and public-key plan)

---

## Test Readiness (gate before E2E)

- [ ] Unit tests for `src/lib/network/scheduling.ts`
  - Mutual availability, edge cases, timezones/DST.
- [ ] Contract tests for proposals/confirm
  - Idempotency and rollback flows; concurrent confirm winner.
- [ ] Fake/dry-run calendar client for tests
  - Prevents booking real events; deterministic outcomes.
- [ ] Smoke test script
  - Invite → accept → session → proposals → confirm; verifies audit + notifications + transcript.

Accept: All above green locally and in CI.

---

## Implementation Notes (file pointers)

- Routes: `src/app/api/network/**`
- Service layer: `src/app/services/network.ts`
- Queries: `src/lib/queries/network.ts`
- Scheduling: `src/lib/network/scheduling.ts`
- Auth/session utils: `src/lib/utils/auth-helpers.ts`, `src/lib/utils/session-helpers.ts`, `src/lib/utils/network-auth.ts`
- Error handling: `src/lib/ai/resilience/error-handler.ts`
- Tables (constants): `src/lib/tables.ts`
- Types: `src/types/network.ts`

---

## Progress Log

Add an entry whenever you complete a checkpoint or a meaningful subtask.

- [YYYY-MM-DD] Item: Status – Notes / PR link
- [YYYY-MM-DD] Item: Status – Notes / PR link
