"use client";

import { useUserData } from "@/components/providers/UserDataProvider";

export default function UserDataDebug() {
  const { state, actions } = useUserData();

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-sm text-xs z-50">
      <h3 className="font-bold mb-2">UserDataProvider Debug</h3>

      <div className="space-y-2">
        <div>
          <strong>User:</strong> {state.user ? "✅ Loaded" : "❌ Not loaded"}
          {state.loading.user && " (loading...)"}
        </div>

        <div>
          <strong>Connections:</strong> {state.connections.length} active,{" "}
          {state.pendingInvitations.length} pending
          {state.loading.connections && " (loading...)"}
        </div>

        <div>
          <strong>Integrations:</strong> {state.integrations.length} connected
          {state.loading.integrations && " (loading...)"}
        </div>

        <div>
          <strong>UI State:</strong>
          <div className="ml-2">
            Profile: {state.ui.profileOpen ? "✅" : "❌"}
            Network: {state.ui.networkOpen ? "✅" : "❌"}
            Today: {state.ui.todayOpen ? "✅" : "❌"}
          </div>
        </div>

        {Object.keys(state.errors).length > 0 && (
          <div className="text-red-400">
            <strong>Errors:</strong>
            {Object.entries(state.errors).map(
              ([key, error]) =>
                error && (
                  <div key={key} className="ml-2">
                    • {key}: {error}
                  </div>
                )
            )}
          </div>
        )}

        <div className="pt-2 border-t border-white/20">
          <button
            onClick={() => actions.refreshAll()}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
          >
            Refresh All
          </button>
        </div>
      </div>
    </div>
  );
}
