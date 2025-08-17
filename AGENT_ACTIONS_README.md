# 🤖 Perin Agent Actions — LLM Tool-Calling Architecture

This document defines a modular, reusable, future‑proof architecture that lets Perin understand natural language, decide on actions, execute them safely in the backend, and then respond to the user. It generalizes beyond scheduling/negotiation and becomes the default “LLM planner + tool executor” loop for the app.

The goal: eliminate brittle regex parsing, let the LLM propose structured actions, and keep strong server guardrails (permissions, scopes, idempotency, audit, notifications).

---

## ✅ Outcomes

- The LLM interprets a message and emits a structured tool call (action + JSON args).
- Backend executes the tool via typed handlers and returns a result payload.
- The result is fed back to the LLM, which produces a user‑facing reply and follow‑ups.
- All operations are safe: membership, scopes, rate limits, idempotency, audit logs, and notifications remain server‑enforced.

---

## 🧭 High-Level Flow

1. User → Perin (natural language)
2. LLM Planner → emits a tool call, e.g. `network.schedule_meeting` with normalized params
3. Tool Executor → resolves counterpart/IDs, validates permissions, performs the operation
4. Tool Result → sent back to the LLM as context
5. LLM Responder → generates the final reply and next‑step prompts

Notes:

- If the LLM lacks required parameters, the tool returns a `needs` object; the LLM asks clarifying questions.
- If no tool is relevant, the LLM streams a normal conversational answer.

---

## 🧱 Architecture Changes (Where to implement)

The current LangGraph pipeline runs in `src/lib/ai/langgraph/` and is invoked by `POST /api/ai/chat`.

- `src/app/api/ai/chat/route.ts`

  - Entry point. Decides whether to enable tool‑calling based on intent heuristics or always (recommended). Passes control to the LangGraph executor.

- `src/lib/ai/langgraph/index.ts`

  - Add an agent loop that supports tool‑calling:
    - Phase A: Planner completion with OpenAI tools enabled.
    - If tool call(s) present → execute via Tool Executor → append tool result messages.
    - Phase B: Responder completion (stream to client) summarizing outcomes / asking clarifications.
  - Continue to load memory, integration contexts, and notifications as today.

- `src/lib/ai/tools/` (new)

  - `registry.ts`: central registry that maps tool names to server handlers and Zod schemas.
  - `types.ts`: shared types for tool metadata, inputs, outputs, and error/needs envelopes.
  - `network.ts`: tool handlers for the Network feature (e.g., `schedule_meeting`, `confirm_meeting`).
  - Future: `email.ts`, `calendar.ts`, `files.ts`, etc.

- `src/lib/ai/langgraph/nodes/tool-executor-node.ts` (new)

  - Executes one or more tool calls from the LLM:
    - Validates args via Zod.
    - Ensures membership, scopes, idempotency.
    - Calls existing business logic (queries/services) rather than hitting API routes.
    - Returns a structured result: `{ ok, data, needs?, error? }`.

- Reuse existing business logic
  - Network: `src/lib/queries/network.ts`, `src/lib/network/scheduling.ts`, notifications in `src/lib/queries/notifications.ts`.
  - Do NOT accept IDs from the LLM. Resolve names/emails → `connectionId`/`counterpartUserId` server‑side (we already have fuzzy resolution in `network-negotiation-node.ts`).

---

## 🧩 Tool Interface (LLM‑visible)

All tools follow a consistent JSON schema (Zod on server; JSON Schema for OpenAI).

Example: `network.schedule_meeting`

```json
{
  "type": "function",
  "function": {
    "name": "network_schedule_meeting",
    "description": "Start a negotiation session and propose slots to a counterpart.",
    "parameters": {
      "type": "object",
      "properties": {
        "counterpart": {
          "type": "string",
          "description": "Human name or email mentioned by the user (e.g., 'Aviad')."
        },
        "durationMins": { "type": "integer", "minimum": 5, "maximum": 240 },
        "startWindow": {
          "type": "string",
          "description": "ISO start of candidate window (optional)."
        },
        "endWindow": {
          "type": "string",
          "description": "ISO end of candidate window (optional)."
        },
        "tzHint": {
          "type": "string",
          "description": "IANA timezone when user mentions 'Israel time' etc. (optional)."
        }
      },
      "required": ["counterpart"]
    }
  }
}
```

Server return envelope (all tools):

```ts
type ToolEnvelope<T> =
  | { ok: true; data: T; needs?: undefined; error?: undefined }
  | { ok: false; needs: Record<string, boolean>; error?: undefined }
  | { ok: false; error: { code: string; message: string }; needs?: undefined };
```

For `schedule_meeting`, `data` should include `{ sessionId, proposals: TimeWindow[], counterpartUserId, connectionId, durationMins }`.

---

## 🔒 Guardrails & Safety (non‑negotiable)

- No IDs from the model. Only human references (name/email). Server resolves to `connectionId`/`counterpartUserId`.
- Membership + status checks on every action (active connection only).
- Scope enforcement: proposals require `calendar.availability.read` and `calendar.events.propose`; confirm requires `calendar.events.write.confirm|auto`.
- Idempotency + concurrency: keep existing logic for proposals/confirm (409 on duplicates/races); two‑phase booking with rollback on failure.
- Rate limiting, audit logs, and notifications remain in place.

---

## 🧪 Execution Modes (Streaming vs Act‑first)

- Act‑first (recommended default for actionable intents):

  - Hold user‑visible streaming until tools complete or we detect missing info.
  - Then stream a concise summary and next steps.

- Talk‑first (for chit‑chat or when no tools apply):
  - Stream reply immediately (current behavior).

Decision: Use a lightweight intent heuristic (already in `POST /api/ai/chat`) to prefer Act‑first for scheduling/coordination.

---

## 🗂️ File Layout (proposed)

```
src/
  lib/
    ai/
      langgraph/
        index.ts                   # orchestrates planner → tools → responder
        nodes/
          tool-executor-node.ts    # executes tool calls; returns envelopes
          notifications-node.ts    # existing
          notifications-action-node.ts
          network-negotiation-node.ts  # kept for reuse (see below)
      tools/
        registry.ts                # OpenAI tool specs + server handlers map
        types.ts                   # ToolEnvelope, ToolSpec, etc.
        network.ts                 # schedule_meeting, confirm_meeting, ...
    network/
      scheduling.ts                # existing mutual availability
    integrations/
      calendar/*                   # existing calendar client
    queries/
      network.ts                   # existing smart queries
      notifications.ts             # existing
```

Notes:

- The existing `network-negotiation-node.ts` contains logic we can reuse inside `tools/network.ts` (e.g., fuzzy counterpart resolution, notifications). We will gradually migrate its logic into tool handlers to avoid duplication.

---

## 🔧 Implementation Plan (Checkpoints)

### Phase 1 — Infrastructure (tool‑calling loop)

1. Tools registry

   - Create `src/lib/ai/tools/types.ts` with `ToolEnvelope`, `ToolHandler`, `ToolSpec` types.
   - Create `src/lib/ai/tools/registry.ts` exporting:
     - OpenAI tool specs array (JSON schema) for planner.
     - Server‑side handlers map `{ [name]: ToolHandler }`.

2. Network tools (MVP)

   - `network_schedule_meeting` handler in `src/lib/ai/tools/network.ts`:
     - Resolve `counterpart` → `{ connectionId, counterpartUserId }` using current DB queries.
     - Validate scopes via existing `network` queries/helpers.
     - Generate proposals via `lib/network/scheduling.ts`.
     - Create session + agent message + actionable notifications.
     - Return `{ ok: true, data: { sessionId, proposals, ... } }`.
     - If missing `durationMins`, return `{ ok: false, needs: { duration: true } }`.

3. Tool‑executor node

   - Add `nodes/tool-executor-node.ts` that:
     - Accepts array of `tool_calls` emitted by OpenAI.
     - Validates args (Zod) and runs corresponding handlers.
     - Produces assistant “tool” messages for the second LLM pass (responder).

4. Orchestrator updates

   - In `langgraph/index.ts`, split current single streaming into two phases:
     - Planner (tools enabled, non‑streaming) → collect tool calls.
     - Execute tools → append tool result messages.
     - Responder (streaming) → produce final user text.
   - Preserve reauth control tokens for Gmail/Calendar as today.

5. Chat route toggle

   - In `POST /api/ai/chat`, enable tool mode by default for actionable intents (scheduling/coordination) using the existing heuristic.

6. Observability
   - Log tool invocations, durations, envelopes, and outcomes.

Acceptance for Phase 1:

- From chat only, “Set a 30‑minute meeting with Aviad tomorrow between 12:00–14:00 Israel time” creates a session, sends proposals, and notifies Aviad. The reply summarizes what happened or asks for the missing field (e.g., duration).

### Phase 2 — Expand and Consolidate

7. Additional tools

   - `network_confirm_meeting(sessionId, selectionIndex|start,end)` → two‑phase booking; re‑checks free/busy; updates transcript and notifications.
   - `notifications_resolve(notificationId)` → resolve actionable items.
   - Optional: `integrations_connect(type)` → initiate OAuth flow via in‑app action token.

8. Migrate node logic

   - Move reusable pieces from `network-negotiation-node.ts` into tool handlers or shared helpers to avoid duplication.

9. Prompting

   - Provide tool‑use guidelines in the system prompt: prefer tools for actionable intents; return missing fields via clarifying questions; never fabricate IDs; prefer counterpart names/emails.

10. Error policy

- Standardize error codes (`UNAUTHORIZED`, `SCOPES_MISSING`, `CONNECTION_INACTIVE`, `RATE_LIMITED`, etc.).
- Map to user‑friendly copy via the responder pass.

Acceptance for Phase 2:

- Confirm flow works end‑to‑end from chat; unresolved/actionable notifications can be resolved via chat tool calls; copy is consistent.

### Phase 3 — Quality, Safety, and Scale

11. Telemetry and metrics

- Counters for tool calls, success rate, missing‑field loops, average time‑to‑confirm, failure reasons.

12. Testing

- Unit tests for tool handlers (Zod validation, guardrails, idempotency).
- Integration tests for planner→executor→responder loop (mock OpenAI).
- E2E smoke for negotiation and confirm (happy path + conflicts).

13. Caching and rate limiting

- Tool‑level rate limits (per tool, per user) using `src/lib/utils/rate-limit.ts`.

14. Multi‑model and fallback

- Planner on a smaller model; responder on a larger model; circuit breaker remains.

---

## 🧪 Developer Quickstart (Tools)

1. Define a tool

```ts
// src/lib/ai/tools/network.ts
export const scheduleMeetingSpec = {
  /* OpenAI JSON schema as above */
};

export const scheduleMeetingHandler: ToolHandler<
  ScheduleArgs,
  ScheduleResult
> = async (ctx, args) => {
  // ctx has userId, conversationContext, memory, etc.
  // 1) Resolve counterpart → { connectionId, counterpartUserId }
  // 2) Validate scopes and active connection
  // 3) Generate proposals and persist session/message/notifications
  // 4) Return envelope
  return {
    ok: true,
    data: {
      /* ... */
    },
  };
};
```

2. Register it

```ts
// src/lib/ai/tools/registry.ts
export const TOOL_SPECS = [scheduleMeetingSpec /*, more */];
export const TOOL_HANDLERS = {
  network_schedule_meeting: scheduleMeetingHandler,
} as const;
```

3. Execute in LangGraph

```ts
// planner pass: openai call with tools: TOOL_SPECS, tool_choice: "auto"
// if tool_calls → run tool-executor-node → append results → responder pass
```

---

## 📌 Notes for AI (prompt hints)

- Prefer tools for actionable intents (scheduling, coordination, notifications).
- If information is missing, ask one concise clarifying question and then call the tool.
- Never fabricate IDs; pass human names/emails; the server resolves securely.
- Respect timezones explicitly; if the user mentions a region (e.g., “Israel time”), set `tzHint`.
- After actions, summarize what you did and what happens next.

---

## 📜 Migration Strategy

- Keep current UI flows intact. The chat tools call the same underlying business logic and produce the same notifications/transcripts.
- Gradually move bespoke parsing from `network-negotiation-node.ts` into tool handlers. Keep a thin compatibility path during migration.
- Do not add direct fetches in components; continue using the service layer for UI flows.

---

## 🧷 Open Questions / Decisions

- Default to Act‑first for intents matched by current heuristic in `POST /api/ai/chat`? (Recommended)
- Allow multiple tool calls in a single turn (e.g., schedule + email summary)? Start with one call, then expand.
- Where to place system‑wide copy for errors/clarifications? Proposal: responder templates in `langgraph/index.ts`.

---

## 📦 Deliverables Checklist

- [ ] `src/lib/ai/tools/types.ts` (envelopes, handler context)
- [ ] `src/lib/ai/tools/registry.ts` (specs + handlers)
- [ ] `src/lib/ai/tools/network.ts` (`schedule_meeting`, `confirm_meeting`)
- [ ] `src/lib/ai/langgraph/nodes/tool-executor-node.ts`
- [ ] `src/lib/ai/langgraph/index.ts` orchestrator updated for planner→executor→responder
- [ ] `src/app/api/ai/chat/route.ts` enables tool mode for actionable intents
- [ ] Telemetry/logging for tool calls
- [ ] Unit/integration tests

---

## 🎯 Acceptance (MVP)

- From chat alone, a user request like “Can you set a half‑hour meeting with Aviad tomorrow between 12:00 and 14:00 Israel time?” triggers `network_schedule_meeting`, creates a session, sends proposals, and produces a clear assistant response. If info is missing, the assistant asks and proceeds once answered.

---

Last updated: 2025‑08
