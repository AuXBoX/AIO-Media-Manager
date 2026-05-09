# Responsive Design Implementation

This document describes the responsive design system implemented for the AIO Media Manager.

## Overview

The responsive design system provides:
- **Breakpoint detection** - Hooks to detect current screen size and device type
- **Mobile navigation** - Hamburger menu with slide-in sidebar
- **Touch gestures** - Swipe and pinch-to-zoom support
- **Progressive loading** - Optimized image loading for mobile devices
- **Responsive components** - Layout components that adapt to screen size

## Breakpoints

The application uses the following breakpoints (mobile-first):

```typescript
sm: 640px   // Small devices (landscape phones)
md: 768px   // Medium devices (tablets)
lg: 1024px  // Large devices (desktops)
xl: 1280px  // Extra large devices (large desktops)
2xl: 1536px // 2X large devices (larger desktops)
```

## Usage Examples

### 1. Detecting Breakpoints

```typescript
import { useBreakpoint } from '@/hooks/useBreakpoint';

function MyComponent() {
  const { isMobile, isTablet, isDesktop, currentBreakpoint } = useBreakpoint();

  return (
    <div>
      {isMobile && <MobileView />}
      {isTablet && <TabletView />}
      {isDesktop && <DesktopView />}
    </div>
  );
}
```

### 2. Using Responsive Layout

```typescript
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';

function App() {
  return (
    <ResponsiveLayout
      sidebar={<Sidebar />}
      header={<Header />}
      footer={<Footer />}
    >
      <MainContent />
    </ResponsiveLayout>
  );
}
```

### 3. Mobile Navigation

```typescript
import { MobileNav, useMobileNav } from '@/components/ui/MobileNav';

function MyApp() {
  const { isOpen, toggle } = useMobileNav();

  return (
    <MobileNav isOpen={isOpen} onToggle={toggle}>
      <nav>
        <a href="/">Home</a>
        <a href="/library">Library</a>
      </nav>
    </MobileNav>
  );
}
```

### 4. Touch Gestures

```typescript
import { useTouchGestures } from '@/hooks/useTouchGestures';

function SwipeableCard() {
  const ref = useTouchGestures({
    onSwipeLeft: () => console.log('Swiped left'),
    onSwipeRight: () => console.log('Swiped right'),
    onPinchZoom: (scale) => console.log('Pinch zoom:', scale),
  });

  return <div ref={ref}>Swipeable content</div>;
}
```

### 5. Progressive Image Loading

```typescript
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';

function MediaCard({ item }) {
  return (
    <ProgressiveImage
      src={item.thumb}
      lowQualitySrc={item.thumbLowQuality}
      alt={item.title}
      className="w-full h-64"
    />
  );
}
```

### 6. Responsive Images with srcSet

```typescript
import { ResponsiveImage } from '@/components/ui/ProgressiveImage';

function Poster({ urls }) {
  return (
    <ResponsiveImage
      src={urls.lg}
      srcSet={{
        sm: urls.sm,
        md: urls.md,
        lg: urls.lg,
        xl: urls.xl,
      }}
      alt="Movie poster"
    />
  );
}
```

### 7. Responsive Container

```typescript
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';

function Page() {
  return (
    <ResponsiveContainer maxWidth="xl" padding>
      <h1>Page Title</h1>
      <p>Content with responsive padding</p>
    </ResponsiveContainer>
  );
}
```

### 8. Responsive Grid

```typescript
import { ResponsiveGrid } from '@/components/ui/ResponsiveContainer';

function MediaGrid({ items }) {
  return (
    <ResponsiveGrid minColumnWidth={200} maxColumns={6} gap="md">
      {items.map(item => (
        <MediaCard key={item.id} item={item} />
      ))}
    </ResponsiveGrid>
  );
}
```

## Tailwind CSS Utilities

The responsive design system integrates with Tailwind CSS. Use responsive modifiers:

```tsx
<div className="
  text-sm md:text-base lg:text-lg
  p-4 md:p-6 lg:p-8
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
">
  Content
</div>
```

## Touch-Friendly Components

All interactive components are touch-friendly:
- Minimum touch target size: 44x44px
- Adequate spacing between interactive elements
- Visual feedback on touch
- Swipe gestures for navigation

## Performance Optimizations

### Mobile
- Progressive image loading with low-quality placeholders
- Lazy loading for off-screen images
- Reduced image sizes (400-600px width)
- Simplified layouts

### Tablet
- Medium-quality images (600-800px width)
- Optimized grid layouts
- Touch-friendly controls

### Desktop
- Full-quality images
- Advanced layouts
- Hover interactions

## Testing

Run responsive design tests:

```bash
npm test -- src/hooks/useBreakpoint.test.ts
npm test -- src/hooks/useTouchGestures.test.ts
npm test -- src/components/ui/MobileNav.test.tsx
npm test -- src/components/layout/ResponsiveLayout.test.tsx
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari 12+
- Android Chrome 80+
- Touch and mouse input
- Responsive viewport meta tag required

## Accessibility

All responsive components maintain accessibility:
- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management
- Color contrast (WCAG AA)

## Best Practices

1. **Mobile-first approach** - Design for mobile, enhance for desktop
2. **Touch targets** - Minimum 44x44px for interactive elements
3. **Progressive enhancement** - Core functionality works on all devices
4. **Performance** - Optimize images and reduce bundle size for mobile
5. **Testing** - Test on real devices, not just browser DevTools
