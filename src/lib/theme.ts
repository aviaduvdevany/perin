export type Theme = "light" | "dark" | "system";

export interface ThemeConfig {
  name: Theme;
  label: string;
  icon: string;
}

export const themes: ThemeConfig[] = [
  {
    name: "light",
    label: "Light",
    icon: "☀️",
  },
  {
    name: "dark",
    label: "Dark",
    icon: "🌙",
  },
  {
    name: "system",
    label: "System",
    icon: "💻",
  },
];

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;

  const root = window.document.documentElement;
  const systemTheme = getSystemTheme();

  // Remove existing theme classes
  root.classList.remove("light", "dark");

  // Apply the appropriate theme
  if (theme === "system") {
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }

  // Update data attribute for CSS selectors
  root.setAttribute("data-theme", theme === "system" ? systemTheme : theme);
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("theme") as Theme) || "system";
}

export function setStoredTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem("theme", theme);
}
