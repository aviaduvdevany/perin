"use client";

import { useState, useMemo } from "react";
import { Calendar, Mail } from "lucide-react";
import { useUserData } from "@/components/providers/UserDataProvider";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { IntegrationType } from "@/types/integrations";

export default function IntegrationsTab() {
  const { state, actions } = useUserData();
  const { integrations, loading } = state;

  // Integration management state
  const [activeSection, setActiveSection] =
    useState<IntegrationType>("calendar");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Integration management logic
  const activeList = useMemo(() => {
    const calendars = integrations
      .filter((i) => i.type === "calendar")
      .map((c, idx) => ({
        id: c.id,
        label: (c.metadata?.label as string) || `Calendar ${idx + 1}`,
        accountEmail: (c.metadata?.accountEmail as string) || "(email hidden)",
      }));
    const gmails = integrations
      .filter((i) => i.type === "gmail")
      .map((g, idx) => ({
        id: g.id,
        label: (g.metadata?.label as string) || `Gmail ${idx + 1}`,
        accountEmail: (g.metadata?.accountEmail as string) || "(email hidden)",
      }));
    return activeSection === "calendar" ? calendars : gmails;
  }, [integrations, activeSection]);

  // Integration management functions
  const removeConnection = (id: string) => {
    setPendingRemoveId(id);
    setConfirmOpen(true);
  };

  const confirmRemove = async () => {
    if (!pendingRemoveId) return;
    setRemoving(true);
    try {
      await actions.disconnectIntegration(pendingRemoveId);
    } finally {
      setRemoving(false);
      setConfirmOpen(false);
      setPendingRemoveId(null);
    }
  };

  const handleAddAnother = async () => {
    try {
      await actions.connectIntegration(activeSection);
    } catch (e) {
      console.error("Failed to start connection:", e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connected Integrations Management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-3">
          <div className="rounded-xl border border-[var(--card-border)] p-3">
            <div className="space-y-2">
              <div className="px-3 py-2 rounded-lg bg-white/5 border border-[var(--card-border)]">
                <div className="text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1">
                  Connected Services
                </div>
                <div className="text-sm space-y-1">
                  <button
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left ${
                      activeSection === "calendar"
                        ? "bg-white/10"
                        : "hover:bg-white/5"
                    }`}
                    onClick={() => setActiveSection("calendar")}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Calendars</span>
                  </button>
                  <button
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left ${
                      activeSection === "gmail"
                        ? "bg-white/10"
                        : "hover:bg-white/5"
                    }`}
                    onClick={() => setActiveSection("gmail")}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Gmail</span>
                  </button>
                </div>
              </div>
              <div className="px-3 py-2 rounded-lg border border-[var(--card-border)]">
                <div className="text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1">
                  Tips
                </div>
                <p className="text-xs text-[var(--foreground-muted)]">
                  You can connect multiple accounts. Perin will use them when
                  relevant.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-9 space-y-4">
          <div className="rounded-xl border border-[var(--card-border)] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h3 className="text-base font-semibold">
                {activeSection === "calendar"
                  ? "Connected Calendars"
                  : "Connected Gmail Accounts"}
              </h3>
              <button
                onClick={handleAddAnother}
                className="px-3 py-1.5 rounded-md bg-[var(--accent-primary)]/90 hover:bg-[var(--accent-primary)] text-white text-sm whitespace-nowrap"
              >
                {activeSection === "calendar"
                  ? "Add another Calendar"
                  : "Add another Gmail"}
              </button>
            </div>

            {loading.integrations ? (
              <p className="text-sm text-[var(--foreground-muted)]">
                Loading...
              </p>
            ) : activeList.length === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">
                No connections yet. Add your first one above.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--card-border)]">
                {activeList.map((acc) => (
                  <li
                    key={acc.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{acc.label}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {acc.accountEmail}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-green-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Connected
                      </span>
                      <button
                        className="text-xs text-red-400 hover:text-red-300"
                        onClick={() => removeConnection(acc.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Remove integration?"
        description="This will disconnect the selected account. You can reconnect anytime."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={confirmRemove}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingRemoveId(null);
        }}
        loading={removing}
      />
    </div>
  );
}
