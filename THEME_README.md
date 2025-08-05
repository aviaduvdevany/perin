# 🎨 Perin Theme System

> A comprehensive light and dark theme system with system preference detection and smooth transitions.

## 🚀 Features

- **Three Theme Modes**: Light, Dark, and System (follows OS preference)
- **Smooth Transitions**: 300ms color transitions for all theme changes
- **Persistent Storage**: Theme preference saved in localStorage
- **System Detection**: Automatically detects and follows OS theme preference
- **Theme-Aware Components**: All UI components adapt to the current theme
- **CSS Variables**: Centralized color management with CSS custom properties

## 🎯 Quick Start

### Using the Theme Toggle

The theme toggle is available in the navbar and provides three options:

```tsx
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// Simple button toggle (cycles through themes)
<ThemeToggle variant="button" />

// Dropdown toggle (shows all options)
<ThemeToggle variant="dropdown" />
```

### Using the Theme Hook

```tsx
import { useTheme } from "@/hooks/useTheme";

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Resolved theme: {resolvedTheme}</p>
      <button onClick={() => setTheme("light")}>Light</button>
      <button onClick={() => setTheme("dark")}>Dark</button>
      <button onClick={() => setTheme("system")}>System</button>
    </div>
  );
}
```

## 🏗️ Architecture

### Theme Provider

The theme system is built around a React Context provider that manages theme state:

```tsx
// src/components/providers/ThemeProvider.tsx
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Manages theme state, system detection, and localStorage persistence
}
```

### Theme Utilities

```tsx
// src/lib/theme.ts
export type Theme = "light" | "dark" | "system";

export function applyTheme(theme: Theme) {
  // Applies theme classes and data attributes to document
}

export function getSystemTheme(): "light" | "dark" {
  // Detects OS theme preference
}
```

### CSS Variables

The theme system uses CSS custom properties for all colors:

```css
/* Dark theme */
.dark {
  --background-primary: #0a0a0a;
  --background-secondary: #111216;
  --accent-primary: #4c5bff;
  --accent-secondary: #ff7300;
  --cta-text: #ffffff;
  /* ... more variables */
}

/* Light theme */
.light {
  --background-primary: #f8f9fc;
  --background-secondary: #ffffff;
  --accent-primary: #4c5bff;
  --accent-secondary: #ff7300;
  --cta-text: #0a0a0a;
  /* ... more variables */
}
```

## 🎨 Color Palette

### Dark Theme Colors

| Variable                 | Color     | Usage                |
| ------------------------ | --------- | -------------------- |
| `--background-primary`   | `#0a0a0a` | Main background      |
| `--background-secondary` | `#111216` | Secondary background |
| `--accent-primary`       | `#4c5bff` | Primary accent       |
| `--accent-secondary`     | `#ff7300` | Secondary accent     |
| `--cta-text`             | `#ffffff` | Call-to-action text  |
| `--success`              | `#00ffc2` | Success states       |
| `--error`                | `#ff4b4b` | Error states         |

### Light Theme Colors

| Variable                 | Color     | Usage                   |
| ------------------------ | --------- | ----------------------- |
| `--background-primary`   | `#f8f9fc` | Main background         |
| `--background-secondary` | `#ffffff` | Secondary background    |
| `--accent-primary`       | `#4c5bff` | Primary accent (same)   |
| `--accent-secondary`     | `#ff7300` | Secondary accent (same) |
| `--cta-text`             | `#0a0a0a` | Call-to-action text     |
| `--success`              | `#00c896` | Success states          |
| `--error`                | `#e53e3e` | Error states            |

## 🧩 Component Integration

### Glass Components

Glass components automatically adapt to the current theme:

```tsx
import { Glass, GlassCard, GlassPanel } from "@/components/ui/Glass";

// These components use theme-aware CSS variables
<Glass variant="default" className="p-6">
  <h3>Theme-aware content</h3>
</Glass>

<GlassCard className="p-6">
  <h3>Card content</h3>
</GlassCard>

<GlassPanel className="p-8">
  <h3>Panel content</h3>
</GlassPanel>
```

### Theme-Aware Styling

Use CSS variables in your components for theme consistency:

```tsx
function MyComponent() {
  return (
    <div className="bg-[var(--background-primary)] text-[var(--cta-text)]">
      <h1 className="text-[var(--accent-primary)]">Title</h1>
      <p className="text-[var(--foreground-muted)]">Description</p>
      <button className="bg-[var(--accent-primary)] text-[var(--background-primary)]">
        Button
      </button>
    </div>
  );
}
```

## 🔧 Customization

### Adding New Theme Colors

1. **Update CSS Variables** in `src/app/globals.css`:

```css
.dark {
  --my-custom-color: #ff0000;
}

.light {
  --my-custom-color: #cc0000;
}
```

2. **Use in Components**:

```tsx
<div className="bg-[var(--my-custom-color)]">Custom colored content</div>
```

### Creating Theme Variants

You can create additional theme variants by adding new CSS classes:

```css
.theme-custom {
  --background-primary: #custom-color;
  --accent-primary: #custom-accent;
  /* ... other variables */
}
```

### Theme-Aware Animations

Use CSS variables in animations for theme consistency:

```css
@keyframes glow {
  0%,
  100% {
    box-shadow: 0 0 20px var(--accent-primary);
  }
  50% {
    box-shadow: 0 0 30px var(--accent-secondary);
  }
}
```

## 📱 Mobile Support

The theme system works seamlessly on mobile devices:

- **Touch-friendly**: Theme toggle is optimized for touch interaction
- **Responsive**: All theme-aware components are mobile responsive
- **Performance**: Smooth transitions work well on mobile devices

## 🎯 Best Practices

### 1. Always Use CSS Variables

```tsx
// ✅ Good - Theme-aware
<div className="bg-[var(--background-primary)] text-[var(--cta-text)]">

// ❌ Bad - Hard-coded colors
<div className="bg-black text-white">
```

### 2. Test Both Themes

Always test your components in both light and dark themes:

```tsx
// Visit /theme-demo to see all components in both themes
```

### 3. Consider Contrast

Ensure sufficient contrast in both themes:

```css
/* Use foreground-muted for secondary text */
<p className="text-[var(--foreground-muted)]">Secondary text</p>

/* Use foreground-subtle for subtle text */
<span className="text-[var(--foreground-subtle)]">Subtle text</span>
```

### 4. Smooth Transitions

Add transition classes for smooth theme changes:

```tsx
<div className="transition-colors duration-300">
  {/* Content that changes with theme */}
</div>
```

## 🚀 Demo

Visit `/theme-demo` to see the theme system in action with all components showcased in both light and dark modes.

## 🔍 Troubleshooting

### Theme Not Persisting

- Check that `localStorage` is available in your environment
- Ensure the `ThemeProvider` is wrapping your app

### Hydration Mismatch

The theme provider includes hydration protection to prevent mismatches between server and client rendering.

### Components Not Updating

- Ensure components use CSS variables instead of hard-coded colors
- Check that the `ThemeProvider` is properly configured in your layout

## 📚 Related Documentation

- **[Design System](./DESIGN.md)** - Overall design guidelines
- **[UI Components](./src/components/ui/README.md)** - Component documentation
- **[Global Styles](./src/app/globals.css)** - CSS variable definitions

---

**Built with ❤️ by the Perin Development Team**
