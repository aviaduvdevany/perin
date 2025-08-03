"use client";

import { motion } from "framer-motion";

interface PerinLoadingProps {
  status?: "idle" | "thinking" | "typing" | "listening" | "processing";
  className?: string;
}

export function PerinLoading({ className = "" }: PerinLoadingProps) {
  return (
    <motion.div
      className={`flex flex-col items-center justify-center space-y-8 ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
  

      {/* Visual Status Indicators */}
      <div className="flex flex-col items-center space-y-6">
        {/* Pulsing Ring */}
        <motion.div
          className="relative"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            className="w-16 h-16 rounded-full border-2 border-[var(--primary)]/30"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute inset-0 w-16 h-16 rounded-full border-2 border-[var(--accent)]/40"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />
        </motion.div>

        {/* Floating Particles */}
        <div className="relative w-24 h-8">
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={index}
              className="absolute w-1.5 h-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-full"
              style={{
                left: `${25 * index}%`,
                top: "50%",
              }}
              animate={{
                y: [0, -8, 0],
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.4,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
