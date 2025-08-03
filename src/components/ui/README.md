# 🎨 Perin UI Components

A collection of beautiful, animated UI components built with React, Framer Motion, and Tailwind CSS. These components are designed to work seamlessly with the Perin design system and provide rich, interactive user experiences.

## 📦 Components

### 🚀 Dock

A macOS-style dock component with smooth magnification effects and spring animations.

#### Usage

```tsx
import Dock from "./ui/Dock";

const dockItems = [
  {
    icon: <HomeIcon />,
    label: "Home",
    onClick: () => console.log("Home clicked"),
  },
  {
    icon: <SettingsIcon />,
    label: "Settings",
    onClick: () => console.log("Settings clicked"),
  },
];

<Dock items={dockItems} />;
```

#### Props

| Property        | Type             | Default                                      | Description                                                                                               |
| --------------- | ---------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `items`         | `DockItemData[]` | `[]`                                         | Array of dock items. Each item should include an icon, label, onClick handler, and an optional className. |
| `className`     | `string`         | `""`                                         | Additional CSS classes for the dock panel.                                                                |
| `distance`      | `number`         | `200`                                        | Pixel distance used to calculate the magnification effect based on mouse proximity.                       |
| `panelHeight`   | `number`         | `68`                                         | Height (in pixels) of the dock panel.                                                                     |
| `baseItemSize`  | `number`         | `50`                                         | The base size (in pixels) for each dock item.                                                             |
| `dockHeight`    | `number`         | `256`                                        | Maximum height (in pixels) of the dock container.                                                         |
| `magnification` | `number`         | `70`                                         | The magnified size (in pixels) applied to a dock item when hovered.                                       |
| `spring`        | `SpringOptions`  | `{ mass: 0.1, stiffness: 150, damping: 12 }` | Configuration options for the spring animation.                                                           |

#### Example with Custom Configuration

```tsx
<Dock
  items={dockItems}
  distance={150}
  magnification={80}
  baseItemSize={60}
  spring={{ mass: 0.2, stiffness: 200, damping: 15 }}
  className="fixed bottom-4 left-1/2 transform -translate-x-1/2"
/>
```

---

### 🎚️ ElasticSlider

A smooth, elastic slider component with overflow effects and customizable step increments.

#### Usage

```tsx
import ElasticSlider from "./ui/ElasticSlider";

<ElasticSlider
  defaultValue={50}
  startingValue={0}
  maxValue={100}
  isStepped={true}
  stepSize={5}
/>;
```

#### Props

| Property        | Type          | Default  | Description                                                                                           |
| --------------- | ------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `defaultValue`  | `number`      | `—`      | The initial value of the slider. It can be less than startingValue or greater than maxValue.          |
| `startingValue` | `number`      | `—`      | The starting point for the slider's range, e.g., startingValue=100 allows the slider to start at 100. |
| `maxValue`      | `number`      | `—`      | The maximum value the slider can reach.                                                               |
| `className`     | `string`      | `—`      | Allows passing custom class names to style the component.                                             |
| `isStepped`     | `boolean`     | `—`      | Enables or disables stepped increments on the slider.                                                 |
| `stepSize`      | `number`      | `—`      | The size of the increments for the slider when isStepped is enabled.                                  |
| `leftIcon`      | `JSX.Element` | `<>-</>` | Custom JSX or HTML code to display on the left side of the slider.                                    |
| `rightIcon`     | `JSX.Element` | `<>+</>` | Custom JSX or HTML code to display on the right side of the slider.                                   |

#### Example with Custom Icons

```tsx
<ElasticSlider
  defaultValue={25}
  startingValue={0}
  maxValue={50}
  isStepped={true}
  stepSize={5}
  leftIcon={<VolumeDownIcon className="w-4 h-4" />}
  rightIcon={<VolumeUpIcon className="w-4 h-4" />}
  className="w-64"
/>
```

---

### 👤 ProfileCard

A beautiful profile card component with 3D tilt effects, gradient overlays, and smooth animations.

#### Usage

```tsx
import ProfileCard from "./ui/ProfileCard";

<ProfileCard
  avatarUrl="/path/to/avatar.jpg"
  name="John Doe"
  title="Software Engineer"
  handle="johndoe"
  status="Online"
  onContactClick={() => console.log("Contact clicked")}
/>;
```

#### Props

| Property                | Type       | Default                          | Description                                                     |
| ----------------------- | ---------- | -------------------------------- | --------------------------------------------------------------- |
| `avatarUrl`             | `string`   | `"<Placeholder for avatar URL>"` | URL for the main avatar image displayed on the card             |
| `iconUrl`               | `string`   | `"<Placeholder for icon URL>"`   | Optional URL for an icon pattern overlay on the card background |
| `grainUrl`              | `string`   | `"<Placeholder for grain URL>"`  | Optional URL for a grain texture overlay effect                 |
| `behindGradient`        | `string`   | `undefined`                      | Custom CSS gradient string for the background gradient effect   |
| `innerGradient`         | `string`   | `undefined`                      | Custom CSS gradient string for the inner card gradient          |
| `showBehindGradient`    | `boolean`  | `true`                           | Whether to display the background gradient effect               |
| `className`             | `string`   | `""`                             | Additional CSS classes to apply to the card wrapper             |
| `enableTilt`            | `boolean`  | `true`                           | Enable or disable the 3D tilt effect on mouse hover             |
| `enableMobileTilt`      | `boolean`  | `false`                          | Enable or disable the 3D tilt effect on mobile devices          |
| `mobileTiltSensitivity` | `number`   | `5`                              | Sensitivity of the 3D tilt effect on mobile devices             |
| `miniAvatarUrl`         | `string`   | `undefined`                      | Optional URL for a smaller avatar in the user info section      |
| `name`                  | `string`   | `"Javi A. Torres"`               | User's display name                                             |
| `title`                 | `string`   | `"Software Engineer"`            | User's job title or role                                        |
| `handle`                | `string`   | `"javicodes"`                    | User's handle or username (displayed with @ prefix)             |
| `status`                | `string`   | `"Online"`                       | User's current status                                           |
| `contactText`           | `string`   | `"Contact"`                      | Text displayed on the contact button                            |
| `showUserInfo`          | `boolean`  | `true`                           | Whether to display the user information section                 |
| `onContactClick`        | `function` | `undefined`                      | Callback function called when the contact button is clicked     |

#### Example with Custom Gradients

```tsx
<ProfileCard
  avatarUrl="/avatar.jpg"
  name="Alice Johnson"
  title="Product Designer"
  handle="alicej"
  status="Away"
  behindGradient="radial-gradient(circle at 50% 50%, #ff6b6b, #4ecdc4)"
  innerGradient="linear-gradient(145deg, #667eea 0%, #764ba2 100%)"
  enableTilt={true}
  enableMobileTilt={true}
  mobileTiltSensitivity={3}
  onContactClick={() => window.open("mailto:alice@example.com")}
  className="w-80 h-96"
/>
```

---

## 🎨 Design System Integration

All components are designed to work with the Perin design system and use CSS custom properties for consistent theming:

### Color Variables

- `--primary`: Primary brand color
- `--accent`: Accent color for highlights
- `--background`: Main background color
- `--foreground`: Main text color
- `--card-background`: Card background color
- `--card-border`: Card border color

### Usage with Design System

```tsx
// Components automatically use design system colors
<Dock
  items={items}
  className="bg-[var(--card-background)] border-[var(--card-border)]"
/>

<ElasticSlider
  className="text-[var(--foreground)]"
/>

<ProfileCard
  className="bg-[var(--card-background)]"
  behindGradient="radial-gradient(circle, var(--primary), var(--accent))"
/>
```

## 🚀 Getting Started

1. **Install Dependencies**

   ```bash
   npm install framer-motion
   ```

2. **Import Components**

   ```tsx
   import Dock from "./ui/Dock";
   import ElasticSlider from "./ui/ElasticSlider";
   import ProfileCard from "./ui/ProfileCard";
   ```

3. **Use in Your App**

   ```tsx
   function App() {
     return (
       <div className="min-h-screen bg-[var(--background)]">
         <ProfileCard
           avatarUrl="/avatar.jpg"
           name="Your Name"
           title="Your Title"
         />

         <ElasticSlider defaultValue={50} maxValue={100} />

         <Dock items={dockItems} />
       </div>
     );
   }
   ```

## 🎯 Best Practices

### Performance

- Use `React.memo()` for components that receive stable props
- Avoid creating new objects/arrays in render functions
- Use `useCallback` for event handlers passed as props

### Accessibility

- All components include proper ARIA attributes
- Keyboard navigation is supported
- Screen reader friendly

### Responsive Design

- Components are mobile-responsive by default
- Use the `className` prop for custom responsive behavior
- Test on various screen sizes

## 🔧 Customization

### Styling

```tsx
// Custom CSS classes
<Dock className="custom-dock-styles" />

// Inline styles
<ProfileCard style={{ maxWidth: '400px' }} />

// CSS variables
<ElasticSlider className="[--slider-color:theme(colors.blue.500)]" />
```

### Animation

```tsx
// Custom spring configurations
<Dock spring={{ mass: 0.5, stiffness: 300, damping: 20 }} />

// Disable animations
<ProfileCard enableTilt={false} />
```

## 📱 Mobile Support

- **Dock**: Responsive with touch support
- **ElasticSlider**: Touch-friendly with haptic feedback
- **ProfileCard**: Optional mobile tilt effects

## 🐛 Troubleshooting

### Common Issues

1. **Animations not working**

   - Ensure Framer Motion is installed
   - Check browser support for CSS transforms

2. **Styling conflicts**

   - Use `!important` sparingly
   - Check CSS specificity
   - Verify Tailwind CSS is properly configured

3. **Performance issues**
   - Reduce animation complexity on mobile
   - Use `will-change` CSS property for heavy animations
   - Consider disabling animations on low-end devices

## 📄 License

These components are part of the Perin design system and follow the same licensing terms.

---

### 🎨 MagicBento

A stunning bento grid component with multiple interactive effects including particle animations, spotlight effects, border glow, and magnetic attraction.

#### Usage

```tsx
import MagicBento from "./ui/MagicBento";

<MagicBento
  enableStars={true}
  enableSpotlight={true}
  enableBorderGlow={true}
  enableTilt={true}
  glowColor="132, 0, 255"
/>;
```

#### Props

| Property            | Type      | Default         | Description                                              |
| ------------------- | --------- | --------------- | -------------------------------------------------------- |
| `textAutoHide`      | `boolean` | `true`          | Whether text content should auto-hide on hover           |
| `enableStars`       | `boolean` | `true`          | Enable particle star animation effect                    |
| `enableSpotlight`   | `boolean` | `true`          | Enable spotlight cursor following effect                 |
| `enableBorderGlow`  | `boolean` | `true`          | Enable border glow effect that follows cursor            |
| `disableAnimations` | `boolean` | `false`         | Disable all animations (automatically enabled on mobile) |
| `spotlightRadius`   | `number`  | `300`           | Radius of the spotlight effect in pixels                 |
| `particleCount`     | `number`  | `12`            | Number of particles in the star animation                |
| `enableTilt`        | `boolean` | `false`         | Enable 3D tilt effect on card hover                      |
| `glowColor`         | `string`  | `"132, 0, 255"` | RGB color values for glow effects (without rgba wrapper) |
| `clickEffect`       | `boolean` | `true`          | Enable ripple effect on card click                       |
| `enableMagnetism`   | `boolean` | `true`          | Enable subtle card attraction to cursor                  |

#### Example with Custom Configuration

```tsx
<MagicBento
  textAutoHide={false}
  enableStars={true}
  enableSpotlight={true}
  enableBorderGlow={true}
  enableTilt={true}
  spotlightRadius={400}
  particleCount={20}
  glowColor="255, 100, 150"
  clickEffect={true}
  enableMagnetism={true}
  className="w-full max-w-6xl"
/>
```

#### Custom Card Data

```tsx
// You can customize the card data by modifying the cardData array in the component
const customCardData = [
  {
    color: "#060010",
    title: "Custom Feature",
    description: "Your custom description",
    label: "Custom",
  },
  // ... more cards
];
```

---

### 🎭 DarkVeil

A dark overlay component with animated effects for modals, loading states, and transitions.

#### Usage

```tsx
import DarkVeil from "./ui/DarkVeil";

<DarkVeil isVisible={true} onClose={() => setModalOpen(false)}>
  <div>Your modal content here</div>
</DarkVeil>;
```

---

### 🔢 Stepper

A multi-step progress component with smooth animations, customizable styling, and flexible navigation. Features step indicators, smooth transitions, and callback support.

#### Usage

```tsx
import Stepper, { Step } from "./ui/Stepper";

<Stepper
  initialStep={1}
  onStepChange={(step) => console.log(`Step changed to: ${step}`)}
  onFinalStepCompleted={() => console.log("Stepper completed!")}
>
  <Step>
    <div className="text-center">
      <h3 className="text-xl font-bold mb-4">Welcome</h3>
      <p>This is the first step of your journey.</p>
    </div>
  </Step>

  <Step>
    <div className="text-center">
      <h3 className="text-xl font-bold mb-4">Configuration</h3>
      <p>Configure your preferences here.</p>
    </div>
  </Step>

  <Step>
    <div className="text-center">
      <h3 className="text-xl font-bold mb-4">Complete</h3>
      <p>You're all set! Click continue to finish.</p>
    </div>
  </Step>
</Stepper>;
```

#### Props

| Property                       | Type                     | Default      | Description                                                              |
| ------------------------------ | ------------------------ | ------------ | ------------------------------------------------------------------------ |
| `children`                     | `ReactNode`              | `—`          | The Step components (or any custom content) rendered inside the stepper. |
| `initialStep`                  | `number`                 | `1`          | The first step to display when the stepper is initialized.               |
| `onStepChange`                 | `(step: number) => void` | `() => {}`   | Callback fired whenever the step changes.                                |
| `onFinalStepCompleted`         | `() => void`             | `() => {}`   | Callback fired when the stepper completes its final step.                |
| `stepCircleContainerClassName` | `string`                 | `—`          | Custom class name for the container holding the step indicators.         |
| `stepContainerClassName`       | `string`                 | `—`          | Custom class name for the row holding the step circles/connectors.       |
| `contentClassName`             | `string`                 | `—`          | Custom class name for the step's main content container.                 |
| `footerClassName`              | `string`                 | `—`          | Custom class name for the footer area containing navigation buttons.     |
| `backButtonProps`              | `object`                 | `{}`         | Extra props passed to the Back button.                                   |
| `nextButtonProps`              | `object`                 | `{}`         | Extra props passed to the Next/Complete button.                          |
| `backButtonText`               | `string`                 | `"Back"`     | Text for the Back button.                                                |
| `nextButtonText`               | `string`                 | `"Continue"` | Text for the Next button when not on the last step.                      |
| `disableStepIndicators`        | `boolean`                | `false`      | Disables click interaction on step indicators.                           |
| `renderStepIndicator`          | `{}`                     | `undefined`  | Renders a custom step indicator.                                         |

#### Example with Custom Styling

```tsx
<Stepper
  initialStep={1}
  stepCircleContainerClassName="bg-[var(--card-background)] border-[var(--card-border)]"
  contentClassName="p-8 text-[var(--foreground)]"
  footerClassName="border-t border-[var(--card-border)] p-4"
  backButtonText="Previous"
  nextButtonText="Next Step"
  onStepChange={(step) => setCurrentStep(step)}
  onFinalStepCompleted={() => handleCompletion()}
>
  <Step>
    <div className="space-y-4">
      <h3 className="text-2xl font-bold">Personal Information</h3>
      <input
        type="text"
        placeholder="Enter your name"
        className="w-full p-3 border border-[var(--card-border)] rounded-lg"
      />
    </div>
  </Step>

  <Step>
    <div className="space-y-4">
      <h3 className="text-2xl font-bold">Preferences</h3>
      <select className="w-full p-3 border border-[var(--card-border)] rounded-lg">
        <option>Select your preference</option>
        <option>Option 1</option>
        <option>Option 2</option>
      </select>
    </div>
  </Step>

  <Step>
    <div className="space-y-4">
      <h3 className="text-2xl font-bold">Review</h3>
      <p>Please review your information before proceeding.</p>
    </div>
  </Step>
</Stepper>
```

#### Example with Custom Button Props

```tsx
<Stepper
  backButtonProps={{
    className: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg",
    disabled: currentStep === 1,
  }}
  nextButtonProps={{
    className:
      "bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-6 py-2 rounded-lg",
    disabled: !isStepValid,
  }}
  disableStepIndicators={false}
>
  {/* Step components */}
</Stepper>
```

#### Step Component

The `Step` component is used to wrap individual step content:

```tsx
import { Step } from "./ui/Stepper";

<Step>
  <div>Your step content here</div>
</Step>;
```

---

### 🃏 TiltedCard

A card component with 3D tilt effects and smooth animations.

#### Usage

```tsx
import TiltedCard from "./ui/TiltedCard";

<TiltedCard tiltMaxAngleX={10} tiltMaxAngleY={10} className="w-80 h-96">
  <div>Your card content</div>
</TiltedCard>;
```

---

### 🎠 Carousel

A smooth carousel component with touch support, autoplay, and customizable navigation. Features drag gestures, smooth animations, and responsive design.

#### Usage

```tsx
import Carousel from "./ui/Carousel";
import { FiHome, FiSettings, FiUser } from "react-icons/fi";

const carouselItems = [
  {
    id: 1,
    title: "Home",
    description: "Navigate to home page",
    icon: <FiHome className="h-4 w-4 text-white" />,
  },
  {
    id: 2,
    title: "Settings",
    description: "Manage your preferences",
    icon: <FiSettings className="h-4 w-4 text-white" />,
  },
  {
    id: 3,
    title: "Profile",
    description: "View your profile",
    icon: <FiUser className="h-4 w-4 text-white" />,
  },
];

<Carousel
  items={carouselItems}
  autoplay={true}
  autoplayDelay={3000}
  pauseOnHover={true}
  loop={true}
/>;
```

#### Props

| Property        | Type             | Default         | Description                                                                                     |
| --------------- | ---------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `items`         | `CarouselItem[]` | `DEFAULT_ITEMS` | An array of carousel items. Each item must include title, description, id, and icon.            |
| `baseWidth`     | `number`         | `300`           | Total width (in px) of the carousel container. Effective item width is baseWidth minus padding. |
| `autoplay`      | `boolean`        | `false`         | Enables automatic scrolling to the next item at a fixed interval.                               |
| `autoplayDelay` | `number`         | `3000`          | Delay in milliseconds between automatic scrolls when autoplay is enabled.                       |
| `pauseOnHover`  | `boolean`        | `false`         | Pauses the autoplay functionality when the carousel is hovered.                                 |
| `loop`          | `boolean`        | `false`         | When true, the carousel loops seamlessly from the last item back to the first.                  |
| `round`         | `boolean`        | `true`          | When true, the carousel is rendered with a 1:1 aspect ratio and circular container/items.       |

#### Example with Custom Configuration

```tsx
<Carousel
  items={customItems}
  baseWidth={400}
  autoplay={true}
  autoplayDelay={5000}
  pauseOnHover={true}
  loop={true}
  round={false}
  className="w-full max-w-2xl"
/>
```

#### CarouselItem Interface

```tsx
interface CarouselItem {
  title: string; // Item title
  description: string; // Item description
  id: number; // Unique identifier
  icon: React.ReactNode; // Icon component
}
```

---

### 💬 FloatingInput

A floating input component that stays fixed at the bottom of the screen with a shadow effect. Perfect for chat interfaces and immersive experiences.

#### Usage

```tsx
import { FloatingInput } from "./ui/FloatingInput";

<FloatingInput
  onSendMessage={(message) => console.log(message)}
  isLoading={false}
  placeholder="Type your message..."
  disabled={false}
/>;
```

#### Props

| Property        | Type                        | Default                  | Description                                                       |
| --------------- | --------------------------- | ------------------------ | ----------------------------------------------------------------- |
| `onSendMessage` | `(message: string) => void` | `—`                      | Callback function called when a message is sent                   |
| `isLoading`     | `boolean`                   | `false`                  | Whether the input is in a loading state (shows spinner in button) |
| `placeholder`   | `string`                    | `"Type your message..."` | Placeholder text for the input field                              |
| `disabled`      | `boolean`                   | `false`                  | Whether the input is disabled                                     |

#### Features

- **Fixed positioning**: Stays at the bottom of the screen during scrolling
- **Floating effect**: Enhanced shadow and backdrop blur for floating appearance
- **Smooth animations**: Framer Motion animations for focus, hover, and tap states
- **Keyboard support**: Enter to send, Shift+Enter for new line
- **Loading states**: Shows spinner when processing
- **Responsive design**: Adapts to different screen sizes

#### Example with Custom Configuration

```tsx
<FloatingInput
  onSendMessage={handleSendMessage}
  isLoading={isProcessing}
  placeholder="Ask Perin anything..."
  disabled={!isAuthenticated}
/>
```

---

### 🧠 PerinLoading

An immersive, borderless loading component that shows Perin in various thinking states with pure visual animations. Creates a sense of Perin being alive and actively processing without any text distractions.

#### Usage

```tsx
import { PerinLoading } from "./ui/PerinLoading";

<PerinLoading status="thinking" showAvatar={true} className="max-w-md" />;
```

#### Props

| Property     | Type                                                              | Default      | Description                                      |
| ------------ | ----------------------------------------------------------------- | ------------ | ------------------------------------------------ |
| `status`     | `"idle" \| "thinking" \| "typing" \| "listening" \| "processing"` | `"thinking"` | The current status of Perin's processing state   |
| `showAvatar` | `boolean`                                                         | `true`       | Whether to show the Perin avatar with animations |
| `className`  | `string`                                                          | `""`         | Additional CSS classes for styling               |

#### Features

- **Borderless design**: No borders or containers - feels like part of the screen
- **Centered layout**: Perfectly centered for immersive experience
- **Pure visual communication**: No text, only animations and visual cues
- **Enhanced avatar animations**: Perin gently scales and rotates while thinking
- **Thinking dots**: Larger, more prominent dots that pulse around the avatar
- **Pulsing rings**: Concentric rings that expand and contract
- **Floating particles**: Small particles that float up and down
- **Emotional connection**: Creates feeling of Perin being alive and thinking

#### Visual Elements

- **Avatar breathing**: Gentle scale and rotation animation
- **Thinking dots**: 3 dots that pulse in sequence around avatar
- **Pulsing rings**: 2 concentric rings that expand and contract
- **Floating particles**: 4 particles that float up and down in sequence
- **Color gradients**: Dynamic gradients based on status

#### Status Types

- **thinking**: Purple to accent gradient
- **typing**: Green to purple gradient
- **listening**: Accent to purple gradient
- **processing**: Accent to purple gradient
- **idle**: Default purple to accent gradient

#### Example Usage

```tsx
// Centered loading state
<div className="flex justify-center w-full">
  <PerinLoading status="thinking" showAvatar={true} />
</div>

// Different states
<PerinLoading status="typing" />
<PerinLoading status="listening" />
```

---

### 💡 SpotlightCard

A card component with spotlight effects that follow the cursor. Features smooth radial gradient animations and customizable spotlight colors.

#### Usage

```tsx
import SpotlightCard from "./ui/SpotlightCard";

<SpotlightCard spotlightColor="rgba(255, 255, 255, 0.25)" className="w-80 h-96">
  <div className="text-white">
    <h3 className="text-xl font-bold mb-4">Spotlight Effect</h3>
    <p>This card has a beautiful spotlight effect that follows your cursor!</p>
  </div>
</SpotlightCard>;
```

#### Props

| Property         | Type     | Default                       | Description                                                              |
| ---------------- | -------- | ----------------------------- | ------------------------------------------------------------------------ |
| `spotlightColor` | `string` | `"rgba(255, 255, 255, 0.25)"` | Controls the color of the radial gradient used for the spotlight effect. |
| `className`      | `string` | `—`                           | Allows adding custom classes to the component.                           |

#### Example with Custom Spotlight Color

```tsx
<SpotlightCard
  spotlightColor="rgba(75, 93, 255, 0.3)"
  className="w-96 h-64 bg-[var(--card-background)] border-[var(--card-border)]"
>
  <div className="text-[var(--foreground)]">
    <h3 className="text-2xl font-bold mb-2">Custom Spotlight</h3>
    <p>This spotlight uses the primary brand color!</p>
  </div>
</SpotlightCard>
```

#### Example with Multiple Spotlight Cards

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <SpotlightCard spotlightColor="rgba(255, 154, 139, 0.4)" className="h-48">
    <div className="text-white">
      <h4 className="text-lg font-semibold">Accent Spotlight</h4>
      <p>Using accent color for spotlight</p>
    </div>
  </SpotlightCard>

  <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.3)" className="h-48">
    <div className="text-white">
      <h4 className="text-lg font-semibold">Success Spotlight</h4>
      <p>Using success color for spotlight</p>
    </div>
  </SpotlightCard>
</div>
```

---

## 🎨 Advanced Usage Examples

### Combining Multiple Components

```tsx
function Dashboard() {
  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      {/* Profile Section */}
      <div className="mb-8">
        <ProfileCard
          avatarUrl="/avatar.jpg"
          name="John Doe"
          title="Product Manager"
          handle="johndoe"
        />
      </div>

      {/* Magic Bento Grid */}
      <div className="mb-8">
        <MagicBento
          enableStars={true}
          enableSpotlight={true}
          glowColor="75, 93, 255"
        />
      </div>

      {/* Controls Section */}
      <div className="flex gap-4 mb-8">
        <ElasticSlider
          defaultValue={50}
          maxValue={100}
          isStepped={true}
          stepSize={10}
        />
      </div>

      {/* Dock Navigation */}
      <Dock
        items={[
          { icon: <HomeIcon />, label: "Home", onClick: () => {} },
          { icon: <SettingsIcon />, label: "Settings", onClick: () => {} },
        ]}
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2"
      />
    </div>
  );
}
```

### Custom Theme Integration

```tsx
// Using with custom color schemes
<MagicBento
  glowColor="255, 154, 139" // Using accent color
  className="[--bento-bg:var(--card-background)]"
/>

<ProfileCard
  behindGradient="radial-gradient(circle, var(--primary), var(--accent))"
  innerGradient="linear-gradient(145deg, var(--card-background), var(--background))"
/>
```

---

_All components are designed to work together seamlessly with the Perin design system!_
