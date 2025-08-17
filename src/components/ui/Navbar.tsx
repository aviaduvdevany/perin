"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import {
  NotificationBell,
  NotificationPreferences,
  NotificationsModal,
} from "@/components/notifications";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-[var(--card-border)] bg-[var(--background-primary)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Logo className="h-8 w-8" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            <NotificationBell onClick={() => setNotificationsOpen(true)} />
            <NotificationPreferences />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-[var(--cta-text)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 px-4 pb-3 pt-2">
              <div className="flex items-center justify-between">
                <NotificationBell
                  onClick={() => {
                    setNotificationsOpen(true);
                    setMobileMenuOpen(false);
                  }}
                />
                <NotificationPreferences />
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Notifications Modal */}
      <NotificationsModal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </>
  );
}
