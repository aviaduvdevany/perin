"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { IntegrationStatus, IntegrationType } from "@/types/integrations";
import {
  getUserIntegrationsService,
  connectIntegrationService,
  disconnectIntegrationService,
} from "@/app/services/integrations";

export type IntegrationsContextValue = {
  integrations: IntegrationStatus[];
  isLoading: boolean;
  error?: string;
  lastFetchedAt?: string;
  refresh: () => Promise<void>;
  optimisticRemove: (id: string) => void;
  addOrUpdate: (integration: IntegrationStatus) => void;
  connect: (type: IntegrationType) => Promise<void>;
  disconnect: (params: {
    id?: string;
    type?: IntegrationType;
  }) => Promise<boolean>;
};

const IntegrationsContext = createContext<IntegrationsContextValue | null>(
  null
);

export function IntegrationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | undefined>(
    undefined
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const { integrations } = await getUserIntegrationsService();
      setIntegrations(integrations);
      setLastFetchedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load integrations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const optimisticRemove = useCallback((id: string) => {
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const addOrUpdate = useCallback((integration: IntegrationStatus) => {
    setIntegrations((prev) => {
      const idx = prev.findIndex((i) => i.id === integration.id);
      if (idx === -1) return [integration, ...prev];
      const next = prev.slice();
      next[idx] = integration;
      return next;
    });
  }, []);

  const connect = useCallback(async (type: IntegrationType) => {
    const { authUrl } = await connectIntegrationService(type);
    if (authUrl) window.location.href = authUrl;
  }, []);

  const disconnect = useCallback(
    async (params: { id?: string; type?: IntegrationType }) => {
      try {
        if (params.id) {
          optimisticRemove(params.id);
        }
        const res = await disconnectIntegrationService(params);
        if (!res?.success) return false;
        await refresh();
        return true;
      } catch (e) {
        console.error("disconnect failed", e);
        return false;
      }
    },
    [optimisticRemove, refresh]
  );

  useEffect(() => {
    // initial load; safe to call even if unauthenticated (server returns 401)
    refresh();
  }, [refresh]);

  const value = useMemo<IntegrationsContextValue>(
    () => ({
      integrations,
      isLoading,
      error,
      lastFetchedAt,
      refresh,
      optimisticRemove,
      addOrUpdate,
      connect,
      disconnect,
    }),
    [
      integrations,
      isLoading,
      error,
      lastFetchedAt,
      refresh,
      optimisticRemove,
      addOrUpdate,
      connect,
      disconnect,
    ]
  );

  return (
    <IntegrationsContext.Provider value={value}>
      {children}
    </IntegrationsContext.Provider>
  );
}

export function useIntegrations(): IntegrationsContextValue {
  const ctx = useContext(IntegrationsContext);
  if (!ctx)
    throw new Error("useIntegrations must be used within IntegrationsProvider");
  return ctx;
}
