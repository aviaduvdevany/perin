"use client";

import { useEffect } from "react";
import { registerNotificationDeviceService } from "@/app/services/notifications";

type OneSignalApi = {
  init: (opts: { appId: string }) => Promise<void> | void;
  User: {
    PushSubscription: {
      id?: string | null;
      addEventListener: (
        event: "change",
        cb: (evt: {
          current: { id?: string | null; optedIn?: boolean };
        }) => void
      ) => void;
    };
  };
  Notifications: {
    addEventListener: (event: string, cb: (arg: unknown) => void) => void;
    requestPermission: () => Promise<void> | void;
    isPushSupported: () => boolean;
  };
  Slidedown: { promptPush: (opts?: { force?: boolean }) => void };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(sdk: OneSignalApi) => void>;
    OneSignal?: OneSignalApi;
  }
}

type Props = { children: React.ReactNode };

export default function NotificationsProvider({ children }: Props) {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) return;

    // OneSignal v16: use OneSignalDeferred queue
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: OneSignalApi) {
      await OneSignal.init({ appId });

      // Optional: prompt
      OneSignal.Slidedown.promptPush();

      // Subscribe to push subscription changes and register device when available
      OneSignal.User.PushSubscription.addEventListener(
        "change",
        async (evt) => {
          const playerId = evt.current?.id || undefined;
          const optedIn = evt.current?.optedIn ?? false;
          if (optedIn && playerId) {
            try {
              await registerNotificationDeviceService("web", playerId, {
                ua: navigator.userAgent,
              });
            } catch (err) {
              console.error("Failed to register web push device", err);
            }
          }
        }
      );
    });
  }, []);

  return children as React.ReactElement;
}
