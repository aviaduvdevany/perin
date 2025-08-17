# 🎨 Modal System Architecture

This document describes the comprehensive modal system implemented in the Perin application, providing a consistent and reusable approach to modal dialogs across the user interface.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Base Modal Component](#base-modal-component)
- [Modal Components](#modal-components)
- [Integration with Sidebar](#integration-with-sidebar)
- [Design System](#design-system)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

## 🎯 Overview

The modal system provides a unified approach to modal dialogs with:

- **Consistent Design**: All modals follow the same visual design language
- **Reusable Components**: Base modal component for easy extension
- **Accessibility**: Full ARIA support and keyboard navigation
- **Animations**: Smooth enter/exit animations using Framer Motion
- **Responsive Design**: Adapts to different screen sizes
- **Type Safety**: Full TypeScript support

## 🏗️ Architecture

### File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── BaseModal.tsx              # Reusable base modal component
│   │   └── ConfirmDialog.tsx          # Confirmation dialog component
│   └── dock-modals/
│       ├── IntegrationManagerModal.tsx # Integration management (existing)
│       ├── ProfileModal.tsx           # Profile & settings management
│       └── NetworkModal.tsx           # Network connections management
├── app/
│   └── chat/
│       └── layout.tsx                 # Chat layout with sidebar integration
└── components/
    └── ui/
        └── SidebarRail.tsx            # Updated sidebar with modal triggers
```

### Component Hierarchy

```
SidebarRail
├── ProfileModal (triggered by 👤)
├── NetworkModal (triggered by 🕸️)
└── IntegrationManagerModal (triggered by 🧩)
    └── ConfirmDialog (for destructive actions)
```

## 🧩 Base Modal Component

### Features

- **Flexible Sizing**: `sm`, `md`, `lg`, `xl` size options
- **Backdrop Blur**: Modern backdrop with blur effect
- **Smooth Animations**: Scale and fade animations
- **Accessibility**: ARIA labels and keyboard support
- **Customizable**: Configurable close button and content

### Props Interface

```typescript
interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
  closeButtonText?: string;
  className?: string;
}
```

### Usage Example

```typescript
import BaseModal from "@/components/ui/BaseModal";

function MyModal({ open, onClose }) {
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="My Modal"
      description="Optional description"
      size="lg"
    >
      <div>Your modal content here</div>
    </BaseModal>
  );
}
```

## 🎭 Modal Components

### Profile Modal

**Purpose**: Manage user profile information and preferences

**Features**:

- **Tabbed Interface**: Profile, Preferences, Settings tabs
- **Form Management**: Real-time form updates with validation
- **User Preferences**: Tone, timezone, working hours configuration
- **Account Information**: Display user metadata and privacy settings

**Tabs**:

1. **Profile**: Name, email, Perin's name for addressing
2. **Preferences**: Conversation tone, timezone, working hours
3. **Settings**: Account information and privacy settings

**API Integration**:

- `getUserProfileService()` - Load user data
- `updateUserProfileService()` - Save profile changes

### Network Modal

**Purpose**: Manage network connections and invitations

**Features**:

- **Connection Management**: View active connections and pending invitations
- **Invitation System**: Send and accept connection invitations
- **Status Tracking**: Visual status indicators for connection states
- **Permission Management**: Configure connection scopes and constraints

**Tabs**:

1. **Connections**: Active network connections with management options
2. **Invitations**: Pending invitations with accept/reject actions
3. **Invite**: Send new connection invitations

**API Integration**:

- `listConnectionsService()` - Load connections
- `createConnectionService()` - Send invitations
- `acceptConnectionService()` - Accept invitations
- `revokeConnectionService()` - Revoke connections

### Integration Manager Modal

**Purpose**: Manage third-party integrations (existing component)

**Features**:

- **Multi-Integration Support**: Gmail, Calendar, and future integrations
- **OAuth Flow**: Seamless connection and disconnection
- **Status Monitoring**: Real-time integration status
- **Account Management**: Multiple account support per integration

## 🔗 Integration with Sidebar

### SidebarRail Updates

The `SidebarRail` component has been updated to:

- **Self-Contained Modals**: Each button triggers its own modal
- **State Management**: Internal modal state management
- **Consistent UX**: Unified interaction patterns

### Updated Interface

```typescript
// Before
interface SidebarRailProps {
  onOpenProfile: () => void;
  className?: string;
  size?: "md" | "lg";
}

// After
interface SidebarRailProps {
  className?: string;
  size?: "md" | "lg";
}
```

### Modal Triggers

| Button       | Icon | Modal                   | Purpose                   |
| ------------ | ---- | ----------------------- | ------------------------- |
| Profile      | 👤   | ProfileModal            | User profile and settings |
| Integrations | 🧩   | IntegrationManagerModal | Third-party integrations  |
| Network      | 🕸️   | NetworkModal            | Network connections       |

## 🎨 Design System

### Visual Design

- **Consistent Styling**: Uses CSS variables for theming
- **Modern Aesthetics**: Rounded corners, subtle shadows, backdrop blur
- **Color Scheme**: Follows the app's color palette
- **Typography**: Consistent font sizes and weights

### Animation System

- **Enter Animation**: Scale from 0.96 to 1.0 with fade-in
- **Exit Animation**: Scale to 0.98 with fade-out
- **Duration**: 250ms for smooth transitions
- **Easing**: Tween easing for natural feel

### Responsive Behavior

- **Mobile**: Full-width modals with bottom sheets
- **Tablet**: Centered modals with appropriate sizing
- **Desktop**: Large modals with sidebar integration

## 💡 Usage Examples

### Basic Modal Implementation

```typescript
import { useState } from "react";
import BaseModal from "@/components/ui/BaseModal";

function MyComponent() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setModalOpen(true)}>Open Modal</button>

      <BaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="My Modal"
        size="md"
      >
        <p>Modal content goes here</p>
      </BaseModal>
    </>
  );
}
```

### Tabbed Modal Implementation

```typescript
import { useState } from "react";
import BaseModal from "@/components/ui/BaseModal";

function TabbedModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState("tab1");

  const TabButton = ({ id, label, icon }) => (
    <button
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
        activeTab === id
          ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
          : "text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)]"
      }`}
      onClick={() => setActiveTab(id)}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <BaseModal open={open} onClose={onClose} title="Tabbed Modal" size="lg">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <TabButton id="tab1" label="Tab 1" icon="📄" />
        <TabButton id="tab2" label="Tab 2" icon="⚙️" />
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === "tab1" && <div>Tab 1 content</div>}
        {activeTab === "tab2" && <div>Tab 2 content</div>}
      </div>
    </BaseModal>
  );
}
```

### Form Modal with Validation

```typescript
import { useState } from "react";
import BaseModal from "@/components/ui/BaseModal";

function FormModal({ open, onClose, onSubmit }) {
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    // Validation logic
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email) newErrors.email = "Email is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit(formData);
    onClose();
  };

  return (
    <BaseModal open={open} onClose={onClose} title="User Form" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border"
          />
          {errors.name && (
            <p className="text-red-400 text-xs mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border"
          />
          {errors.email && (
            <p className="text-red-400 text-xs mt-1">{errors.email}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white"
        >
          Submit
        </button>
      </div>
    </BaseModal>
  );
}
```

## 🛡️ Best Practices

### Modal Design

1. **Clear Purpose**: Each modal should have a single, clear purpose
2. **Consistent Sizing**: Use appropriate size for content complexity
3. **Progressive Disclosure**: Use tabs for complex modals
4. **Clear Actions**: Provide obvious primary and secondary actions

### User Experience

1. **Loading States**: Show loading indicators for async operations
2. **Error Handling**: Display errors clearly with recovery options
3. **Success Feedback**: Confirm successful actions
4. **Keyboard Support**: Ensure full keyboard navigation

### Performance

1. **Lazy Loading**: Load modal content only when needed
2. **State Management**: Use local state for modal-specific data
3. **Cleanup**: Properly clean up resources on modal close
4. **Optimization**: Minimize re-renders with proper memoization

### Accessibility

1. **ARIA Labels**: Provide proper ARIA attributes
2. **Focus Management**: Manage focus when modal opens/closes
3. **Keyboard Navigation**: Support Tab, Escape, and Enter keys
4. **Screen Readers**: Ensure content is properly announced

## 🔧 Configuration

### Environment Variables

No specific environment variables are required for the modal system.

### CSS Variables

The modal system uses the following CSS variables:

```css
--background-primary: Modal background color
--background-secondary: Secondary background for cards
--foreground-primary: Primary text color
--foreground-muted: Muted text color
--accent-primary: Primary accent color
--accent-secondary: Secondary accent color
--card-border: Border color for cards
--cta-text: Call-to-action text color
```

### TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## 🚀 Future Enhancements

### Planned Features

1. **Modal Stacking**: Support for multiple open modals
2. **Custom Animations**: Configurable animation presets
3. **Modal Templates**: Pre-built modal templates for common use cases
4. **Drag & Drop**: Draggable modals for better UX
5. **Modal History**: Browser-like modal navigation

### Integration Opportunities

1. **Form Libraries**: Integration with React Hook Form, Formik
2. **State Management**: Integration with Zustand, Redux
3. **Validation**: Integration with Zod, Yup
4. **Notifications**: Integration with toast notification systems

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: Perin Development Team

---

_This modal system provides a solid foundation for consistent, accessible, and user-friendly modal dialogs throughout the Perin application._
