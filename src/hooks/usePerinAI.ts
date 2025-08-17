import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getUserIdFromSession } from "@/lib/utils/session-helpers";
import type {
  PerinChatRequest,
  PerinMemoryRequest,
  PerinMemoryResponse,
} from "@/types/ai";
import { useUserData } from "@/components/providers/UserDataProvider";

export interface UsePerinAI {
  // Chat functionality
  sendMessage: (request: PerinChatRequest) => Promise<ReadableStream | null>;
  isChatLoading: boolean;
  chatError: string | null;

  // Memory functionality
  getMemory: (keys?: string[]) => Promise<PerinMemoryResponse | null>;
  addMemory: (request: PerinMemoryRequest) => Promise<boolean>;
  clearMemory: (keys: string[]) => Promise<boolean>;
  isMemoryLoading: boolean;
  memoryError: string | null;

  // Intent classification
  classifyIntent: (message: string) => Promise<ReadableStream | null>;
  isClassifying: boolean;
  classificationError: string | null;
}

export function usePerinAI(): UsePerinAI {
  const { data: session } = useSession();
  const { state } = useUserData();
  const { integrations } = state;
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isMemoryLoading, setIsMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(
    null
  );

  const sendMessage = useCallback(
    async (request: PerinChatRequest): Promise<ReadableStream | null> => {
      const userId = getUserIdFromSession(session);
      if (!userId) {
        setChatError("Authentication required");
        return null;
      }

      setIsChatLoading(true);
      setChatError(null);

      try {
        const connectedTypes = Array.from(
          new Set(
            (integrations || []).filter((i) => i.isActive).map((i) => i.type)
          )
        );

        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...request,
            clientIntegrations: connectedTypes,
          }),
        });

        if (!response.ok) {
          const contentType = response.headers.get("content-type");

          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to send message");
          } else {
            // If it's not JSON, it might be HTML
            const text = await response.text();
            console.error(
              "Non-JSON response received:",
              text.substring(0, 500)
            );
            throw new Error("Received non-JSON response from server");
          }
        }

        return response.body;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setChatError(errorMessage);
        return null;
      } finally {
        setIsChatLoading(false);
      }
    },
    [session, integrations]
  );

  const getMemory = useCallback(
    async (keys?: string[]): Promise<PerinMemoryResponse | null> => {
      const userId = getUserIdFromSession(session);
      if (!userId) {
        setMemoryError("Authentication required");
        return null;
      }

      setIsMemoryLoading(true);
      setMemoryError(null);

      try {
        const url =
          keys && keys.length > 0
            ? `/api/ai/memory?keys=${keys.join(",")}`
            : "/api/ai/memory";

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to get memory");
        }

        const data = await response.json();
        return data.memory;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setMemoryError(errorMessage);
        return null;
      } finally {
        setIsMemoryLoading(false);
      }
    },
    [session]
  );

  const addMemory = useCallback(
    async (request: PerinMemoryRequest): Promise<boolean> => {
      const userId = getUserIdFromSession(session);
      if (!userId) {
        setMemoryError("Authentication required");
        return false;
      }

      setIsMemoryLoading(true);
      setMemoryError(null);

      try {
        const response = await fetch("/api/ai/memory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to add memory");
        }

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setMemoryError(errorMessage);
        return false;
      } finally {
        setIsMemoryLoading(false);
      }
    },
    [session]
  );

  const clearMemory = useCallback(
    async (keys: string[]): Promise<boolean> => {
      const userId = getUserIdFromSession(session);
      if (!userId) {
        setMemoryError("Authentication required");
        return false;
      }

      setIsMemoryLoading(true);
      setMemoryError(null);

      try {
        const response = await fetch(`/api/ai/memory?keys=${keys.join(",")}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to clear memory");
        }

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setMemoryError(errorMessage);
        return false;
      } finally {
        setIsMemoryLoading(false);
      }
    },
    [session]
  );

  const classifyIntent = useCallback(
    async (message: string): Promise<ReadableStream | null> => {
      const userId = getUserIdFromSession(session);
      if (!userId) {
        setClassificationError("Authentication required");
        return null;
      }

      setIsClassifying(true);
      setClassificationError(null);

      try {
        const response = await fetch("/api/ai/classify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to classify intent");
        }

        return response.body;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setClassificationError(errorMessage);
        return null;
      } finally {
        setIsClassifying(false);
      }
    },
    [session]
  );

  return {
    sendMessage,
    isChatLoading,
    chatError,
    getMemory,
    addMemory,
    clearMemory,
    isMemoryLoading,
    memoryError,
    classifyIntent,
    isClassifying,
    classificationError,
  };
}
