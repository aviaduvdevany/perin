"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  resetToSystem: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Get theme from localStorage first
    const savedTheme = localStorage.getItem("theme") as Theme;

    if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
      // User has explicitly set a preference
      setThemeState(savedTheme);
    } else {
      // No saved preference, detect system theme
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      setThemeState(systemTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Update document class and localStorage
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't explicitly set a preference
      const savedTheme = localStorage.getItem("theme");
      if (!savedTheme) {
        const newSystemTheme = e.matches ? "dark" : "light";
        setThemeState(newSystemTheme);
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [mounted]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const resetToSystem = () => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    setThemeState(systemTheme);
    localStorage.removeItem("theme"); // Remove saved preference
  };

  // Always provide the context, even before mounting
  const contextValue = {
    theme,
    toggleTheme,
    setTheme,
    resetToSystem,
  };

  // Prevent hydration mismatch by ensuring consistent initial state
  if (!mounted) {
    return (
      <ThemeContext.Provider value={contextValue}>
        <div className="dark">{children}</div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return a default context instead of throwing an error
    // This prevents the error during SSR or when the provider is not yet mounted
    return {
      theme: "dark" as Theme,
      toggleTheme: () => {},
      setTheme: () => {},
      resetToSystem: () => {},
    };
  }
  return context;
}
