## Network MVP – Execution Checklist

Use this as the single source of truth for Network MVP readiness. Check off items as they are delivered. Each checkpoint includes acceptance criteria and file pointers.

- Owner:
- Last updated:

---

## P0 – Critical (must pass before E2E starts)

- [ ] Centralized authorization and scope checks

  - What: Re-validate ownership, connection status, counterpart matching, and required scopes on every action.
  - Do:
    - Extend `src/lib/utils/auth-helpers.ts` with helpers: `requireActiveConnection`, `requireScopes`, `requireCounterpartMatch`.
    - Call them from all network routes: `connections/*`, `sessions/*`, `permissions`, `messages`, `proposals`, `confirm`.
  - Accept:
    - All protected routes reject with 403 when user doesn’t own the resource, connection is not `active`, or scopes are missing.
    - No route trusts client-sent `userId`/`connectionId` without verifying against session and DB.

- [ ] Idempotency keys for proposals and confirm

  - What: Prevent duplicate proposal messages and duplicate booking on retries.
  - Do:
    - Implement helper in `src/lib/queries/network.ts` to `createOrReuseIdempotencyKey(scope, key)` with status (in_progress|succeeded|failed) + expiry.
    - Enforce uniqueness at app-layer (and DB if available) per `(scope, key)`.
    - Use in `POST /api/network/sessions/[id]/proposals` and `POST /api/network/sessions/[id]/confirm`.
  - Accept:
    - Repeating a request with the same idempotency key returns the original result and does not create new messages/events.

- [ ] Two-phase booking with robust rollback and concurrency safety

  - What: Tentative holds on both calendars; confirm both or rollback; avoid double-confirm.
  - Do:
    - Use `clientRequestId` for tentative holds; persist both event IDs.
    - If second hold fails, delete the first; retry-safe.
    - In confirm route, serialize with transaction/lock (or logical unique gate) so only one confirmation can succeed per `session_id`.
  - Accept:
    - No state where only one calendar has a confirmed event.
    - Concurrent confirms result in a single winner; others receive conflict.

- [ ] Session lifecycle and TTL enforcement

  - What: Sessions must expire and state transitions must be valid.
  - Do:
    - Enforce TTL on `agent_sessions` in getters/mutators.
    - Guard transitions (e.g., cannot confirm if `expired|revoked|completed|error`).
    - Optionally add lightweight row-level lock via select-for-update in queries wrappers.
  - Accept:
    - Expired sessions reject proposals/confirm with 409 + clear message.

- [ ] Revocation mid-flow

  - What: Any action must re-check connection active/scopes.
  - Do:
    - In proposals/confirm, re-fetch and validate connection before proceeding.
  - Accept:
    - If connection is revoked, action fails and any tentative holds are cleaned up.

- [ ] Input validation + safety limits

  - What: Strict schema validation for all route payloads and params.
  - Do:
    - Add Zod schemas (e.g., `src/app/api/network/schemas.ts`).
    - Validate `connectionId`, `counterpartUserId`, `durationMins` bounds, timezone, constraints shapes.
    - Clamp proposal counts, date ranges; cap payload sizes.
  - Accept:
    - Invalid inputs return 400 with structured error; no unbounded loops or oversized responses.

- [ ] Lightweight rate limiting

  - What: Avoid abuse and accidental storms.
  - Do:
    - Add per-user, per-endpoint limiter (in-memory for dev) in a small util (e.g., `src/lib/utils/rate-limit.ts`).
    - Apply to `invite`, `sessions start`, `proposals`, `confirm`.
  - Accept:
    - Exceeding limit yields 429 with Retry-After; limits configurable via env.

- [ ] Observability and audit linking

  - What: Correlate everything to debug E2E.
  - Do:
    - Emit structured logs with `connectionId`, `sessionId`, `idempotencyKey`, `correlationId`.
    - Ensure `audit_logs` are written on confirm success/failure and rollback.
  - Accept:
    - A single correlation ID traces an entire confirm attempt across logs and audit.

- [ ] Pagination and deduplication

  - What: Stable lists and stable notification streams.
  - Do:
    - Add cursor/limit to `GET /api/network/connections` and `GET /api/network/sessions/[id]/messages`.
    - Deduplicate notifications on idempotent retries (use message ID or idem key).
  - Accept:
    - Lists paginate reliably; repeated requests don’t spam notifications.

- [ ] Inbound message trust boundary (internal-only for MVP)
  - What: Keep the “webhook-style” endpoint internal until federation.
  - Do:
    - Ensure NextAuth-only access and same-tenant checks; explicitly block cross-tenant.
    - Document future HMAC plan; don’t expose public endpoint yet.
  - Accept:
    - No external caller can post messages into sessions.

---

## P1 – High impact after P0

- [ ] Background cleanup jobs

  - Do: Expire `agent_sessions`, purge `idempotency_keys`, clean stale tentative holds.
  - Accept: No unbounded table growth; stale holds removed within N hours.

- [ ] Privacy hygiene for proposals

  - Do: Ensure only free/busy intervals + tz are shared; no event details without explicit scope.
  - Accept: Payloads audited to contain no sensitive details.

- [ ] Error taxonomy + consistent responses

  - Do: Normalize 4xx vs 5xx via `src/lib/ai/resilience/error-handler.ts`; mark retriable vs terminal.
  - Accept: Clients receive consistent error shapes; logs include cause and category.

- [ ] LangGraph guardrails

  - Do: Disable regex-based extraction for counterpart in chat by default; UI must pass explicit IDs.
  - Accept: Network path only runs with explicit parameters; step surfaced to system prompt only when active.

- [ ] UI validation and toasts
  - Do: Add clearer validation on `/network/sessions` and quick links from `/network` to permissions/session.
  - Accept: Users cannot submit invalid forms; actionable toasts for errors.

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
- Auth/session utils: `src/lib/utils/auth-helpers.ts`, `src/lib/utils/session-helpers.ts`
- Error handling: `src/lib/ai/resilience/error-handler.ts`
- Tables (constants): `src/lib/tables.ts`
- Types: `src/types/network.ts`

---

## Progress Log

Add an entry whenever you complete a checkpoint or a meaningful subtask.

- [YYYY-MM-DD] Item: Status – Notes / PR link
- [YYYY-MM-DD] Item: Status – Notes / PR link
