"use client";

import { useEffect, useState, useCallback } from "react";
import { registerNotificationDeviceService } from "@/app/services/notifications";

declare global {
  interface Window {
    OneSignal?: {
      init: (config: { appId: string }) => void;
      push: (fn: () => void) => void;
      Notifications?: {
        requestPermission?: () => Promise<void>;
        permission?:
          | Promise<"default" | "granted" | "denied">
          | "default"
          | "granted"
          | "denied";
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
  // Default to false so the button shows until we confirm permission
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  // Load OneSignal SDK script
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return;

    const scriptId = "onesignal-sdk";
    if (document.getElementById(scriptId)) {
      // already loaded in DOM (e.g., HMR/navigation) → mark ready
      setIsReady(true);
      return;
    }

    // Prepare OneSignalDeferred per v16 docs
    // Minimal local typing for OneSignalDeferred to avoid 'any'
    type DeferredFn = (OneSignal: unknown) => void | Promise<void>;
    type DeferredArray = Array<DeferredFn> & {
      push: (fn: DeferredFn) => number;
    };
    const w = window as unknown as { OneSignalDeferred?: DeferredArray };
    w.OneSignalDeferred =
      w.OneSignalDeferred || ([] as unknown as DeferredArray);
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID as string;
    w.OneSignalDeferred.push(async function (OneSignal: unknown) {
      try {
        // init if API present
        const os = OneSignal as {
          init?: (cfg: { appId: string }) => Promise<void>;
        };
        await os?.init?.({ appId });
      } catch (e) {
        console.error("[OneSignal] init failed", e);
      }
    });

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.async = true;
    script.onload = () => setIsReady(true);
    document.head.appendChild(script);
  }, []);

  // Initialize OneSignal
  useEffect(() => {
    if (!isReady) return;
    // If using v16 deferred loader, skip old init path
    if (
      (window as unknown as { OneSignalDeferred?: unknown }).OneSignalDeferred
    )
      return;
    if (!window.OneSignal) return;
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) return;

    try {
      if (Array.isArray(window.OneSignal)) {
        (window.OneSignal as unknown as Array<() => void>).push(function () {
          window.OneSignal?.init({ appId });
        });
      } else {
        window.OneSignal.init({ appId });
      }
    } catch (e) {
      console.error("OneSignal init error", e);
    }
  }, [isReady]);

  const registerIfSubscribed = useCallback(async () => {
    try {
      // Determine permission using OneSignal if available, else fall back to browser API
      let perm: string | undefined;
      const osPerm = window.OneSignal?.Notifications?.permission;
      if (osPerm) {
        try {
          if (typeof osPerm === "string") {
            perm = osPerm;
          } else if (
            typeof (osPerm as unknown as { then?: unknown }).then === "function"
          ) {
            perm = await (osPerm as Promise<"default" | "granted" | "denied">);
          }
        } catch {}
      }
      if (!perm && typeof Notification !== "undefined") {
        perm = Notification.permission;
      }
      const hasPermission = perm === "granted";
      setIsEnabled(hasPermission);
      if (!hasPermission || !window.OneSignal) return;

      // Wait briefly for OneSignal to populate PushSubscription.id
      let playerId: string | undefined | null = undefined;
      const started = Date.now();
      while (Date.now() - started < 5000) {
        const sub =
          // v15 style
          (
            window as unknown as {
              OneSignal?: {
                User?: { pushSubscription?: { id?: string | null } };
              };
            }
          ).OneSignal?.User?.pushSubscription ||
          // v16 style
          (
            window as unknown as {
              OneSignal?: {
                User?: { PushSubscription?: { id?: string | null } };
              };
            }
          ).OneSignal?.User?.PushSubscription;
        playerId = sub?.id || null;
        if (playerId) break;
        await new Promise((r) => setTimeout(r, 200));
      }
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
      console.log("[OneSignal] Enable button clicked");
      let granted = false;
      if (
        typeof Notification !== "undefined" &&
        Notification.requestPermission
      ) {
        const result = await Notification.requestPermission();
        granted = result === "granted";
      } else if (window.OneSignal?.Notifications?.requestPermission) {
        await window.OneSignal.Notifications.requestPermission();
        // Try explicit opt-in on v16
        const optIn = (
          window as unknown as {
            OneSignal?: {
              User?: { PushSubscription?: { optIn?: () => Promise<void> } };
            };
          }
        ).OneSignal?.User?.PushSubscription?.optIn;
        if (typeof optIn === "function") {
          try {
            const subCtx = (
              window as unknown as {
                OneSignal?: { User?: { PushSubscription?: unknown } };
              }
            ).OneSignal?.User?.PushSubscription as unknown;
            await (optIn as (this: unknown) => Promise<void>).call(subCtx);
          } catch (e) {
            console.warn("[OneSignal] optIn failed", e);
          }
        }
        const osPerm = (
          window as unknown as {
            OneSignal?: {
              Notifications?: { permission?: boolean | Promise<boolean> };
            };
          }
        ).OneSignal?.Notifications?.permission;
        if (typeof osPerm === "boolean") granted = osPerm;
        else if (
          osPerm &&
          typeof (osPerm as unknown as { then?: unknown }).then === "function"
        ) {
          granted = await (osPerm as Promise<boolean>);
        } else if (typeof Notification !== "undefined") {
          granted = Notification.permission === "granted";
        }
      }
      setIsEnabled(granted);
      if (granted) {
        // Try triggering subscription explicitly if available (v16)
        try {
          const userObj = (
            window as unknown as { OneSignal?: { User?: unknown } }
          ).OneSignal?.User as unknown as {
            pushSubscription?: { subscribe?: () => Promise<void> };
            PushSubscription?: { optIn?: () => Promise<void> };
          };
          if (userObj?.pushSubscription?.subscribe) {
            console.log("[OneSignal] Calling pushSubscription.subscribe()");
            await userObj.pushSubscription.subscribe();
          } else if (userObj?.PushSubscription?.optIn) {
            console.log("[OneSignal] Calling PushSubscription.optIn()");
            await userObj.PushSubscription.optIn();
          }
        } catch (e) {
          console.warn("[OneSignal] subscribe() not available or failed", e);
        }
        await registerIfSubscribed();
      }
    } catch (e) {
      console.error("OneSignal permission error", e);
    }
  }, [registerIfSubscribed]);

  return (
    <>
      {/* Simple inline button for enabling notifications; replace with nicer UI as needed */}
      {isEnabled === false && (
        <button
          type="button"
          onClick={() => {
            console.log("[OneSignal] Button onClick fired");
            requestPermission();
          }}
          className="fixed bottom-4 right-4 z-[9999] rounded-md bg-primary text-white px-3 py-2 text-sm cursor-pointer"
          style={{ pointerEvents: "auto" }}
        >
          Enable notifications
        </button>
      )}
      {children}
    </>
  );
}
