"use client";

import { ReactNode, useState } from "react";
import TodayCard from "@/components/ui/TodayCard";
import SidebarRail from "@/components/ui/SidebarRail";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import { ChatUIProvider } from "@/components/providers/ChatUIProvider";

export default function ChatWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [todayOpen, setTodayOpen] = useState(true); // open on entry

  return (
    <ChatUIProvider value={{ todayOpen, setTodayOpen }}>
      <div className="relative min-h[calc(100vh-64px)] bg-[var(--background-primary)]">
        <div className="mx-auto max-w-[1400px] h-full px-4">
          <div className="grid grid-cols-12 gap-4 h-full py-4">
            <div className="hidden lg:block col-span-1" />
            <main className="col-span-12 lg:col-span-10 xl:col-span-10 h-full">
              {children}
            </main>
            <div className="hidden lg:block col-span-1" />
          </div>
        </div>

        {/* Fixed left rail, centered */}
        <div className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 z-30">
          <SidebarRail size="lg" onOpenProfile={() => {}} />
        </div>

        {/* Floating Today overlay on right (no layout shift) */}
        <div className="hidden lg:block fixed right-6 top-24 z-20 w-[360px] max-w-[38vw]">
          <CollapsibleCard
            title="Today"
            open={todayOpen}
            onToggle={() => setTodayOpen((v) => !v)}
          >
            <TodayCard />
          </CollapsibleCard>
        </div>
      </div>
    </ChatUIProvider>
  );
}
