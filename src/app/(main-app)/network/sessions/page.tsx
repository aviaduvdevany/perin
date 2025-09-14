"use client";

import { useEffect, useMemo, useState } from "react";
import {
  startNetworkSessionService,
  getNetworkSessionService,
  getNetworkTranscriptService,
  sendProposalsService,
  confirmMeetingService,
} from "@/app/(main-app)/services/network";

interface ProposalMessagePayload {
  proposals: Array<{ start: string; end: string; tz?: string }>;
  durationMins: number;
}

type TranscriptMessage = {
  id: string;
  type: string;
  payload: unknown;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
};
type SessionType = {
  id: string;
  status: string;
  outcome?: { selectedSlot?: { start: string; end: string } };
} | null;

export default function SessionsPage() {
  const [connectionId, setConnectionId] = useState("");
  const [counterpartUserId, setCounterpartUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [loadedSessionId, setLoadedSessionId] = useState<string>("");
  const [session, setSession] = useState<SessionType>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proposal form
  const [durationMins, setDurationMins] = useState<number>(30);
  const [earliest, setEarliest] = useState<string>("");
  const [latest, setLatest] = useState<string>("");
  const [tz, setTz] = useState<string>("UTC");

  // Confirm form
  const [confirmStart, setConfirmStart] = useState<string>("");
  const [confirmEnd, setConfirmEnd] = useState<string>("");
  const [confirmTz, setConfirmTz] = useState<string>("UTC");

  const proposalMessages = useMemo(() => {
    return transcript.filter((m) => m.type === "proposal");
  }, [transcript]);

  useEffect(() => {
    if (!loadedSessionId) return;
    const fetchData = async () => {
      try {
        const s = await getNetworkSessionService(loadedSessionId);
        setSession(s.session);
        const t = await getNetworkTranscriptService(loadedSessionId);
        setTranscript(t.messages || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, [loadedSessionId]);

  const handleStartSession = async () => {
    setError(null);
    if (!connectionId || !counterpartUserId) return;
    setLoading(true);
    try {
      const res = await startNetworkSessionService({
        type: "schedule_meeting",
        counterpartUserId,
        connectionId,
      });
      const newId = res.session?.id as string;
      setSessionId(newId);
      setLoadedSessionId(newId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSession = async () => {
    if (!sessionId) return;
    setLoadedSessionId(sessionId);
  };

  const handleSendProposals = async () => {
    setError(null);
    if (!loadedSessionId) return;
    setLoading(true);
    try {
      await sendProposalsService(loadedSessionId, {
        durationMins,
        earliest: earliest || undefined,
        latest: latest || undefined,
        tz,
        limit: 5,
      });
      const t = await getNetworkTranscriptService(loadedSessionId);
      setTranscript(t.messages || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send proposals");
    } finally {
      setLoading(false);
    }
  };

  const handlePickFromLatestProposals = () => {
    if (proposalMessages.length === 0) return;
    const latest = proposalMessages[proposalMessages.length - 1];
    const payload = latest.payload as ProposalMessagePayload;
    if (!payload?.proposals?.length) return;
    const first = payload.proposals[0];
    setConfirmStart(first.start);
    setConfirmEnd(first.end);
    setConfirmTz(first.tz || tz);
  };

  const handleConfirm = async () => {
    setError(null);
    if (!loadedSessionId || !confirmStart || !confirmEnd) return;
    setLoading(true);
    try {
      await confirmMeetingService(loadedSessionId, {
        start: confirmStart,
        end: confirmEnd,
        tz: confirmTz,
      });
      const s = await getNetworkSessionService(loadedSessionId);
      setSession(s.session);
      const t = await getNetworkTranscriptService(loadedSessionId);
      setTranscript(t.messages || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to confirm meeting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-semibold">Network Sessions</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Start Session</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            placeholder="Connection ID"
            className="border rounded px-3 py-2"
          />
          <input
            value={counterpartUserId}
            onChange={(e) => setCounterpartUserId(e.target.value)}
            placeholder="Counterpart User ID"
            className="border rounded px-3 py-2"
          />
          <button
            onClick={handleStartSession}
            disabled={loading || !connectionId || !counterpartUserId}
            className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
          >
            {loading ? "Starting..." : "Start"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Load Session</h2>
        <div className="flex gap-2">
          <input
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Session ID"
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={handleLoadSession}
            disabled={!sessionId}
            className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
          >
            Load
          </button>
        </div>
        {session && (
          <div className="text-sm text-gray-700">
            <div>
              <span className="font-medium">Status:</span> {session.status}
            </div>
            {session.outcome?.selectedSlot && (
              <div>
                <span className="font-medium">Selected:</span>{" "}
                {session.outcome.selectedSlot.start} →{" "}
                {session.outcome.selectedSlot.end}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Send Proposals</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="number"
            value={durationMins}
            onChange={(e) =>
              setDurationMins(parseInt(e.target.value || "0", 10))
            }
            placeholder="Duration (mins)"
            className="border rounded px-3 py-2"
          />
          <input
            value={earliest}
            onChange={(e) => setEarliest(e.target.value)}
            placeholder="Earliest (ISO)"
            className="border rounded px-3 py-2"
          />
          <input
            value={latest}
            onChange={(e) => setLatest(e.target.value)}
            placeholder="Latest (ISO)"
            className="border rounded px-3 py-2"
          />
          <input
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            placeholder="Time zone (IANA)"
            className="border rounded px-3 py-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSendProposals}
            disabled={loading || !loadedSessionId}
            className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Proposals"}
          </button>
          <button
            onClick={handlePickFromLatestProposals}
            disabled={proposalMessages.length === 0}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Pick First From Latest
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Confirm Meeting</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            value={confirmStart}
            onChange={(e) => setConfirmStart(e.target.value)}
            placeholder="Start (ISO)"
            className="border rounded px-3 py-2"
          />
          <input
            value={confirmEnd}
            onChange={(e) => setConfirmEnd(e.target.value)}
            placeholder="End (ISO)"
            className="border rounded px-3 py-2"
          />
          <input
            value={confirmTz}
            onChange={(e) => setConfirmTz(e.target.value)}
            placeholder="Time zone (IANA)"
            className="border rounded px-3 py-2"
          />
        </div>
        <button
          onClick={handleConfirm}
          disabled={loading || !loadedSessionId || !confirmStart || !confirmEnd}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {loading ? "Confirming..." : "Confirm"}
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Transcript</h2>
        <div className="space-y-2">
          {transcript.length === 0 && (
            <p className="text-sm text-gray-500">No messages yet</p>
          )}
          {transcript.map((m) => (
            <div key={m.id} className="border rounded p-3">
              <div className="text-xs text-gray-500 flex justify-between">
                <span>{m.type}</span>
                <span>{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <pre className="text-xs mt-2 whitespace-pre-wrap break-words">
                {JSON.stringify(m.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
