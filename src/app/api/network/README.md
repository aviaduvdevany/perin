# Perin Network API (MVP)

Endpoints:

- POST `/api/network/connections` — invite connection { targetUserId, scopes, constraints? }
- GET `/api/network/connections` — list my connections
- POST `/api/network/connections/:id/accept` — accept invite and set permissions
- PUT `/api/network/connections/:id/permissions` — update scopes/constraints
- DELETE `/api/network/connections/:id` — revoke connection
- POST `/api/network/sessions` — start negotiation session
- GET `/api/network/sessions/:id` — get session details
- POST `/api/network/sessions/:id/proposals` — compute and send availability-based time proposals
- POST `/api/network/sessions/:id/confirm` — two-phase booking: create events on both calendars (rollback on failure)
- POST `/api/network/sessions/:id/messages` — post structured agent message
- GET `/api/network/sessions/:id/messages` — transcript

All endpoints require authentication and enforce membership/permission checks.
