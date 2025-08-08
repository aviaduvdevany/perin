"use client";

import { motion } from "framer-motion";
import { ReactNode, useMemo, useState } from "react";
import TodoList from "@/components/ui/TodoList";
import TodayCard from "@/components/ui/TodayCard";
import SidebarRail from "@/components/ui/SidebarRail";
import ProfileDrawer from "@/components/ui/ProfileDrawer";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import BottomSheet from "@/components/ui/BottomSheet";
import ProfileSummary from "@/components/ui/ProfileSummary";
import MobileTopBar from "@/components/ui/MobileTopBar";

export default function ChatWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [todayOpen, setTodayOpen] = useLocalStorage<boolean>(
    "chat.right.todayOpen",
    false
  );

  // Mobile sheets
  const [mobileTasksOpen, setMobileTasksOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);

  return (
    <div className="min-h[calc(100vh-64px)] bg-[var(--background-primary)]">
      {/* Mobile top bar */}
      <MobileTopBar
        onOpenTasks={() => setMobileTasksOpen(true)}
        onOpenProfile={() => setMobileProfileOpen(true)}
      />

      <div className="mx-auto max-w-[1400px] h-full px-4 pt-12 lg:pt-0">
        <div className="grid grid-cols-12 gap-4 h-full py-4">
          {/* Left icon rail (desktop/tablet) */}
          <motion.aside
            className="hidden lg:flex col-span-1"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
          >
            <SidebarRail
              onOpenProfile={() => setProfileOpen(true)}
              className="w-full"
            />
          </motion.aside>

          {/* Center - Chat */}
          <main className="col-span-12 lg:col-span-7 xl:col-span-8 h-full pb-6 lg:pb-10">
            {children}
          </main>

          {/* Right rail - desktop/tablet */}
          <motion.aside
            className="hidden lg:block col-span-4 xl:col-span-3 space-y-4"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
          >
            <CollapsibleCard
              title="Today"
              open={todayOpen}
              onToggle={() => setTodayOpen(!todayOpen)}
            >
              <TodayCard />
            </CollapsibleCard>
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-background)] p-4">
              <h3 className="text-sm font-semibold text-[var(--cta-text)] mb-2">
                To‑do
              </h3>
              <TodoList />
            </div>
          </motion.aside>
        </div>
      </div>

      {/* Desktop drawer */}
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Mobile sheets (z-index higher than input) */}
      <BottomSheet
        open={mobileTasksOpen}
        onClose={() => setMobileTasksOpen(false)}
        title="To‑do"
      >
        <div className="mt-4">
          <CollapsibleCard
            title="Today"
            open={todayOpen}
            onToggle={() => setTodayOpen(!todayOpen)}
          >
            <TodayCard />
          </CollapsibleCard>
        </div>
        <TodoList />
      </BottomSheet>

      <BottomSheet
        open={mobileProfileOpen}
        onClose={() => setMobileProfileOpen(false)}
        title="Profile"
      >
        <ProfileSummary />
      </BottomSheet>
    </div>
  );
}
