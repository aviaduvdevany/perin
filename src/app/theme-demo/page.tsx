"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Glass, GlassCard, GlassPanel } from "@/components/ui/Glass";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/button";
import MagicBento from "@/components/ui/MagicBento";
import ProfileCard from "@/components/ui/profile-card/ProfileCard";
import Dock from "@/components/ui/Dock";
import ElasticSlider from "@/components/ui/ElasticSlider";
import SpotlightCard from "@/components/ui/SpotlightCard";
import { PerinLoading } from "@/components/ui/PerinLoading";
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Sparkles,
  Zap,
  Star,
  Heart,
  MessageCircle,
  Settings,
} from "lucide-react";

export default function ThemeDemoPage() {
  const { theme, resolvedTheme } = useTheme();

  const dockItems = [
    {
      icon: <Palette className="h-6 w-6" />,
      label: "Design",
      onClick: () => console.log("Design clicked"),
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      label: "Magic",
      onClick: () => console.log("Magic clicked"),
    },
    {
      icon: <Zap className="h-6 w-6" />,
      label: "Power",
      onClick: () => console.log("Power clicked"),
    },
    {
      icon: <Star className="h-6 w-6" />,
      label: "Favorites",
      onClick: () => console.log("Favorites clicked"),
    },
    {
      icon: <Heart className="h-6 w-6" />,
      label: "Love",
      onClick: () => console.log("Love clicked"),
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      label: "Chat",
      onClick: () => console.log("Chat clicked"),
    },
    {
      icon: <Settings className="h-6 w-6" />,
      label: "Settings",
      onClick: () => console.log("Settings clicked"),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background-primary)] transition-colors duration-300">
      {/* Header */}
      <Glass
        variant="strong"
        border={true}
        glow={true}
        className="sticky top-0 z-50 border-b border-[var(--card-border)]"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-[var(--cta-text)]">
                Theme Demo
              </h1>
              <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                <span>Current:</span>
                <span className="font-medium text-[var(--accent-primary)]">
                  {theme === "system" ? `${theme} (${resolvedTheme})` : theme}
                </span>
              </div>
            </div>
            <ThemeToggle size="lg" />
          </div>
        </div>
      </Glass>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Theme Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <GlassCard className="p-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-[var(--cta-text)]">
                Theme System
              </h2>
              <p className="text-[var(--foreground-muted)] max-w-2xl mx-auto">
                Experience the beautiful theme switching system. The application
                supports light, dark, and system themes with smooth transitions
                and consistent design language.
              </p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-[var(--accent-secondary)]" />
                  <span>Light Mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-[var(--accent-primary)]" />
                  <span>Dark Mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-[var(--success)]" />
                  <span>System</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Glass Components */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-6"
        >
          <h3 className="text-2xl font-bold text-[var(--cta-text)] text-center">
            Glass Components
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GlassCard className="p-6">
              <h4 className="text-lg font-semibold mb-2 text-[var(--cta-text)]">
                Default Glass
              </h4>
              <p className="text-[var(--foreground-muted)]">
                Standard glassmorphism effect with theme-aware styling.
              </p>
            </GlassCard>

            <Glass variant="strong" className="p-6">
              <h4 className="text-lg font-semibold mb-2 text-[var(--cta-text)]">
                Strong Glass
              </h4>
              <p className="text-[var(--foreground-muted)]">
                Enhanced glass effect with stronger opacity and blur.
              </p>
            </Glass>

            <Glass variant="colored" glow={true} className="p-6">
              <h4 className="text-lg font-semibold mb-2 text-[var(--cta-text)]">
                Colored Glass
              </h4>
              <p className="text-[var(--foreground-muted)]">
                Glass with accent color tint and glow effect.
              </p>
            </Glass>
          </div>
        </motion.div>

        {/* Interactive Components */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          <h3 className="text-2xl font-bold text-[var(--cta-text)] text-center">
            Interactive Components
          </h3>

          {/* Buttons */}
          <GlassPanel className="p-8">
            <h4 className="text-xl font-semibold mb-4 text-[var(--cta-text)]">
              Buttons
            </h4>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="default"
                className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"
              >
                Primary Button
              </Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
            </div>
          </GlassPanel>

          {/* Slider */}
          <GlassPanel className="p-8">
            <h4 className="text-xl font-semibold mb-4 text-[var(--cta-text)]">
              Elastic Slider
            </h4>
            <div className="max-w-md">
              <ElasticSlider
                defaultValue={50}
                maxValue={100}
                isStepped={true}
                stepSize={10}
              />
            </div>
          </GlassPanel>

          {/* Profile Card */}
          <div className="flex justify-center">
            <ProfileCard
              avatarUrl="/api/placeholder/150/150"
              name="Theme Demo"
              title="UI Showcase"
              handle="theme-demo"
              status="Online"
              className="w-80"
            />
          </div>
        </motion.div>

        {/* Magic Bento */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-6"
        >
          <h3 className="text-2xl font-bold text-[var(--cta-text)] text-center">
            Magic Bento Grid
          </h3>
          <MagicBento
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            glowColor="76, 91, 255"
          />
        </motion.div>

        {/* Spotlight Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-6"
        >
          <h3 className="text-2xl font-bold text-[var(--cta-text)] text-center">
            Spotlight Cards
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SpotlightCard className="h-48">
              <div className="text-[var(--cta-text)]">
                <h4 className="text-lg font-semibold mb-2">Spotlight Effect</h4>
                <p className="text-[var(--foreground-muted)]">
                  Beautiful spotlight effect that follows your cursor.
                </p>
              </div>
            </SpotlightCard>
            <SpotlightCard className="h-48">
              <div className="text-[var(--cta-text)]">
                <h4 className="text-lg font-semibold mb-2">Theme Aware</h4>
                <p className="text-[var(--foreground-muted)]">
                  All effects adapt to the current theme automatically.
                </p>
              </div>
            </SpotlightCard>
          </div>
        </motion.div>

        {/* Loading States */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="space-y-6"
        >
          <h3 className="text-2xl font-bold text-[var(--cta-text)] text-center">
            Loading States
          </h3>
          <div className="flex justify-center">
            <PerinLoading status="thinking" />
          </div>
        </motion.div>

        {/* Dock */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="space-y-6"
        >
          <h3 className="text-2xl font-bold text-[var(--cta-text)] text-center">
            Dock Navigation
          </h3>
          <div className="flex justify-center">
            <Dock items={dockItems} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
