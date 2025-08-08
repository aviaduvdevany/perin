"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface SidebarRailProps {
  onOpenProfile: () => void;
  className?: string;
  size?: "md" | "lg";
}

export default function SidebarRail({
  onOpenProfile,
  className = "",
  size = "md",
}: SidebarRailProps) {
  const [expanded, setExpanded] = useLocalStorage<boolean>(
    "chat.sidebar.expanded",
    false
  );
  const [hovered, setHovered] = useState(false);

  const collapsedWidth = size === "lg" ? "w-[72px]" : "w-[56px]";
  const expandedWidth = size === "lg" ? "w-60" : "w-48";
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
      className={`w-full flex items-center gap-3 ${itemPad} rounded-xl text-[var(--cta-text)] hover:bg-white/5 border border-transparent hover:border-[var(--card-border)] transition-colors`}
      onClick={onClick}
      aria-label={label}
    >
      <span className={`${iconSize}`} aria-hidden>
        {icon}
      </span>
      {(expanded || hovered) && (
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
        className={`border border-[var(--card-border)] bg-[var(--card-background)] rounded-2xl p-2 ${
          expanded ? expandedWidth : collapsedWidth
        } transition-[width] duration-200`}
      >
        <div className="space-y-1">
          <Item icon="👤" label="Profile" onClick={onOpenProfile} />
          <Item icon="🧩" label="Integrations" onClick={onOpenProfile} />
          <Item icon="🕸️" label="Network" onClick={onOpenProfile} />
        </div>
        <div className="pt-2 mt-2 border-t border-[var(--card-border)]">
          <Item
            icon={expanded ? "◀" : "▶"}
            label={expanded ? "Collapse" : "Expand"}
            onClick={() => setExpanded(!expanded)}
          />
        </div>
      </div>
    </div>
  );
}
