"use client";

import { useEffect, useState, useCallback } from "react";
import { registerNotificationDeviceService } from "@/app/services/notifications";

declare global {
  interface Window {
    OneSignal?: {
      init: (config: { appId: string }) => void;
      push: (fn: () => void) => void;
      Notifications: {
        requestPermission: () => Promise<void>;
        permission: Promise<"default" | "granted" | "denied">;
      };
      User?: {
        pushSubscription?: {
          id?: string | null;
        };
      };
    };
  }
}

interface OneSignalProviderProps {
  children: React.ReactNode;
}

export function OneSignalProvider({ children }: OneSignalProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  // Load OneSignal SDK script
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return;

    const scriptId = "onesignal-sdk";
    if (document.getElementById(scriptId)) return; // already loaded

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://cdn.onesignal.com/sdks/OneSignalSDK.js";
    script.async = true;
    script.onload = () => setIsReady(true);
    document.head.appendChild(script);
  }, []);

  // Initialize OneSignal
  useEffect(() => {
    if (!isReady) return;
    if (!window.OneSignal) return;
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) return;

    window.OneSignal = window.OneSignal || [];
    window.OneSignal.push(function () {
      window.OneSignal.init({ appId });
    });
  }, [isReady]);

  const registerIfSubscribed = useCallback(async () => {
    try {
      if (!window.OneSignal) return;
      const notifPerm = await window.OneSignal.Notifications.permission;
      const hasPermission = notifPerm && notifPerm === "granted";
      setIsEnabled(hasPermission);
      if (!hasPermission) return;

      const sub = await window.OneSignal.User?.pushSubscription;
      const playerId = sub?.id;
      if (!playerId) return;

      const deviceInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: "web",
      };
      await registerNotificationDeviceService("web", playerId, deviceInfo);
    } catch (e) {
      console.error("OneSignal registration failed", e);
    }
  }, []);

  useEffect(() => {
    registerIfSubscribed();
  }, [registerIfSubscribed]);

  const requestPermission = useCallback(async () => {
    try {
      if (!window.OneSignal) return;
      await window.OneSignal.Notifications.requestPermission();
      await registerIfSubscribed();
    } catch (e) {
      console.error("OneSignal permission error", e);
    }
  }, [registerIfSubscribed]);

  return (
    <>
      {/* Simple inline button for enabling notifications; replace with nicer UI as needed */}
      {isEnabled === false && (
        <button
          onClick={requestPermission}
          className="fixed bottom-4 right-4 rounded-md bg-primary text-white px-3 py-2 text-sm"
        >
          Enable notifications
        </button>
      )}
      {children}
    </>
  );
}


