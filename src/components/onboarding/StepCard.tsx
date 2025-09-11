"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StepCardProps {
  icon: string;
  title: string;
  description: string;
  children: ReactNode;
  iconGradient?: string;
}

export function StepCard({
  icon,
  title,
  description,
  children,
  iconGradient = "from-blue-500 to-cyan-500",
}: StepCardProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Fixed header section */}
      <div className="flex-shrink-0 p-4 pb-2">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className={`w-12 h-12 bg-gradient-to-r ${iconGradient} rounded-full mx-auto mb-4 flex items-center justify-center`}
          >
            <span className="text-xl">{icon}</span>
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">{children}</div>
    </div>
  );
}
