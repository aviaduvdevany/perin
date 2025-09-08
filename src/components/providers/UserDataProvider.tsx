"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
  useState,
  useEffect,
  useRef,
} from "react";
import type { User, UpdateUserData } from "@/types/database";
import type { UserConnection, NetworkScope } from "@/types/network";
import type { IntegrationStatus, IntegrationType } from "@/types/integrations";
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

  // Chat UI state (migrated from ChatUIProvider)
  ui: {
    profileOpen: boolean;
    networkOpen: boolean;
    todayOpen: boolean;
    notificationsOpen: boolean;
    preferencesOpen: boolean;
    delegationOpen: boolean;
  };

  // Loading states
  loading: {
    user: boolean;
    connections: boolean;
    integrations: boolean;
    initial: boolean;
  };

  // Error states
  errors: Record<string, string | null>;

  // Cache timestamps
  lastUpdated: {
    user: number;
    connections: number;
    integrations: number;
  };
}

export interface UserDataActions {
  // Data fetching
  refreshUser: () => Promise<void>;
  refreshConnections: () => Promise<void>;
  refreshIntegrations: () => Promise<void>;
  refreshAll: () => Promise<void>;

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
  setNetworkOpen: (open: boolean) => void;
  setTodayOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setPreferencesOpen: (open: boolean) => void;
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
  ui: {
    profileOpen: false,
    networkOpen: false,
    todayOpen: true,
    notificationsOpen: false,
    preferencesOpen: false,
    delegationOpen: false,
  },
  loading: {
    user: false,
    connections: false,
    integrations: false,
    initial: true,
  },
  errors: {},
  lastUpdated: {
    user: 0,
    connections: 0,
    integrations: 0,
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
  const didCollapseRef = useRef(false);

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

  const refreshAll = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, initial: true },
    }));

    try {
      await Promise.allSettled([
        refreshUser(),
        refreshConnections(),
        refreshIntegrations(),
      ]);
    } finally {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, initial: false },
      }));
    }
  }, [refreshUser, refreshConnections, refreshIntegrations]);

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

    await Promise.allSettled(updates);
  }, [state.lastUpdated, refreshUser, refreshConnections, refreshIntegrations]);

  // ============================================================================
  // USER DATA MANAGEMENT
  // ============================================================================

  const updateUser = useCallback(async (updates: UpdateUserData) => {
    try {
      const updatedUser = await updateUserProfileService(updates);
      setState((prev) => ({
        ...prev,
        user: updatedUser,
        lastUpdated: { ...prev.lastUpdated, user: Date.now() },
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update user";
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, user: errorMessage },
      }));
      throw error;
    }
  }, []);

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

  const connectIntegration = useCallback(
    async (type: IntegrationType) => {
      try {
        const { authUrl } = await connectIntegrationService(type);
        if (authUrl) {
          // Open OAuth flow in a new tab
          const popup = window.open(
            authUrl,
            "oauth-popup",
            "width=600,height=700,scrollbars=yes,resizable=yes"
          );

          if (!popup) {
            throw new Error(
              "Popup blocked. Please allow popups for this site."
            );
          }

          // Listen for messages from the popup
          const messageHandler = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === "INTEGRATION_CALLBACK") {
              const { result } = event.data;

              // Remove the event listener
              window.removeEventListener("message", messageHandler);

              // Handle the result
              if (result.success) {
                console.log(
                  `${type} integration completed successfully:`,
                  result.message
                );
                // Refresh the integrations list
                refreshIntegrations();
              } else {
                console.error(`${type} integration failed:`, result.error);
              }
            }
          };

          window.addEventListener("message", messageHandler);

          // Check if popup was closed manually
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              window.removeEventListener("message", messageHandler);
            }
          }, 1000);
        }
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
    },
    [refreshIntegrations]
  );

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

  const setDelegationOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, delegationOpen: open },
    }));
  }, []);

  // Legacy function from ChatUIProvider
  const collapseTodayAfterFirstMessage = useCallback(() => {
    if (didCollapseRef.current) return;
    didCollapseRef.current = true;
    setTodayOpen(false);
  }, [setTodayOpen]);

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
      updateUser,
      createConnection,
      acceptConnection,
      revokeConnection,
      connectIntegration,
      disconnectIntegration,
      setProfileOpen,
      setNetworkOpen,
      setTodayOpen,
      setNotificationsOpen,
      setPreferencesOpen,
      setDelegationOpen,
      invalidateCache,
      clearCache,
    }),
    [
      refreshUser,
      refreshConnections,
      refreshIntegrations,
      refreshAll,
      updateUser,
      createConnection,
      acceptConnection,
      revokeConnection,
      connectIntegration,
      disconnectIntegration,
      setProfileOpen,
      setNetworkOpen,
      setTodayOpen,
      setNotificationsOpen,
      setPreferencesOpen,
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
