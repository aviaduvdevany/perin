"use client";

import { useEffect } from "react";
import { registerNotificationDeviceService } from "@/app/services/notifications";

type OneSignalApi = {
  init: (opts: { appId: string }) => void;
  push: (fn: () => void) => void;
  on: (event: string, cb: (isSubscribed: boolean) => void) => void;
  Slidedown: { promptPush: () => void };
  User?: { PushSubscription?: { id?: string } };
};

declare global {
  interface Window {
    OneSignal?: OneSignalApi | Array<(fn: () => void) => void>;
  }
}

type Props = { children: React.ReactNode };

export default function NotificationsProvider({ children }: Props) {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) return;

    // Lazy init OneSignal for web push
    (async () => {
      if (!window.OneSignal) {
        window.OneSignal = [] as unknown as OneSignalApi;
      }
      const OneSignal = window.OneSignal as unknown as OneSignalApi & {
        push: (fn: () => void) => void;
      };
      OneSignal.push(function () {
        OneSignal.init({ appId });
      });

      OneSignal.push(function () {
        OneSignal.Slidedown.promptPush();
      });

      OneSignal.push(function () {
        OneSignal.on(
          "subscriptionChange",
          async function (isSubscribed: boolean) {
            if (isSubscribed) {
              const playerId = OneSignal.User?.PushSubscription?.id;
              if (playerId) {
                try {
                  await registerNotificationDeviceService("web", playerId, {
                    ua: navigator.userAgent,
                  });
                } catch (err) {
                  console.error("Failed to register web push device", err);
                }
              }
            }
          }
        );
      });
    })();
  }, []);

  return children as React.ReactElement;
}
