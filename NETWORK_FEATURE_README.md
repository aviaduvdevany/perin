# Perin Network Feature (MVP)

This document tracks the plan, stages, and checklist for the Perin-to-Perin network (permissioned agent-to-agent scheduling) and records what has been implemented vs what remains.

## Scope

Enable users to connect their Perins via explicit permissions so the agents can exchange proposals and autonomously schedule meetings using calendar access.

## What’s Done

- Types
  - `src/types/network.ts` (scopes, constraints, connections, permissions, sessions, messages)
  - Barrel export updated in `src/types/index.ts`
- Tables (constants)
  - `src/lib/tables.ts`: `USER_CONNECTIONS_TABLE`, `CONNECTION_PERMISSIONS_TABLE`, `AGENT_SESSIONS_TABLE`, `AGENT_MESSAGES_TABLE`, `AUDIT_LOGS_TABLE`, `IDEMPOTENCY_KEYS_TABLE`
- Smart Queries
  - `src/lib/queries/network.ts`: connection CRUD, permission upsert, session CRUD, message CRUD, audit logs, idempotency keys
- API Endpoints (protected via NextAuth)
  - Connections
    - `POST /api/network/connections` (invite)
    - `GET /api/network/connections` (list)
    - `POST /api/network/connections/:id/accept` (accept + set permissions)
    - `PUT /api/network/connections/:id/permissions` (update permissions)
    - `DELETE /api/network/connections/:id` (revoke)
  - Sessions
    - `POST /api/network/sessions` (start)
    - `GET /api/network/sessions/:id` (status)
    - `POST /api/network/sessions/:id/proposals` (compute and send availability-based proposals)
    - `POST /api/network/sessions/:id/confirm` (two-phase booking with rollback)
  - Messages
    - `POST /api/network/sessions/:id/messages` (post structured agent message)
    - `GET /api/network/sessions/:id/messages` (transcript)
  - Doc: `src/app/api/network/README.md`
- Service Layer (client, no direct fetch)
  - `src/app/services/network.ts` (connections, permissions, sessions, messages, proposals, confirm)
- LangGraph
  - Stub node `src/lib/ai/langgraph/nodes/network-negotiation-node.ts` (to integrate later)
- Notifications (DONE)
  - Types: `src/types/notifications.ts`
  - Queries: `src/lib/queries/notifications.ts`
  - API: `GET /api/notifications`, `POST /api/notifications/:id/read`
  - Service: `src/app/services/notifications.ts`
  - Wired into network actions (invite, accept, session start, message, proposals, confirm)
- Scheduling (IN PROGRESS)
  - Mutual availability proposals: `src/lib/network/scheduling.ts`
  - Confirm endpoint with two-phase booking and rollback
  - Calendar client extended with `deleteCalendarEvent`

## What’s Left (MVP)

1. UI Minimal Surface (NEXT)
   - Connections list/invite/accept/revoke + scopes/constraints
   - Notifications badge + list + CTA buttons (Accept invite, Review proposals, Confirm)
   - Session transcript timeline with actions (Send proposals, Accept/Confirm, Cancel)
2. LangGraph Integration
   - Route “schedule with X” intents into the network flow
   - Call session/message/proposal/confirm APIs from node; update state for observability
3. Hardening
   - Scope checks on each action path
   - Idempotency key usage on booking
   - Edge cases: expired sessions, revoked connections mid-flow

## Phases & Milestones

- Phase 1: Core plumbing (DONE)
  - Types, queries, routes, service layer, SQL for core tables
- Phase 2: Notifications (DONE)
  - In‑app notifications + wiring to network actions
- Phase 3: Scheduling & Booking (MOSTLY DONE)
  - Availability-based proposals and booking (confirm with rollback)
- Phase 4: UI & UX (NEXT)
  - Connections, notifications, session transcript, minimal CTAs
- Phase 5: LangGraph Wiring
  - Intent detection → network nodes → API orchestration

## Notifications API

- `GET /api/notifications` (list, supports `?unread=true`)
- `POST /api/notifications/:id/read` (mark read)

## SQL: Notifications Table

Run the SQL below in your DB.

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at DESC);
```

## Test Plan (MVP)

- Invite flow: A → B; B sees notification; B accepts → A sees acceptance
- Session flow: A starts session; B notified
- Proposals: A sends proposals; B notified; proposals visible in transcript
- Confirm: Either side confirms; two-phase events created; notifications sent; rollback if any failure

## Future (Post‑MVP)

- Realtime push (Ably/Pusher/Vercel Realtime)
- Email notifications for critical actions
- Multi‑party scheduling and room resources
- Cross‑tenant federation with signed protocol keys
