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
    - `GET/PUT /api/network/connections/:id/permissions` (get/update permissions & constraints)
    - `DELETE /api/network/connections/:id` (revoke)
  - Sessions
    - `POST /api/network/sessions` (start)
    - `GET /api/network/sessions/:id` (status)
    - `POST /api/network/sessions/:id/proposals` (compute and send availability-based proposals) [idempotent]
    - `POST /api/network/sessions/:id/confirm` (two-phase booking with rollback, idempotency, audit)
  - Messages
    - `POST /api/network/sessions/:id/messages` (post structured agent message)
    - `GET /api/network/sessions/:id/messages` (transcript)
  - Doc: `src/app/api/network/README.md`
- Service Layer (client, no direct fetch)
  - `src/app/services/network.ts` (connections, permissions, sessions, messages, proposals, confirm)
  - `src/app/services/notifications.ts`
- Notifications (DONE)
  - Types/queries/routes/services; wired into: invite, accept, session start, message, proposals, confirm
- Scheduling (DONE for MVP)
  - Mutual availability proposals: `src/lib/network/scheduling.ts`
  - Confirm endpoint with two-phase booking, rollback, idempotency, audit
  - Calendar client extended with `deleteCalendarEvent`
- Minimal UI (MVP)
  - `src/app/network/page.tsx`: Invite/Accept/Revoke connections; Notifications list with mark-read
  - `src/app/network/sessions/page.tsx`: Start session, load, send proposals, pick and confirm, view transcript
  - `src/app/network/permissions/page.tsx`: View/edit scopes and constraints
- LangGraph Wiring (MVP)
  - `src/lib/ai/langgraph/nodes/network-negotiation-node.ts`: starts session + optional proposals
  - Integrated into `executePerinChatWithLangGraph` when specialization === "scheduling"; current step surfaced to OpenAI system prompt

## Architecture Overview

- Permissioned connections between users’ Perins
- Structured agent-to-agent messages (`proposal`, `accept`, `confirm`, `cancel`, `error`)
- Calendar-centric MVP: free/busy → proposals → two-phase booking (both calendars) → rollback on failure
- Resilience: idempotency keys, audit logs, notifications at each step

## End-to-End Flow

1. A invites B → B accepts (permissions & constraints applied)
2. A starts a session with B → notification to B
3. A sends proposals (mutual availability) → notification to B
4. Either A or B confirms a chosen slot → events created on both calendars → notifications → audit
5. On failure at any point in booking, rollback and mark session error

## How to Test (E2E)

- Connections
  - Visit `/network` and invite a target user by ID
  - Switch to target user; accept the invite; verify notifications
- Permissions
  - Visit `/network/permissions`, load the `connectionId`, enable scopes:
    - `calendar.availability.read`, `calendar.events.propose`, and either `calendar.events.write.confirm` or `calendar.events.write.auto`
  - Adjust constraints as needed; Save
- Sessions & Scheduling
  - Visit `/network/sessions`, input `connectionId` and `counterpartUserId`; Start
  - Set `durationMins`; Send Proposals; verify notification on counterpart
  - Pick a proposed slot (Pick First From Latest) and Confirm
  - Verify events exist on both users’ calendars; notifications and transcript are updated

## API / UI Map

- API: see `src/app/api/network/README.md` for the full list
- UI:
  - `/network` – connections + notifications
  - `/network/permissions` – edit connection permissions/constraints
  - `/network/sessions` – start session, send proposals, confirm, transcript

## Permissions & Scopes (MVP)

- Proposals require: `calendar.availability.read` + `calendar.events.propose`
- Confirm requires: `calendar.events.write.confirm` (manual) or `calendar.events.write.auto` (auto-book)
- Constraints (per-connection): working hours, min notice, meeting length, auto-scheduling

## Data Model Summary

- `user_connections` – relationship + status
- `connection_permissions` – scopes + constraints (JSONB)
- `agent_sessions` – negotiation sessions + outcome + TTL
- `agent_messages` – structured messages + (optional) dedupe key
- `audit_logs` – action, resource, details; confirm emits logs
- `idempotency_keys` – dedupe proposals/confirm
- `notifications` – in-app notifications for each key event

## Known Limitations (MVP)

- Counterpart detection in chat is regex-based; UI should pass explicit IDs
- Chat-triggered scheduling uses server fetch and may need auth cookie propagation; use the UI pages for now
- No realtime push (polling only); no email notifications yet

## What’s Left (Final MVP polish)

- Intent/Entity extraction
  - Improve extraction for `counterpartUserId`, `connectionId`, `durationMins` (replace regex stub with a robust parser or UI-assisted parameters)
- UI polish
  - Session page: accept alternative proposal flow; better validation and toasts
  - Connections page: quick links into session and permissions editors
- Hardening
  - Re-validate scopes on each action path (2nd pass review)
  - Idempotency coverage on proposal messages and retries (already added for proposals/confirm)
  - Edge cases: expired sessions, revoked connections mid-flow, conflicts between proposal and confirm times
  - Basic rate limits on network endpoints (per-user per-minute)
- Observability & Tests
  - Add basic integration logs for session lifecycle; add unit tests for scheduling utils
  - Smoke tests for invite → accept → session → proposals → confirm
- Optional (Post-MVP)
  - Realtime push (Ably/Pusher/Vercel Realtime) instead of polling
  - Email notifications for critical events
  - Multi-party scheduling and resources
  - Cross-tenant federation

## Phases & Milestones

- Phase 1: Core plumbing (DONE)
- Phase 2: Notifications (DONE)
- Phase 3: Scheduling & Booking (DONE for MVP)
- Phase 4: UI & UX (MVP done; polish ongoing)
- Phase 5: LangGraph Wiring (DONE for MVP)

## Notifications API

- `GET /api/notifications` (list, supports `?unread=true`)
- `POST /api/notifications/:id/read` (mark read)


## Test Plan (MVP)

- Invite: A → B; B sees notification; B accepts → A sees acceptance
- Session: A starts session; B notified
- Proposals: A sends proposals; B notified; proposals visible in transcript
- Confirm: Either side confirms; two-phase events created; notify both; rollback on failure
