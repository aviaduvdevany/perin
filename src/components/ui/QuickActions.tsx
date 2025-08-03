"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action: () => void;
  category: "scheduling" | "communication" | "organization" | "automation";
}

interface QuickActionsProps {
  actions?: QuickAction[];
  className?: string;
  onActionTrigger?: (actionId: string) => void;
}

const defaultActions: QuickAction[] = [
  {
    id: "schedule-meeting",
    title: "Schedule Meeting",
    description: "Find the best time for everyone",
    icon: "📅",
    color: "#6366f1",
    action: () => console.log("Schedule meeting"),
    category: "scheduling",
  },
  {
    id: "send-email",
    title: "Draft Email",
    description: "Compose a professional message",
    icon: "✉️",
    color: "#8b5cf6",
    action: () => console.log("Draft email"),
    category: "communication",
  },
  {
    id: "coordinate-tasks",
    title: "Coordinate Tasks",
    description: "Organize and prioritize work",
    icon: "📋",
    color: "#06b6d4",
    action: () => console.log("Coordinate tasks"),
    category: "organization",
  },
  {
    id: "negotiate-time",
    title: "Negotiate Time",
    description: "Find optimal scheduling solutions",
    icon: "🤝",
    color: "#ec4899",
    action: () => console.log("Negotiate time"),
    category: "scheduling",
  },
  {
    id: "follow-up",
    title: "Follow Up",
    description: "Send gentle reminders",
    icon: "🔔",
    color: "#f59e0b",
    action: () => console.log("Follow up"),
    category: "communication",
  },
  {
    id: "auto-respond",
    title: "Auto Respond",
    description: "Set up smart replies",
    icon: "🤖",
    color: "#10b981",
    action: () => console.log("Auto respond"),
    category: "automation",
  },
];

export default function QuickActions({
  actions = defaultActions,
  className = "",
  onActionTrigger,
}: QuickActionsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const categories = [
    { id: "all", label: "All", icon: "🌟" },
    { id: "scheduling", label: "Schedule", icon: "📅" },
    { id: "communication", label: "Communicate", icon: "💬" },
    { id: "organization", label: "Organize", icon: "📋" },
    { id: "automation", label: "Automate", icon: "⚡" },
  ];

  const filteredActions =
    selectedCategory === "all"
      ? actions
      : actions.filter((action) => action.category === selectedCategory);

  const handleActionClick = (action: QuickAction) => {
    action.action();
    onActionTrigger?.(action.id);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Category Filter */}
      <motion.div
        className="flex flex-wrap gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {categories.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
              selectedCategory === category.id
                ? "bg-[var(--primary)] text-white shadow-lg"
                : "bg-[var(--card-background)] text-[var(--foreground-muted)] border border-[var(--card-border)] hover:bg-[var(--card-background-light)]"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Actions Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AnimatePresence mode="wait">
          {filteredActions.map((action, index) => (
            <motion.div
              key={action.id}
              className="relative group"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onHoverStart={() => setHoveredAction(action.id)}
              onHoverEnd={() => setHoveredAction(null)}
            >
              {/* Action Card */}
              <motion.div
                className="relative p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-background)] cursor-pointer overflow-hidden"
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleActionClick(action)}
                style={{
                  background: `linear-gradient(135deg, ${action.color}10, ${action.color}05)`,
                }}
              >
                {/* Background Pattern */}
                <div
                  className="absolute inset-0 opacity-5"
                  style={{
                    background: `radial-gradient(circle at 20% 80%, ${action.color}, transparent 50%)`,
                  }}
                />

                {/* Glow Effect */}
                <AnimatePresence>
                  {hoveredAction === action.id && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${action.color}20, transparent 70%)`,
                        filter: "blur(20px)",
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Content */}
                <div className="relative z-10 space-y-4">
                  {/* Icon */}
                  <motion.div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${action.color}20` }}
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {action.icon}
                  </motion.div>

                  {/* Text Content */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-[var(--foreground)] text-lg">
                      {action.title}
                    </h3>
                    <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
                      {action.description}
                    </p>
                  </div>

                  {/* Action Indicator */}
                  <motion.div
                    className="flex items-center justify-between"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span className="text-xs text-[var(--foreground-muted)]">
                      Click to activate
                    </span>
                    <motion.div
                      className="w-6 h-6 rounded-full bg-[var(--primary)]/20 flex items-center justify-center"
                      whileHover={{ scale: 1.2 }}
                    >
                      <svg
                        className="w-3 h-3 text-[var(--primary)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </motion.div>
                  </motion.div>
                </div>

                {/* Border Glow */}
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-transparent"
                  style={{
                    background: `linear-gradient(135deg, ${action.color}30, transparent, ${action.color}30)`,
                    backgroundClip: "padding-box",
                  }}
                  animate={{
                    background:
                      hoveredAction === action.id
                        ? `linear-gradient(135deg, ${action.color}50, transparent, ${action.color}50)`
                        : `linear-gradient(135deg, ${action.color}30, transparent, ${action.color}30)`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredActions.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-[var(--card-background)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            No actions found
          </h3>
          <p className="text-[var(--foreground-muted)]">
            Try selecting a different category or check back later for new
            actions.
          </p>
        </motion.div>
      )}
    </div>
  );
}
