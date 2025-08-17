"use client";

import React from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { Glass } from "./Glass";
import { Button } from "./button";
import { Menu, X } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <Glass
      variant="strong"
      border={true}
      glow={false}
      backdropBlur="xl"
      className="z-50 w-full border-b border-[var(--card-border)]"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo size="md" animated={true} />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            <NotificationBell />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-[var(--cta-text)] hover:bg-[var(--accent-primary)]/10 transition-all duration-300"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <Glass
            variant="default"
            border={true}
            glow={false}
            className="md:hidden border-t border-[var(--card-border)]"
          >
            <div className="border-t border-[var(--card-border)] pt-4 pb-3">
              <div className="space-y-2">
                <NotificationBell />
              </div>
            </div>
          </Glass>
        )}
      </div>
    </Glass>
  );
}
