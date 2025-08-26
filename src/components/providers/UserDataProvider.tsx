"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
  useState,
  useEffect,
} from "react";
import type { User, UpdateUserData } from "@/types/database";
import type { UserConnection, NetworkScope } from "@/types/network";
import type { IntegrationStatus, IntegrationType } from "@/types/integrations";
import type { CalendarEvent } from "@/types/calendar";
import {
  getUserProfileService,
  updateUserProfileService,
} from "@/app/services/users";
import {
  listConnectionsService,
  createConnectionService,
  acceptConnectionService,
  revokeConnectionService,
} from "@/app/services/network";
import {
  getUserIntegrationsService,
  connectIntegrationService,
  disconnectIntegrationService,
} from "@/app/services/integrations";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface UserDataState {
  // Core user data
  user: User | null;

  // Network data
  connections: UserConnection[];
  pendingInvitations: UserConnection[];

  // Integration data
  integrations: IntegrationStatus[];

  // Performance optimizations (NEW)
  calendar: {
    events: Record<string, unknown>[];
    nextEvent: Record<string, unknown> | null;
    availability: Record<string, unknown>;
    lastUpdated: number;
  };

  memory: {
    semantic: Record<string, unknown>[];
    preferences: Record<string, unknown>;
    lastUpdated: number;
  };

  integrationContexts: {
    contexts: Record<string, Record<string, unknown>>;
    lastUpdated: number;
  };

  // Chat UI state (migrated from ChatUIProvider)
  ui: {
    profileOpen: boolean;
    integrationsOpen: boolean;
    networkOpen: boolean;
    todayOpen: boolean;
    notificationsOpen: boolean;
    preferencesOpen: boolean;
    perinOpen: boolean;
    delegationOpen: boolean;
  };

  // Loading states
  loading: {
    user: boolean;
    connections: boolean;
    integrations: boolean;
    calendar: boolean;
    memory: boolean;
    initial: boolean;
  };

  // Error states
  errors: Record<string, string | null>;

  // Cache timestamps
  lastUpdated: {
    user: number;
    connections: number;
    integrations: number;
    calendar: number;
    memory: number;
  };
}

export interface UserDataActions {
  // Data fetching
  refreshUser: () => Promise<void>;
  refreshConnections: () => Promise<void>;
  refreshIntegrations: () => Promise<void>;
  refreshAll: () => Promise<void>;

  // Performance data management (NEW)
  refreshCalendarContext: () => Promise<void>;
  refreshMemoryContext: () => Promise<void>;
  invalidateCalendarCache: () => void;
  invalidateMemoryCache: () => void;

  // User data management
  updateUser: (updates: UpdateUserData) => Promise<void>;

  // Network management
  createConnection: (
    targetUserId: string,
    scopes: NetworkScope[],
    constraints?: Record<string, unknown>
  ) => Promise<void>;
  acceptConnection: (
    connectionId: string,
    scopes: NetworkScope[],
    constraints?: Record<string, unknown>
  ) => Promise<void>;
  revokeConnection: (connectionId: string) => Promise<void>;

  // Integration management
  connectIntegration: (type: IntegrationType) => Promise<void>;
  disconnectIntegration: (integrationId: string) => Promise<void>;

  // UI state management
  setProfileOpen: (open: boolean) => void;
  setIntegrationsOpen: (open: boolean) => void;
  setNetworkOpen: (open: boolean) => void;
  setTodayOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setPreferencesOpen: (open: boolean) => void;
  setPerinOpen: (open: boolean) => void;
  setDelegationOpen: (open: boolean) => void;

  // Cache management
  invalidateCache: (dataType: keyof UserDataState) => void;
  clearCache: () => void;
}

export interface UserDataContextValue {
  state: UserDataState;
  actions: UserDataActions;
}

// ============================================================================
// CONSTANTS & UTILITIES
// ============================================================================

const CACHE_DURATIONS = {
  user: 5 * 60 * 1000, // 5 minutes
  connections: 2 * 60 * 1000, // 2 minutes
  integrations: 10 * 60 * 1000, // 10 minutes
  calendar: 2 * 60 * 1000, // 2 minutes (frequently changing)
  memory: 30 * 60 * 1000, // 30 minutes (stable)
  ui: Infinity, // No cache (always fresh)
};

const isStale = (lastUpdated: number, duration: number) => {
  return Date.now() - lastUpdated > duration;
};

const initialState: UserDataState = {
  user: null,
  connections: [],
  pendingInvitations: [],
  integrations: [],
  calendar: {
    events: [],
    nextEvent: null,
    availability: {},
    lastUpdated: 0,
  },
  memory: {
    semantic: [],
    preferences: {},
    lastUpdated: 0,
  },
  integrationContexts: {
    contexts: {},
    lastUpdated: 0,
  },
  ui: {
    profileOpen: false,
    integrationsOpen: false,
    networkOpen: false,
    todayOpen: true,
    notificationsOpen: false,
    preferencesOpen: false,
    perinOpen: false,
    delegationOpen: false,
  },
  loading: {
    user: false,
    connections: false,
    integrations: false,
    calendar: false,
    memory: false,
    initial: true,
  },
  errors: {},
  lastUpdated: {
    user: 0,
    connections: 0,
    integrations: 0,
    calendar: 0,
    memory: 0,
  },
};

// ============================================================================
// CONTEXT
// ============================================================================

const UserDataContext = createContext<UserDataContextValue | null>(null);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserDataState>(initialState);

  // ============================================================================
  // DATA FETCHING FUNCTIONS
  // ============================================================================

  const refreshUser = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, user: true },
      errors: { ...prev.errors, user: null },
    }));

    try {
      const user = await getUserProfileService();
      setState((prev) => ({
        ...prev,
        user,
        loading: { ...prev.loading, user: false },
        lastUpdated: { ...prev.lastUpdated, user: Date.now() },
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load user data";
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, user: false },
        errors: { ...prev.errors, user: errorMessage },
      }));
      console.error("UserDataProvider: Failed to refresh user", error);
    }
  }, []);

  const refreshConnections = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, connections: true },
      errors: { ...prev.errors, connections: null },
    }));

    try {
      const { connections } = await listConnectionsService();

      // Separate active connections from pending invitations
      const activeConnections = connections.filter(
        (conn: UserConnection) => conn.status === "active"
      );
      const pendingInvitations = connections.filter(
        (conn: UserConnection) => conn.status === "pending"
      );

      setState((prev) => ({
        ...prev,
        connections: activeConnections,
        pendingInvitations,
        loading: { ...prev.loading, connections: false },
        lastUpdated: { ...prev.lastUpdated, connections: Date.now() },
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load connections";
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, connections: false },
        errors: { ...prev.errors, connections: errorMessage },
      }));
      console.error("UserDataProvider: Failed to refresh connections", error);
    }
  }, []);

  const refreshIntegrations = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, integrations: true },
      errors: { ...prev.errors, integrations: null },
    }));

    try {
      const { integrations } = await getUserIntegrationsService();
      setState((prev) => ({
        ...prev,
        integrations,
        loading: { ...prev.loading, integrations: false },
        lastUpdated: { ...prev.lastUpdated, integrations: Date.now() },
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load integrations";
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, integrations: false },
        errors: { ...prev.errors, integrations: errorMessage },
      }));
      console.error("UserDataProvider: Failed to refresh integrations", error);
    }
  }, []);

  // Performance data management functions (NEW)
  const refreshCalendarContext = useCallback(async () => {
    if (!state.user?.id) return;

    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, calendar: true },
      errors: { ...prev.errors, calendar: null },
    }));

    try {
      // Fetch calendar context from server API
      const response = await fetch("/api/user/calendar-context");
      const data = await response.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          calendar: {
            events: data.data.events as unknown as Record<string, unknown>[],
            nextEvent: data.data.nextEvent as unknown as Record<
              string,
              unknown
            > | null,
            availability: data.data.availability,
            lastUpdated: data.data.lastUpdated,
          },
          loading: { ...prev.loading, calendar: false },
          lastUpdated: { ...prev.lastUpdated, calendar: Date.now() },
        }));
      } else {
        throw new Error("Failed to fetch calendar context");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load calendar context";
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, calendar: false },
        errors: { ...prev.errors, calendar: errorMessage },
      }));
      console.error(
        "UserDataProvider: Failed to refresh calendar context",
        error
      );
    }
  }, [state.user?.id]);

  const refreshMemoryContext = useCallback(async () => {
    if (!state.user?.id) return;

    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, memory: true },
      errors: { ...prev.errors, memory: null },
    }));

    try {
      // Fetch memory context from server API
      const response = await fetch("/api/user/memory-context");
      const data = await response.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          memory: {
            semantic: data.data.semantic,
            preferences: data.data.preferences,
            lastUpdated: data.data.lastUpdated,
          },
          loading: { ...prev.loading, memory: false },
          lastUpdated: { ...prev.lastUpdated, memory: Date.now() },
        }));
      } else {
        throw new Error("Failed to fetch memory context");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load memory context";
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, memory: false },
        errors: { ...prev.errors, memory: errorMessage },
      }));
      console.error(
        "UserDataProvider: Failed to refresh memory context",
        error
      );
    }
  }, [state.user?.id]);

  const invalidateCalendarCache = useCallback(() => {
    setState((prev) => ({
      ...prev,
      calendar: {
        ...prev.calendar,
        lastUpdated: 0, // Force refresh on next check
      },
    }));
  }, []);

  const invalidateMemoryCache = useCallback(() => {
    setState((prev) => ({
      ...prev,
      memory: {
        ...prev.memory,
        lastUpdated: 0, // Force refresh on next check
      },
    }));
  }, []);

  const refreshAll = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, initial: true },
    }));

    try {
      // Core data (existing)
      await Promise.allSettled([
        refreshUser(),
        refreshConnections(),
        refreshIntegrations(),
      ]);

      // Performance data (new) - only if user has integrations
      if (state.integrations.some((i) => i.isActive)) {
        await Promise.allSettled([
          refreshCalendarContext(),
          refreshMemoryContext(),
        ]);
      }
    } finally {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, initial: false },
      }));
    }
  }, [
    refreshUser,
    refreshConnections,
    refreshIntegrations,
    refreshCalendarContext,
    refreshMemoryContext,
  ]);

  // ============================================================================
  // BACKGROUND REFRESH
  // ============================================================================

  const refreshStaleData = useCallback(async () => {
    const updates: Promise<void>[] = [];

    if (isStale(state.lastUpdated.user, CACHE_DURATIONS.user)) {
      updates.push(refreshUser());
    }

    if (isStale(state.lastUpdated.connections, CACHE_DURATIONS.connections)) {
      updates.push(refreshConnections());
    }

    if (isStale(state.lastUpdated.integrations, CACHE_DURATIONS.integrations)) {
      updates.push(refreshIntegrations());
    }

    // New: Performance data refresh
    if (isStale(state.calendar.lastUpdated, CACHE_DURATIONS.calendar)) {
      updates.push(refreshCalendarContext());
    }

    if (isStale(state.memory.lastUpdated, CACHE_DURATIONS.memory)) {
      updates.push(refreshMemoryContext());
    }

    await Promise.allSettled(updates);
  }, [
    state.calendar.lastUpdated,
    state.memory.lastUpdated,
    refreshUser,
    refreshConnections,
    refreshIntegrations,
    refreshCalendarContext,
    refreshMemoryContext,
  ]);

  // ============================================================================
  // USER DATA MANAGEMENT
  // ============================================================================

  const updateUser = useCallback(
    async (updates: UpdateUserData) => {
      try {
        const updatedUser = await updateUserProfileService(updates);
        setState((prev) => ({
          ...prev,
          user: updatedUser,
          lastUpdated: { ...prev.lastUpdated, user: Date.now() },
        }));

        // Invalidate related caches if timezone/preferences changed
        if (updates.timezone || updates.preferred_hours) {
          invalidateCalendarCache();
        }
        if (updates.memory || updates.tone) {
          invalidateMemoryCache();
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update user";
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, user: errorMessage },
        }));
        throw error;
      }
    },
    [invalidateCalendarCache, invalidateMemoryCache]
  );

  // ============================================================================
  // NETWORK MANAGEMENT
  // ============================================================================

  const createConnection = useCallback(
    async (
      targetUserId: string,
      scopes: NetworkScope[],
      constraints?: Record<string, unknown>
    ) => {
      // Create temporary connection for optimistic update
      const tempConnection: UserConnection = {
        id: `temp-${Date.now()}`,
        requester_user_id: state.user?.id || "",
        target_user_id: targetUserId,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistic update
      setState((prev) => ({
        ...prev,
        pendingInvitations: [...prev.pendingInvitations, tempConnection],
      }));

      try {
        // Server sync
        await createConnectionService({ targetUserId, scopes, constraints });

        // Refresh connections to get the real data
        await refreshConnections();
      } catch (error) {
        // Rollback on error
        setState((prev) => ({
          ...prev,
          pendingInvitations: prev.pendingInvitations.filter(
            (conn) => conn.id !== tempConnection.id
          ),
        }));
        throw error;
      }
    },
    [state.user?.id, refreshConnections]
  );

  const acceptConnection = useCallback(
    async (
      connectionId: string,
      scopes: NetworkScope[],
      constraints?: Record<string, unknown>
    ) => {
      try {
        await acceptConnectionService(connectionId, { scopes, constraints });
        await refreshConnections();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to accept connection";
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, connections: errorMessage },
        }));
        throw error;
      }
    },
    [refreshConnections]
  );

  const revokeConnection = useCallback(
    async (connectionId: string) => {
      try {
        await revokeConnectionService(connectionId);
        await refreshConnections();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to revoke connection";
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, connections: errorMessage },
        }));
        throw error;
      }
    },
    [refreshConnections]
  );

  // ============================================================================
  // INTEGRATION MANAGEMENT
  // ============================================================================

  const connectIntegration = useCallback(async (type: IntegrationType) => {
    try {
      const { authUrl } = await connectIntegrationService(type);
      if (authUrl) window.location.href = authUrl;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to connect integration";
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, integrations: errorMessage },
      }));
      throw error;
    }
  }, []);

  const disconnectIntegration = useCallback(
    async (integrationId: string) => {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        integrations: prev.integrations.filter((i) => i.id !== integrationId),
      }));

      try {
        const result = await disconnectIntegrationService({
          id: integrationId,
        });
        if (!result?.success) {
          // Rollback on failure
          await refreshIntegrations();
        }
      } catch (error) {
        // Rollback on error
        await refreshIntegrations();
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to disconnect integration";
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, integrations: errorMessage },
        }));
        throw error;
      }
    },
    [refreshIntegrations]
  );

  // ============================================================================
  // UI STATE MANAGEMENT
  // ============================================================================

  const setProfileOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, profileOpen: open },
    }));
  }, []);

  const setIntegrationsOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, integrationsOpen: open },
    }));
  }, []);

  const setNetworkOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, networkOpen: open },
    }));
  }, []);

  const setTodayOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, todayOpen: open },
    }));
  }, []);

  const setNotificationsOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, notificationsOpen: open },
    }));
  }, []);

  const setPreferencesOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, preferencesOpen: open },
    }));
  }, []);

  const setPerinOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, perinOpen: open },
    }));
  }, []);

  const setDelegationOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, delegationOpen: open },
    }));
  }, []);

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  const invalidateCache = useCallback((dataType: keyof UserDataState) => {
    setState((prev) => ({
      ...prev,
      lastUpdated: {
        ...prev.lastUpdated,
        [dataType]: 0,
      },
    }));
  }, []);

  const clearCache = useCallback(() => {
    setState((prev) => ({
      ...prev,
      lastUpdated: {
        user: 0,
        connections: 0,
        integrations: 0,
        calendar: 0,
        memory: 0,
      },
    }));
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initial data fetch
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Background refresh for stale data
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStaleData();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [refreshStaleData]);

  // Auto-clear errors after 5 seconds
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    Object.keys(state.errors).forEach((key) => {
      if (state.errors[key]) {
        const timeout = setTimeout(() => {
          setState((prev) => ({
            ...prev,
            errors: { ...prev.errors, [key]: null },
          }));
        }, 5000);
        timeouts.push(timeout);
      }
    });

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [state.errors]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const actions: UserDataActions = useMemo(
    () => ({
      refreshUser,
      refreshConnections,
      refreshIntegrations,
      refreshAll,
      refreshCalendarContext,
      refreshMemoryContext,
      invalidateCalendarCache,
      invalidateMemoryCache,
      updateUser,
      createConnection,
      acceptConnection,
      revokeConnection,
      connectIntegration,
      disconnectIntegration,
      setProfileOpen,
      setIntegrationsOpen,
      setNetworkOpen,
      setTodayOpen,
      setNotificationsOpen,
      setPreferencesOpen,
      setPerinOpen,
      setDelegationOpen,
      invalidateCache,
      clearCache,
    }),
    [
      refreshUser,
      refreshConnections,
      refreshIntegrations,
      refreshAll,
      refreshCalendarContext,
      refreshMemoryContext,
      invalidateCalendarCache,
      invalidateMemoryCache,
      updateUser,
      createConnection,
      acceptConnection,
      revokeConnection,
      connectIntegration,
      disconnectIntegration,
      setProfileOpen,
      setIntegrationsOpen,
      setNetworkOpen,
      setTodayOpen,
      setNotificationsOpen,
      setPreferencesOpen,
      setPerinOpen,
      setDelegationOpen,
      invalidateCache,
      clearCache,
    ]
  );

  const contextValue: UserDataContextValue = useMemo(
    () => ({
      state,
      actions,
    }),
    [state, actions]
  );

  return (
    <UserDataContext.Provider value={contextValue}>
      {children}
    </UserDataContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useUserData(): UserDataContextValue {
  const ctx = useContext(UserDataContext);
  if (!ctx) {
    throw new Error("useUserData must be used within UserDataProvider");
  }
  return ctx;
}

// ============================================================================
// LEGACY COMPATIBILITY HOOKS
// ============================================================================

// For backward compatibility during migration
export function useUserDataState(): UserDataState {
  return useUserData().state;
}

export function useUserDataActions(): UserDataActions {
  return useUserData().actions;
}
