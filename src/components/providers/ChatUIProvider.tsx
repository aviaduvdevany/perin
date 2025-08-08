"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useCallback,
  ReactNode,
} from "react";

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export type ChatUIContextValue = {
  todayOpen: boolean;
  setTodayOpen: SetState<boolean>;
  collapseTodayAfterFirstMessage: () => void;
};

const ChatUIContext = createContext<ChatUIContextValue | null>(null);

export function ChatUIProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: { todayOpen: boolean; setTodayOpen: SetState<boolean> };
}) {
  const didCollapseRef = useRef(false);

  const collapseTodayAfterFirstMessage = useCallback(() => {
    if (didCollapseRef.current) return;
    didCollapseRef.current = true;
    value.setTodayOpen(false);
  }, [value]);

  const ctx = useMemo<ChatUIContextValue>(
    () => ({
      todayOpen: value.todayOpen,
      setTodayOpen: value.setTodayOpen,
      collapseTodayAfterFirstMessage,
    }),
    [value.todayOpen, value.setTodayOpen, collapseTodayAfterFirstMessage]
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
