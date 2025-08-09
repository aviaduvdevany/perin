## Perin Notifications System — Strategy, Phases, and Checkpoints

A future‑proof, multi‑channel notifications system that balances actionability, user trust, and delivery resilience across web and (upcoming) React Native mobile.

### Goals

- Deliver the right information, in the right tone, on the right channel, at the right time.
- Support action-in-one-tap for urgent items; batch non-urgent items into digests.
- Be resilient: retries, fallbacks, idempotency, and observability by default.
- Respect user agency: preferences, timezone, do-not-disturb (DnD), and transparency logs.

### Surfaces and Channels (Phase 1 target)

- Mobile push (RN iOS/Android via OneSignal → FCM/APNs)
- Web push (desktop/laptop via OneSignal)
- In-app notifications (Next.js UI fallback / history)

Optional fallbacks (Phase 2+): Email/SMS for critical events if push fails.

## Notification Types and Voice

### Types (initial set; can expand)

- Actionable Alerts (High priority)
  - Meeting confirmation requests
  - Time-sensitive scheduling conflicts
  - “Perin found a better time for your meeting — approve?”
- Contextual Updates (Medium priority)
  - “Meeting with Alex confirmed for tomorrow at 10 AM.”
  - “Perin resolved the calendar conflict with Jordan.”
- Smart Reminders (Low–medium priority)
  - “You have 15 minutes before your next call.”
  - “Follow up with Alex after yesterday’s meeting?”
- Trust & Transparency Logs (Digest)
  - Daily summary of Perin’s autonomous actions and outcomes.

### Tone & Brand

- Warm, neutral, efficient. Microcopy ensures the user stays in control:
  - ✅ “Shall I go ahead and confirm with Alex?”
  - ✅ “I’ve moved your call to 3 PM — tap to review.”
  - ❌ “Reminder: Meeting tomorrow.”

Enforce tone centrally so channels remain consistent.

## Delivery Rules

- Relevance Filter: Send only if action is required or value is added.
- Time Sensitivity: Honor timezone and DnD windows; schedule sends if needed.
- Channel Fallbacks: Mobile push → Web push → In-app; for critical events add Email/SMS (Phase 2+).
- Digest Mode: Batch non-urgent items into morning/evening summaries.

## Architecture Overview (aligned with current codebase)

- App Router API with NextAuth guardrails and standardized error handling.
  - Auth: `next-auth` (see `src/middleware.ts` and `AUTH_README.md`).
  - Error handling: `withErrorHandler` and `ErrorResponses` from `src/lib/utils/error-handlers.ts`.
  - Rate limiting/security headers: `src/middleware.ts`.
- Service layer (no direct fetches in components): `src/app/services/*`.
- Smart queries for DB access: `src/lib/queries/*`.
- Existing notifications placeholder:
  - API: `GET /api/notifications`, `POST /api/notifications/:id/read`
    - Files: `src/app/api/notifications/route.ts`, `src/app/api/notifications/[id]/read/route.ts`
  - Services: `src/app/services/notifications.ts`
  - Queries: `src/lib/queries/notifications.ts`
  - Types: `src/types/notifications.ts` (current `network.*` events)

### Target System Diagram

```
Event Sources (Network, Calendar, AI) → Notification Orchestrator
  → Policy Engine (Relevance, Tone, TTL, DnD, Dedup, Idempotency)
    → Channel Router (OneSignal push, In-app, Email/SMS)
      → Delivery Tracker (per-channel status, retries)
        → Persistence (notifications, deliveries, devices, prefs)
          → Digest Aggregator (scheduled)
```

## Data Model (incremental)

Existing table: `notifications` (see `src/lib/queries/notifications.ts`, `src/types/notifications.ts`).

Proposed additions (Phase 1–2):

- notification_devices
  - id, user_id, platform("web"|"ios"|"android"), onesignal_player_id, device_info(JSON), is_active, last_seen_at, created_at
- notification_preferences
  - user_id (PK), timezone, dnd(JSON: windows per weekday), channels(JSON: enable flags per type), digest(JSON: enabled, windows), updated_at
- notification_deliveries
  - id, notification_id, channel("mobile_push"|"web_push"|"email"|"sms"|"in_app"), status("queued"|"sent"|"delivered"|"failed"), provider_message_id, error, attempts, last_attempt_at, created_at
- notification_digests
  - id, user_id, window("morning"|"evening"|custom), scheduled_for, payload(JSON), status("pending"|"sent"|"skipped"), created_at

Type additions:

- Extend `Notification["type"]` to include actionable and reminder types beyond `network.*`:
  - `calendar.meeting.confirm_request`, `calendar.conflict.detected`, `calendar.meeting.reminder`
  - `assistant.suggestion.better_time`, `assistant.follow_up.suggested`
  - `system.digest.daily`

Status and action fields (Phase 1):

- Extend `notifications` table with:

  - `requires_action BOOLEAN DEFAULT false` — whether the user is expected to act
  - `is_resolved BOOLEAN DEFAULT false` — distinct from `is_read`; marks business resolution
  - `resolved_at TIMESTAMP NULL` — when the notification was resolved
  - `action_deadline_at TIMESTAMP NULL` — optional deadline for actionable items
  - `action_ref JSONB NULL` — optional reference to related entity (e.g., `{ "sessionId": "...", "connectionId": "..." }`)

- Behavioral rule:
  - Reading does not imply resolving. A notification with `requires_action = true` remains visible as unresolved until the user or system completes the action and sets `is_resolved = true`.

## API Surface (App Router)

Existing:

- `GET /api/notifications?unread=true|false` → list + unreadCount
- `POST /api/notifications/:id/read` → mark as read

Additions (Phase 1):

- `POST /api/notifications/devices/register` — save/update OneSignal player/device
  - Body: { platform, playerId, deviceInfo? }
  - Upsert into `notification_devices`
- `GET /api/notifications/preferences` — fetch user prefs/DnD
- `PUT /api/notifications/preferences` — update prefs/DnD/digest windows/channel toggles
- `POST /api/notifications/dispatch` — internal-only (server-to-server) trigger for an event payload
  - Validates event → policy engine → emits delivery jobs (Phase 2: queue)
- `POST /api/notifications/:id/resolve` — mark a notification resolved (business completion)
  - Body: optional `{ resolved: true }` for idempotency, server sets `is_resolved = true`, `resolved_at = now()`
- `GET /api/notifications?unresolved=true` — list only unresolved (and optionally `requiresAction=true`)

Additions (Phase 2):

- `POST /api/notifications/digest/schedule` — internal; create/update digest entries
- `POST /api/notifications/digest/send` — internal; invoked by cron/scheduler

All routes use NextAuth guards, error handler, and respect rate limiting/security headers from `src/middleware.ts`.

## Service Layer (client)

Keep components free of direct API calls. Extend `src/app/services/notifications.ts` with:

- `registerNotificationDeviceService(platform, playerId, deviceInfo?)`
- `getNotificationPreferencesService()`
- `updateNotificationPreferencesService(prefs)`
- Existing: `listNotificationsService(unreadOnly?)`, `markNotificationReadService(id)`
- New:
- `resolveNotificationService(id)`
- `listUnresolvedNotificationsService(requiresActionOnly = true)`

## Channel Providers

### OneSignal (Phase 1)

- Web push:
  - Add service worker files under `public/` per OneSignal setup (e.g., `OneSignalSDKWorker.js`, `OneSignalSDKUpdaterWorker.js`).
  - Initialize in a client provider; handle permission prompt UX.
  - On registration/update, call `POST /api/notifications/devices/register` to upsert `playerId`.
- Mobile push (React Native app):
  - Use OneSignal RN SDK to register device; send `playerId` to backend endpoint above.
- Backend delivery:
  - Secure server-side calls with OneSignal REST API key.
  - Track results in `notification_deliveries` with provider IDs and errors.

Environment variables (names illustrative):

- `NEXT_PUBLIC_ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`

## Trigger Sources (Phase 1 focus)

- Network feature (see `NETWORK_FEATURE.md`, `src/app/api/network/**`):
  - Connection invite → `network.connection.invite`
  - Invite accepted → `network.connection.accepted`
  - Session started → `network.session.started`
  - Proposals posted → actionable alert to counterpart (approve/select)
  - Confirm successful → `network.meeting.confirmed`
  - Cancel → `network.meeting.canceled`
- Calendar integration (see `src/lib/integrations/calendar/*`):
  - Conflicts detected → actionable alert
  - Confirm requests from counterpart → actionable alert
- Assistant suggestions (LangGraph; see `src/lib/ai/langgraph/*`):
  - “Found a better time” / “Suggest follow-up” → contextual update or actionable alert

Implementation pattern:

1. Event occurs in API/business logic → call `createNotification(userId, type, title, body, data)`.
2. Orchestrator evaluates policy (priority, DnD, TTL, dedupe).
3. Router selects channel(s) and sends via OneSignal; in-app as fallback.
4. Persist `notification_deliveries`; update `notifications.is_read` on user action.
5. For actionable items, keep `is_resolved = false` until the user acts (approve/decline/confirm), then set `is_resolved = true`.

## Relevance, DnD, and Timing

- Relevance: Drop non-actionable duplicates; collapse similar updates.
- DnD: Use `users.timezone` and `notification_preferences.dnd` windows to defer delivery.
- Time sensitivity:
  - High: send immediately, with fallback routing.
  - Medium/Low: prefer digest unless user opted into real-time.
- TTL: Expire time-sensitive alerts after a short window to avoid stale actions.

Unresolved policy:

- Unresolved actionable notifications remain highlighted in-app even if `is_read = true`.
- AI context loader will surface unresolved items at chat start to enable proactive reminders.

## Security, Privacy, and Copy Safety

- No sensitive payloads in push; include minimal context and a deep link to app.
- Idempotency on dispatch to avoid duplicate sends.
- Auditability: write trust & transparency logs; surface in daily digest.
- Respect authentication across all endpoints (NextAuth).

## Phases and Checkpoints

### Phase 1 — MVP (Weeks 1–2)

Deliverables:

- OneSignal integrated for web and RN; device registration endpoint implemented.
- In-app notification center (list, unread count, mark read) with clean UI.
- Trigger seeds from Network feature; updated titles/microcopy.
- Basic policy engine: relevance filter, priority handling, DnD + timezone.
- Delivery router: mobile push → web push → in-app; delivery tracking.

Checkpoints:

- Data: `notification_devices`, `notification_preferences`, `notification_deliveries` tables exist.
- API: devices register, prefs read/update, list/read, internal dispatch.
- Service layer: new client services exist and are used by UI (no direct fetches).
- Env: OneSignal keys configured; web service worker present.
- Acceptance: Receive a mobile/web push for invite/confirm; mark read syncs with UI; respect a DnD window.
- Unresolved: `requires_action` and `is_resolved` working end-to-end; unresolved items persist until resolved.

### Phase 2 — Growth (Weeks 3–5)

Deliverables:

- Personalization: tone/timing tuned per behavior; quiet hours and nudge timing.
- Digest mode: morning/evening digests with serverless cron; preview in-app.
- Expanded fallbacks: email for critical events if both push channels fail.
- Expanded types: conflict detection, reminders, assistant follow-ups.
- Observability: dashboards for delivery rates, failures, and notifications volume.

Checkpoints:

- Cron/schedule triggers wired (Vercel cron or worker); digest tables populated.
- Email fallback provider configured and tracked in `notification_deliveries`.
- Analytics events emitted for sends, opens, actions.

### Phase 3 — Scale (6+ Weeks)

Deliverables:

- Optional in-house notification engine for cost/control and deeper Perin context integration.
- Real-time AI decisioning for notification relevance and channel selection.
- Advanced batching, backoff, and multi-region delivery.

Checkpoints:

- Queue-based orchestration (BullMQ/Cloud Tasks/SQS) for high volume.
- ML features for relevance and send-time optimization.
- Multi-tenant and per-connection policy overrides.

## Implementation Notes (tie-in with current repo)

- API and Auth: Use NextAuth session checks and `withErrorHandler` consistently.
- Service layer only: extend `src/app/services/notifications.ts` and call from UI.
- Types: update `src/types/notifications.ts` with new `type` literals and fields `requires_action`, `is_resolved`, `resolved_at`, `action_deadline_at`, `action_ref`.
- Queries: add smart queries for devices, prefs, deliveries; add `markNotificationResolved(id, userId)`; reuse `query` with resilience.
- Middlewares: keep security headers and rate limits; add any notification-specific limits if needed.
- UI: build a `NotificationBell` + panel using existing UI primitives (`BottomSheet`, `Dock`, `SidebarRail`, `PerinStatus`). Tailwind v4.1 + CSS variables for theming.
  - UI distinction:
    - `Unread` vs `Read`
    - `Resolved` vs `Unresolved` (badge or filter). Reading does not auto-resolve.

## Acceptance Criteria (Phase 1)

- As a user, I can:
  - Receive a push on web and mobile for a connection invite and a meeting confirm.
  - See the same item in the in-app notification center.
  - Mark a notification as read and see unread count drop.
  - Set DnD and not receive pushes during that window; the item appears later or in a digest.
  - See actionable notifications remain flagged as unresolved until I approve/decline/confirm.
- As a developer, I can:

  - Trigger a dispatch via internal API and see delivery status tracked.
  - Observe structured logs for sends/failures.
  - Mark a notification as resolved via API and see it disappear from the unresolved list.

- As a user chatting with Perin:
  - If I have unresolved actionable items, Perin politely reminds me at the start of the chat and can deep-link me to resolve.

## Environment & Configuration

- Add to `.env.local` / deployment env:
  - `NEXT_PUBLIC_ONESIGNAL_APP_ID`
  - `ONESIGNAL_REST_API_KEY`
  - Optional: `NOTIFICATIONS_DIGEST_WINDOWS` (JSON), `NOTIFICATIONS_HIGH_PRIORITY_TTL_MS`

## Test Plan

- Unit: policy engine (DnD, relevance, TTL, fallback ordering), type guards.
- Integration: device registration, prefs CRUD, list/read, dispatch flow with mocked OneSignal.
- E2E: invite → push → in-app sync → mark read; confirm → push; DnD window respected.
- Unresolved state:
  - Unit: `markNotificationResolved` updates fields, read ≠ resolved.
  - Integration: `GET /api/notifications?unresolved=true` returns correct items.
  - AI: unresolved items are surfaced to the chat workflow and prompt the reminder copy.

## Rollout & Observability

- Gradual rollout by feature flag per user.
- Metrics: send rate, open rate, action rate, failure rate, retry counts, time-to-deliver.
- Logging: structured logs around dispatch and delivery callbacks.

## Future Work

- Rich actions in push (approve/decline) with secure deep links into `/network/sessions/:id`.
- SMS fallback for critical outage scenarios.
- Multi-lingual copy.
- Advanced user controls: per-connection overrides, per-type channel toggles.

## File Pointers

- API
  - `src/app/api/notifications/route.ts`
  - `src/app/api/notifications/[id]/read/route.ts`
  - (to add) `src/app/api/notifications/devices/register/route.ts`
  - (to add) `src/app/api/notifications/preferences/route.ts`
  - (internal) `src/app/api/notifications/dispatch/route.ts`
- Services
  - `src/app/services/notifications.ts`
- Queries
  - `src/lib/queries/notifications.ts`
- Types
  - `src/types/notifications.ts`
- Middleware & Auth
  - `src/middleware.ts`, `src/lib/auth.ts`
- Integrations
  - `src/lib/integrations/calendar/*`, `src/lib/integrations/gmail/*`, `src/lib/integrations/registry.ts`
- AI Workflow
  - `src/lib/ai/langgraph/*`
  - (to add) `src/lib/ai/langgraph/nodes/notifications-node.ts` or extend `memory-node.ts` to load unresolved actionable notifications into chat state (e.g., `state.memoryContext.notifications.unresolved` with safe limits)

---

This document is the single source of truth for the Notifications feature roadmap. Keep it updated as the implementation evolves.
