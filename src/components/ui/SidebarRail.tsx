"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useUserData } from "@/components/providers/UserDataProvider";

interface SidebarRailProps {
  className?: string;
  size?: "md" | "lg";
}

export default function SidebarRail({
  className = "",
  size = "md",
}: SidebarRailProps) {
  const { actions } = useUserData();
  const { setIntegrationsOpen, setProfileOpen, setNetworkOpen } = actions;
  const [hovered, setHovered] = useState(false);

  const collapsedWidth = size === "lg" ? "w-[72px]" : "w-[56px]";
  const expandedWidth = size === "lg" ? "w-48" : "w-48";
  const itemPad = size === "lg" ? "px-4 py-3" : "px-3 py-2";
  const iconSize = size === "lg" ? "text-2xl" : "text-lg";

  const Item = ({
    icon,
    label,
    onClick,
  }: {
    icon: string;
    label: string;
    onClick: () => void;
  }) => (
    <button
      className={`w-full cursor-pointer flex items-center gap-3 ${itemPad} rounded-xl text-[var(--cta-text)] hover:bg-white/7 border border-transparent hover:border-[var(--card-border)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/35`}
      onClick={onClick}
      aria-label={label}
    >
      <span className={`${iconSize}`} aria-hidden>
        {icon}
      </span>
      {hovered && (
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm"
        >
          {label}
        </motion.span>
      )}
    </button>
  );

  return (
    <div
      className={`h-auto flex flex-col justify-between ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`rounded-2xl p-2 ${
          hovered ? expandedWidth : collapsedWidth
        } transition-[width] duration-200 border border-[var(--card-border)]`}
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--accent-primary) 10%, transparent), color-mix(in oklab, var(--accent-secondary) 10%, transparent))",
        }}
      >
        <div className="space-y-1">
          <Item
            icon="👤"
            label="Profile"
            onClick={() => setProfileOpen(true)}
          />
          <Item
            icon="🧩"
            label="Integrations"
            onClick={() => setIntegrationsOpen(true)}
          />
          <Item
            icon="🕸️"
            label="Network"
            onClick={() => setNetworkOpen(true)}
          />
        </div>
      </div>
    </div>
  );
}
