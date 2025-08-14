"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useCallback,
  ReactNode,
  useState,
} from "react";

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export type ChatUIContextValue = {
  todayOpen: boolean;
  setTodayOpen: SetState<boolean>;
  profileOpen: boolean;
  setProfileOpen: SetState<boolean>;
  integrationsOpen: boolean;
  setIntegrationsOpen: SetState<boolean>;
  collapseTodayAfterFirstMessage: () => void;
};

const ChatUIContext = createContext<ChatUIContextValue | null>(null);

export function ChatUIProvider({
  children,
  value,
}: {
  children: ReactNode;
  value?: Partial<ChatUIContextValue> & {
    todayOpen?: boolean;
    setTodayOpen?: SetState<boolean>;
  };
}) {
  const [internalTodayOpen, setInternalTodayOpen] = useState<boolean>(
    value?.todayOpen ?? true
  );
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [integrationsOpen, setIntegrationsOpen] = useState<boolean>(false);

  const todayOpen = value?.todayOpen ?? internalTodayOpen;
  const setTodayOpen = value?.setTodayOpen ?? setInternalTodayOpen;

  const didCollapseRef = useRef(false);

  const collapseTodayAfterFirstMessage = useCallback(() => {
    if (didCollapseRef.current) return;
    didCollapseRef.current = true;
    setTodayOpen(false);
  }, [setTodayOpen]);

  const ctx = useMemo<ChatUIContextValue>(
    () => ({
      todayOpen,
      setTodayOpen,
      profileOpen,
      setProfileOpen,
      integrationsOpen,
      setIntegrationsOpen,
      collapseTodayAfterFirstMessage,
    }),
    [
      todayOpen,
      setTodayOpen,
      profileOpen,
      setProfileOpen,
      integrationsOpen,
      setIntegrationsOpen,
      collapseTodayAfterFirstMessage,
    ]
  );

  return (
    <ChatUIContext.Provider value={ctx}>{children}</ChatUIContext.Provider>
  );
}

export function useChatUI(): ChatUIContextValue {
  const ctx = useContext(ChatUIContext);
  if (!ctx) throw new Error("useChatUI must be used within ChatUIProvider");
  return ctx;
}
