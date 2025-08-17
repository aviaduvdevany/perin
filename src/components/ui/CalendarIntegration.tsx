import { useState } from "react";
import { useUserData } from "@/components/providers/UserDataProvider";

interface CalendarIntegrationProps {
  className?: string;
}

export default function CalendarIntegration({
  className = "",
}: CalendarIntegrationProps) {
  const { state, actions } = useUserData();
  const { integrations } = state;
  const [isConnecting, setIsConnecting] = useState(false);

  const isConnected = integrations.some(
    (integration) => integration.type === "calendar" && integration.isActive
  );

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await actions.connectIntegration("calendar");
    } catch (error) {
      console.error("Error connecting Calendar:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className={`calendar-integration ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Calendar Integration</h3>

      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Connect your Google Calendar to let Perin help you manage your
            schedule, read your events, and create new appointments.
          </p>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {isConnecting ? "Connecting..." : "Connect Google Calendar"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-green-700 font-medium">
              Calendar Connected
            </span>
          </div>

          <p className="text-sm text-gray-600">
            Perin can now help you with your calendar events and scheduling.
          </p>
        </div>
      )}
    </div>
  );
}
