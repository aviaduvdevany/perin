"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./navigation-menu";
import { Button } from "./button";
import { Home, LayoutDashboard, User, LogOut, Menu, X } from "lucide-react";

export function Navbar() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigationItems = [
    {
      name: "Home",
      href: "/",
      icon: Home,
      description: "Welcome to Perin",
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Your productivity hub",
      requiresAuth: true,
    },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[var(--card-border)] glassmorphism-strong">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo size="md" animated={true} />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            <NavigationMenu>
              <NavigationMenuList>
                {navigationItems.map((item) => {
                  // Skip auth-required items if not authenticated
                  if (item.requiresAuth && !isAuthenticated) return null;

                  return (
                    <NavigationMenuItem key={item.name}>
                      <Link href={item.href} passHref>
                        <NavigationMenuLink
                          className={cn(
                            navigationMenuTriggerStyle(),
                            "flex items-center gap-2 transition-all duration-300",
                            isActive(item.href)
                              ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] glow-primary"
                              : "text-[var(--cta-text)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.name}
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
              {!isLoading && (
                <>
                  {isAuthenticated ? (
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => logout()}
                        className="flex items-center gap-2 text-[var(--cta-text)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all duration-300"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white hover:shadow-lg hover:shadow-[var(--accent-primary)]/25 transition-all duration-300 glow-primary"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <Link href="/auth/signin">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[var(--cta-text)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all duration-300"
                        >
                          Sign In
                        </Button>
                      </Link>
                      <Link href="/auth/signup">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white hover:shadow-lg hover:shadow-[var(--accent-primary)]/25 transition-all duration-300 glow-primary"
                        >
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
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
          <div className="md:hidden glassmorphism border-t border-[var(--card-border)]">
            <div className="space-y-1 pb-3 pt-2">
              {navigationItems.map((item) => {
                // Skip auth-required items if not authenticated
                if (item.requiresAuth && !isAuthenticated) return null;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300",
                      isActive(item.href)
                        ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] glow-primary"
                        : "text-[var(--cta-text)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Auth Buttons */}
            <div className="border-t border-[var(--card-border)] pt-4 pb-3">
              {!isLoading && (
                <>
                  {isAuthenticated ? (
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-[var(--cta-text)] hover:bg-[var(--accent-primary)]/10 transition-all duration-300"
                        onClick={() => logout()}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                      <Button
                        variant="default"
                        className="w-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white glow-primary"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Link href="/auth/signin" className="block">
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-[var(--cta-text)] hover:bg-[var(--accent-primary)]/10 transition-all duration-300"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Sign In
                        </Button>
                      </Link>
                      <Link href="/auth/signup" className="block">
                        <Button
                          variant="default"
                          className="w-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white glow-primary"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
