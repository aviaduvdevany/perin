import { getCalendarAvailability } from "@/lib/integrations/calendar/client";
import type { ConnectionConstraints } from "@/types/network";

export interface GenerateProposalsParams {
  userAId: string;
  userBId: string;
  durationMins: number;
  earliest?: string; // ISO
  latest?: string; // ISO
  tz?: string; // IANA
  constraintsA?: ConnectionConstraints;
  constraintsB?: ConnectionConstraints;
  limit?: number;
}

export interface TimeWindow {
  start: string;
  end: string;
}

const minutes = (n: number) => n * 60 * 1000;

function clampWindow(
  earliest?: string,
  latest?: string
): { start: Date; end: Date } {
  const now = new Date();
  const start = earliest
    ? new Date(earliest)
    : new Date(now.getTime() + minutes(60)); // default: 1h from now
  const end = latest
    ? new Date(latest)
    : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000); // default: +7d
  return { start, end };
}

function applyMinNotice(slotStart: Date, minNoticeHours?: number): boolean {
  if (!minNoticeHours) return true;
  const now = new Date();
  return slotStart.getTime() >= now.getTime() + minutes(minNoticeHours * 60);
}

function withinWorkingHours(
  date: Date,
  tz: string | undefined,
  working?: ConnectionConstraints["workingHours"]
): boolean {
  if (!working) return true;
  // Basic check in local time (MVP): we assume server time approximates; for production use proper TZ math
  const hours = date.getHours();
  const [startH, startM] = (working.start || "00:00")
    .split(":")
    .map((x) => parseInt(x, 10));
  const [endH, endM] = (working.end || "23:59")
    .split(":")
    .map((x) => parseInt(x, 10));
  const weekday = date.getDay(); // 0-6
  if (
    working.weekdays &&
    working.weekdays.length > 0 &&
    !working.weekdays.includes(weekday)
  ) {
    return false;
  }
  const afterStart =
    hours > startH || (hours === startH && date.getMinutes() >= startM);
  const beforeEnd =
    hours < endH || (hours === endH && date.getMinutes() <= endM);
  return afterStart && beforeEnd;
}

function isFreeAt(
  time: Date,
  busy: Array<{ start: string; end: string }>,
  durationMs: number
): boolean {
  const startMs = time.getTime();
  const endMs = startMs + durationMs;
  for (const b of busy) {
    const bStart = new Date(b.start).getTime();
    const bEnd = new Date(b.end).getTime();
    if (startMs < bEnd && endMs > bStart) return false; // overlap
  }
  return true;
}

function* iterateSlots(
  start: Date,
  end: Date,
  stepMs: number
): Generator<Date> {
  let t = new Date(start);
  while (t.getTime() + stepMs <= end.getTime()) {
    yield new Date(t);
    t = new Date(t.getTime() + stepMs);
  }
}

export const generateMutualProposals = async (
  params: GenerateProposalsParams
): Promise<TimeWindow[]> => {
  const {
    userAId,
    userBId,
    durationMins,
    earliest,
    latest,
    tz,
    constraintsA,
    constraintsB,
    limit = 10,
  } = params;
  const window = clampWindow(earliest, latest);

  // Fetch busy windows for both users
  const [busyA, busyB] = await Promise.all([
    getCalendarAvailability(
      userAId,
      window.start.toISOString(),
      window.end.toISOString()
    ),
    getCalendarAvailability(
      userBId,
      window.start.toISOString(),
      window.end.toISOString()
    ),
  ]);

  const durationMs = minutes(durationMins);
  const stepMs = minutes(30);

  const results: TimeWindow[] = [];
  for (const t of iterateSlots(window.start, window.end, stepMs)) {
    if (
      !applyMinNotice(t, constraintsA?.minNoticeHours) ||
      !applyMinNotice(t, constraintsB?.minNoticeHours)
    ) {
      continue;
    }
    if (
      !withinWorkingHours(t, tz, constraintsA?.workingHours) ||
      !withinWorkingHours(t, tz, constraintsB?.workingHours)
    ) {
      continue;
    }
    const okA = isFreeAt(t, busyA.busy, durationMs);
    if (!okA) continue;
    const okB = isFreeAt(t, busyB.busy, durationMs);
    if (!okB) continue;

    const startISO = new Date(t).toISOString();
    const endISO = new Date(t.getTime() + durationMs).toISOString();
    results.push({ start: startISO, end: endISO });
    if (results.length >= limit) break;
  }

  return results;
};
