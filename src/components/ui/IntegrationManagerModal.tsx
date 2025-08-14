"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { connectIntegrationService } from "@/app/services/integrations";
import type { IntegrationType } from "@/types/integrations";
import { useIntegrations } from "@/components/providers/IntegrationsProvider";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface IntegrationManagerModalProps {
  open: boolean;
  onClose: () => void;
}

export default function IntegrationManagerModal({
  open,
  onClose,
}: IntegrationManagerModalProps) {
  const [activeSection, setActiveSection] =
    useState<IntegrationType>("calendar");
  const { integrations, isLoading, disconnect } = useIntegrations();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Do not refetch on open; list is managed by app-level provider (loaded once, refreshed on mutations)

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

  const removeConnection = (id: string) => {
    setPendingRemoveId(id);
    setConfirmOpen(true);
  };

  const confirmRemove = async () => {
    if (!pendingRemoveId) return;
    setRemoving(true);
    try {
      await disconnect({ id: pendingRemoveId });
    } finally {
      setRemoving(false);
      setConfirmOpen(false);
      setPendingRemoveId(null);
    }
  };

  const handleAddAnother = async () => {
    try {
      const { authUrl } = await connectIntegrationService(activeSection);
      if (authUrl) window.location.href = authUrl;
    } catch (e) {
      console.error("Failed to start connection:", e);
    }
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            className="relative w-[min(960px,92vw)] max-h-[86vh] overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--background-primary)] p-6 shadow-2xl"
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ type: "tween", duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="integrations-modal-title"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2
                  id="integrations-modal-title"
                  className="text-lg font-semibold"
                >
                  Manage Integrations
                </h2>
                <p className="text-sm text-[var(--foreground-muted)] mt-1">
                  Connect Gmail and multiple Calendars. Add more accounts to
                  give Perin richer context.
                </p>
              </div>
              <button
                className="text-sm text-[var(--foreground-muted)] hover:text-[var(--cta-text)]"
                onClick={onClose}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <aside className="col-span-12 md:col-span-4 lg:col-span-3">
                <div className="rounded-xl border border-[var(--card-border)] p-3">
                  <div className="space-y-2">
                    <div className="px-3 py-2 rounded-lg bg-white/5 border border-[var(--card-border)]">
                      <div className="text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1">
                        Sections
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
                          <span role="img" aria-label="calendar">
                            📅
                          </span>
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
                          <span role="img" aria-label="gmail">
                            📧
                          </span>
                          <span>Gmail</span>
                        </button>
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-lg border border-[var(--card-border)]">
                      <div className="text-xs uppercase tracking-wide text-[var(--foreground-muted)] mb-1">
                        Tips
                      </div>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        You can connect multiple accounts. Perin will use them
                        when relevant.
                      </p>
                    </div>
                  </div>
                </div>
              </aside>

              <section className="col-span-12 md:col-span-8 lg:col-span-9 space-y-4">
                <div className="rounded-xl border border-[var(--card-border)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold">
                      {activeSection === "calendar"
                        ? "Connected Calendars"
                        : "Connected Gmail Accounts"}
                    </h3>
                    <button
                      onClick={handleAddAnother}
                      className="px-3 py-1.5 rounded-md bg-[var(--accent-primary)]/90 hover:bg-[var(--accent-primary)] text-white text-sm"
                    >
                      {activeSection === "calendar"
                        ? "Add another Calendar"
                        : "Add another Gmail"}
                    </button>
                  </div>

                  {isLoading ? (
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Loading...
                    </p>
                  ) : activeList.length === 0 ? (
                    <p className="text-sm text-[var(--foreground-muted)]">
                      No connections yet. Add your first one.
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
          </motion.div>
        </motion.div>
      )}
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
    </AnimatePresence>
  );
}
