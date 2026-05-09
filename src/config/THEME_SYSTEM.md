# Theme System Documentation

## Overview

The AIO Media Manager theme system provides a complete dark mode implementation with support for light, dark, and system preference themes. The system is built with React, TypeScript, and Tailwind CSS.

## Features

- ✅ **Three Theme Modes**: Light, Dark, and System (follows OS preference)
- ✅ **Persistent Storage**: Theme preference saved to localStorage
- ✅ **System Preference Detection**: Automatically detects and responds to OS theme changes
- ✅ **No Flash of Unstyled Content**: Theme applied before React renders
- ✅ **React Hook**: Easy integration with `useTheme()` hook
- ✅ **Multiple UI Variants**: Dropdown, button group, and icon toggle components
- ✅ **Fully Tested**: 96%+ test coverage on utilities, 100% on components
- ✅ **Accessible**: ARIA labels and keyboard navigation support
- ✅ **TypeScript**: Full type safety throughout

## Architecture

### Core Files

```
src/
├── config/
│   └── theme.ts                    # Theme configuration and constants
├── utils/
│   └── themeManager.ts             # Theme management logic
├── hooks/
│   └── useTheme.ts                 # React hook for theme access
├── components/ui/
│   └── ThemeToggle.tsx             # UI component for theme switching
└── main.tsx                        # Theme initialization
```

### Flow

1. **Initialization** (`main.tsx`): Theme is applied to DOM before React renders
2. **Management** (`themeManager.ts`): Singleton manager handles theme state and persistence
3. **React Integration** (`useTheme.ts`): Hook provides theme state and controls to components
4. **UI Components** (`ThemeToggle.tsx`): Pre-built components for theme switching

## Usage

### Basic Usage with Hook

```typescript
import { useTheme } from '@/hooks/useTheme';

function MyComponent() {
  const { themeMode, resolvedTheme, isDark, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current mode: {themeMode}</p>
      <p>Resolved theme: {resolvedTheme}</p>
      <p>Is dark: {isDark ? 'Yes' : 'No'}</p>
      
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('system')}>System</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}
```

### Using ThemeToggle Component

```typescript
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// Dropdown variant
<ThemeToggle variant="dropdown" />

// Button group variant
<ThemeToggle variant="buttons" showLabels={true} />

// Icon-only variant (cycles through themes)
<ThemeToggle variant="icon" />
```

### Styling with Tailwind

Use the `dark:` prefix for dark mode styles:

```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  <h1 className="text-2xl font-bold">Hello World</h1>
  <p className="text-gray-600 dark:text-gray-300">This adapts to the theme</p>
</div>
```

### Integration with Settings

The theme system is integrated with the SettingsManager:

```typescript
import { getSettingsManager } from '@/managers/SettingsManager';

const settingsManager = getSettingsManager();

// Get current theme
const settings = await settingsManager.getSettings();
console.log(settings.theme); // 'light' | 'dark' | 'system'

// Update theme
await settingsManager.updateSettings({ theme: 'dark' });
```

## API Reference

### useTheme Hook

```typescript
interface UseThemeReturn {
  themeMode: ThemeMode;              // Current theme mode setting
  resolvedTheme: ResolvedTheme;      // Actual theme (light or dark)
  systemTheme: ResolvedTheme;        // System preference
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;           // Toggle between light and dark
  isDark: boolean;                   // True if resolved theme is dark
}
```

### ThemeManager

```typescript
class ThemeManager {
  setTheme(mode: ThemeMode): void;
  getThemeMode(): ThemeMode;
  getResolvedTheme(): ResolvedTheme;
  getSystemTheme(): ResolvedTheme;
  subscribe(listener: ThemeChangeListener): () => void;
  destroy(): void;
}
```

### Theme Configuration

```typescript
// Theme modes
type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

// Constants
THEME_CONFIG = {
  STORAGE_KEY: 'aio-media-manager-theme',
  DARK_CLASS: 'dark',
  DEFAULT_THEME: 'system',
  MEDIA_QUERY: '(prefers-color-scheme: dark)',
}
```

## Testing

The theme system has comprehensive test coverage:

- **theme.ts**: 100% coverage
- **themeManager.ts**: 96.12% coverage
- **useTheme.ts**: 100% coverage
- **ThemeToggle.tsx**: 100% coverage

Run tests:

```bash
npm test -- src/config/theme.test.ts src/utils/themeManager.test.ts src/hooks/useTheme.test.tsx src/components/ui/ThemeToggle.test.tsx --run
```

## Browser Support

- Modern browsers with `matchMedia` support
- Fallback to light theme for older browsers
- Legacy `addListener`/`removeListener` support for older Safari

## Performance

- Theme applied before React renders (no FOUC)
- Minimal re-renders (only when theme changes)
- Efficient event listeners (cleaned up on unmount)
- LocalStorage caching for instant theme restoration

## Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast support through Tailwind colors

## Troubleshooting

### Theme not persisting

Check localStorage is available and not blocked:
```javascript
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (e) {
  console.error('localStorage not available');
}
```

### Flash of unstyled content

Ensure `initializeTheme()` is called in `main.tsx` before React renders.

### System theme not updating

Check browser supports `matchMedia`:
```javascript
if (window.matchMedia) {
  console.log('matchMedia supported');
}
```

## Future Enhancements

Potential improvements for future versions:

- [ ] Custom theme colors (beyond light/dark)
- [ ] Theme transitions/animations
- [ ] Per-component theme overrides
- [ ] Theme scheduling (auto-switch at certain times)
- [ ] High contrast mode
- [ ] Color blind friendly themes

## Related Files

- `tailwind.config.js` - Tailwind dark mode configuration
- `src/managers/SettingsManager.ts` - Settings persistence
- `src/pages/SettingsView.tsx` - Settings UI
- `src/components/settings/GeneralSettings.tsx` - Theme settings UI
