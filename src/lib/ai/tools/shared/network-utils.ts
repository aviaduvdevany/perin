/**
 * Shared Network Utilities
 *
 * Common utilities extracted from network-negotiation-node.ts to avoid duplication
 * between the legacy node and the new tool handlers.
 */

import * as networkQueries from "@/lib/queries/network";
import * as userQueries from "@/lib/queries/users";

/**
 * Extract scheduling hints from conversation text
 */
export function extractSchedulingHints(
  text: string,
  userTz?: string
): {
  durationMins?: number;
  earliest?: string;
  latest?: string;
  tz?: string;
} {
  const lower = text.toLowerCase();

  // Extract duration
  const durationMatch = lower.match(
    /(\d{1,3})\s*(min|mins|minute|minutes|hour|hours|hr|hrs|h)\b/
  );
  if (durationMatch) {
    const qty = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2];
    const minutes = unit.startsWith("min") || unit === "m" ? qty : qty * 60; // treat any hour unit as hours
    const range = extractSimpleTimeRange(lower, userTz);
    return { durationMins: Math.max(5, Math.min(240, minutes)), ...range };
  }

  // Try to extract a simple time range even without duration
  const rangeOnly = extractSimpleTimeRange(lower, userTz);
  return { ...rangeOnly };
}

/**
 * Extract simple time range from text
 */
export function extractSimpleTimeRange(
  text: string,
  userTz?: string
): { earliest?: string; latest?: string; tz?: string } {
  // Support phrases like "on sunday between 13:00 and 17:00" or "sunday 1pm-5pm"
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayIdx = dayNames.findIndex((d) => text.includes(d));

  // Match time range
  const timeRe =
    /(?:(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)\s*(?:-|to|and|\u2013|\u2014|\s+to\s+)\s*(?:(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)/;
  const m = text.match(timeRe);
  if (dayIdx === -1 || !m) return {};

  const [, h1s, m1s, ap1, h2s, m2s, ap2] = m;
  const h1 = parseInt(h1s, 10);
  const min1 = m1s ? parseInt(m1s, 10) : 0;
  const h2 = parseInt(h2s, 10);
  const min2 = m2s ? parseInt(m2s, 10) : 0;

  function to24(h: number, ap?: string | null): number {
    if (!ap) return h; // already 24h
    const a = ap.toLowerCase();
    if (a === "am") return h % 12;
    if (a === "pm") return (h % 12) + 12;
    return h;
  }

  const th1 = to24(h1, ap1);
  const th2 = to24(h2, ap2);

  // Compute the next occurrence of the specified weekday
  const now = new Date();
  const today = now.getDay();
  let delta = dayIdx - today;
  if (delta <= 0) delta += 7;

  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + delta,
    0,
    0,
    0,
    0
  );

  const earliest = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    th1,
    min1,
    0,
    0
  );
  const latest = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    th2,
    min2,
    0,
    0
  );

  return {
    earliest: earliest.toISOString(),
    latest: latest.toISOString(),
    tz: userTz || "UTC",
  };
}

/**
 * Resolve counterpart by fuzzy-matching conversation text against connected users
 */
export async function resolveCounterpart(
  currentUserId: string,
  conversationText: string
): Promise<
  | {
      chosen: { connectionId: string; counterpartUserId: string; name: string };
    }
  | {
      candidates: Array<{
        connectionId: string;
        counterpartUserId: string;
        name: string;
      }>;
    }
  | { none: true }
> {
  // Load connections directly from DB
  const connections = await networkQueries.listConnectionsForUser(
    currentUserId
  );

  // Build counterpart list with names
  const candidates: Array<{
    connectionId: string;
    counterpartUserId: string;
    name: string;
  }> = [];
  const text = conversationText.toLowerCase();

  for (const c of connections || []) {
    const counterpartId =
      c.requester_user_id === currentUserId
        ? c.target_user_id
        : c.requester_user_id;
    if (!counterpartId) continue;

    // Fetch user profile to get a human name
    try {
      const user = await userQueries.getUserById(counterpartId);
      const name: string = (
        (user && typeof user.name === "string" && user.name) ||
        (user && typeof user.email === "string" && user.email) ||
        counterpartId
      ).toString();
      candidates.push({
        connectionId: c.id,
        counterpartUserId: counterpartId,
        name,
      });
    } catch {
      // ignore failed user lookups
    }
  }

  if (candidates.length === 0) return { none: true };

  // Fuzzy filter by includes on full name or first/last token
  const tokens = text
    .replace(/[^a-z0-9@.\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-15); // last tokens likely contain the referenced name

  const scored = candidates.map((cand) => {
    const n = cand.name.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (!t || t.length < 2) continue;
      if (n.includes(t)) score += Math.min(t.length, 5);
    }
    return { cand, score };
  });

  // Prefer best single match; if tie for top, ask user to choose
  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0 || scored[0].score === 0) {
    return { candidates: candidates.slice(0, 5) };
  }

  const top = scored[0];
  const second = scored[1];
  if (!second || top.score - second.score >= 2) {
    return { chosen: top.cand };
  }

  const tiedTop = scored
    .filter((s) => s.score === top.score)
    .map((s) => s.cand);
  return { candidates: tiedTop.slice(0, 5) };
}
