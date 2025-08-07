"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PerinChat } from "@/components/PerinChat";

export default function ChatPage() {
  const { session, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [perinStatus, setPerinStatus] = useState<
    "idle" | "thinking" | "typing" | "listening" | "busy"
  >("idle");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background-primary)] flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-[var(--foreground-muted)] text-sm">
            Loading Perin...
          </p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-[var(--background-primary)] flex flex-col">
      {/* Main Content - Full Screen Chat */}
      <main className="flex-1">
        <motion.div
          className="h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <PerinChat />
        </motion.div>
      </main>
    </div>
  );
}
