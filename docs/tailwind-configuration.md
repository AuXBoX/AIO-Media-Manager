# Tailwind CSS Configuration

This document describes the Tailwind CSS configuration for the AIO Media Manager application.

## Overview

Tailwind CSS is configured with custom theme extensions, dark mode support, and optimized content paths for the React and Electron application.

## Configuration Files

### `tailwind.config.js`

The main Tailwind configuration file with:
- Content paths for all React components and Electron files
- Dark mode enabled with class strategy
- Custom theme extensions
- Custom animations and keyframes

### `postcss.config.js`

PostCSS configuration with:
- Tailwind CSS plugin
- Autoprefixer for vendor prefixes

## Content Paths

The following paths are scanned for Tailwind classes:

```javascript
[
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
  "./electron/**/*.{js,ts}",
]
```

This ensures all React components, TypeScript files, and Electron files are processed.

## Dark Mode

Dark mode is enabled using the `class` strategy:

```javascript
darkMode: 'class'
```

To enable dark mode, add the `dark` class to the root HTML element:

```html
<html class="dark">
```

All dark mode variants use the `dark:` prefix:

```jsx
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-gray-100">Content</p>
</div>
```

## Custom Theme

### Colors

#### Primary Colors (Plex-inspired Orange/Amber)

Used for primary actions, highlights, and brand elements:

- `primary-50` to `primary-950` - Full range from lightest to darkest
- Default: `primary-500` (#f97316)
- Hover: `primary-600` (#ea580c)

Example usage:
```jsx
<button className="bg-primary-500 hover:bg-primary-600 text-white">
  Primary Action
</button>
```

#### Secondary Colors (Slate)

Used for neutral UI elements, backgrounds, and text:

- `secondary-50` to `secondary-950` - Full range from lightest to darkest
- Light backgrounds: `secondary-50`, `secondary-100`
- Dark backgrounds: `secondary-800`, `secondary-900`
- Text: `secondary-600`, `secondary-700`

Example usage:
```jsx
<div className="bg-secondary-50 dark:bg-secondary-900">
  <p className="text-secondary-700 dark:text-secondary-300">Text</p>
</div>
```

#### Semantic Colors

**Success** (Green) - For success messages and positive actions:
```jsx
<div className="bg-success-100 text-success-700 border border-success-300">
  Success message
</div>
```

**Warning** (Amber) - For warnings and caution messages:
```jsx
<div className="bg-warning-100 text-warning-700 border border-warning-300">
  Warning message
</div>
```

**Error** (Red) - For errors and destructive actions:
```jsx
<div className="bg-error-100 text-error-700 border border-error-300">
  Error message
</div>
```

**Info** (Blue) - For informational messages:
```jsx
<div className="bg-info-100 text-info-700 border border-info-300">
  Info message
</div>
```

### Typography

#### Font Families

**Sans-serif** (default):
```jsx
<p className="font-sans">Regular text</p>
```

**Monospace** (for code):
```jsx
<code className="font-mono">Code text</code>
```

### Spacing

Extended spacing values:
- `spacing-18` (4.5rem / 72px)
- `spacing-88` (22rem / 352px)
- `spacing-100` (25rem / 400px)
- `spacing-112` (28rem / 448px)
- `spacing-128` (32rem / 512px)

Example usage:
```jsx
<div className="p-18 mb-88">Content</div>
```

### Border Radius

Extended border radius:
- `rounded-4xl` (2rem / 32px)

Example usage:
```jsx
<div className="rounded-4xl">Highly rounded corners</div>
```

### Box Shadows

Custom shadow utilities:

**Soft Shadow** - Subtle elevation:
```jsx
<div className="shadow-soft">Subtle shadow</div>
```

**Medium Shadow** - Standard elevation:
```jsx
<div className="shadow-medium">Medium shadow</div>
```

**Hard Shadow** - Strong elevation:
```jsx
<div className="shadow-hard">Strong shadow</div>
```

**Inner Soft Shadow** - Inset shadow:
```jsx
<div className="shadow-inner-soft">Inset shadow</div>
```

### Animations

Custom animations with corresponding keyframes:

**Fade Animations**:
```jsx
<div className="animate-fade-in">Fades in</div>
<div className="animate-fade-out">Fades out</div>
```

**Slide Animations**:
```jsx
<div className="animate-slide-in-right">Slides from right</div>
<div className="animate-slide-in-left">Slides from left</div>
<div className="animate-slide-in-up">Slides from bottom</div>
<div className="animate-slide-in-down">Slides from top</div>
```

**Scale Animation**:
```jsx
<div className="animate-scale-in">Scales in</div>
```

**Slow Animations**:
```jsx
<div className="animate-spin-slow">Slow spin</div>
<div className="animate-pulse-slow">Slow pulse</div>
```

### Transitions

Extended transition duration:
- `duration-400` (400ms)

Example usage:
```jsx
<button className="transition-all duration-400 hover:scale-105">
  Smooth transition
</button>
```

### Z-Index

Extended z-index values:
- `z-60` to `z-100` (60, 70, 80, 90, 100)

Example usage:
```jsx
<div className="z-90">High z-index</div>
```

### Max Width

Extended max-width values:
- `max-w-8xl` (88rem / 1408px)
- `max-w-9xl` (96rem / 1536px)

Example usage:
```jsx
<div className="max-w-8xl mx-auto">Wide container</div>
```

### Min Height

Extended min-height values:
- `min-h-12` (3rem / 48px)
- `min-h-16` (4rem / 64px)
- `min-h-20` (5rem / 80px)

Example usage:
```jsx
<div className="min-h-16">Minimum height element</div>
```

## Common Patterns

### Card Component
```jsx
<div className="bg-white dark:bg-secondary-800 rounded-lg shadow-medium p-6">
  <h3 className="text-xl font-bold text-secondary-900 dark:text-secondary-50 mb-2">
    Card Title
  </h3>
  <p className="text-secondary-600 dark:text-secondary-300">
    Card content
  </p>
</div>
```

### Button Variants
```jsx
// Primary button
<button className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg shadow-medium transition-all duration-200 hover:shadow-hard">
  Primary
</button>

// Secondary button
<button className="px-6 py-3 bg-secondary-200 dark:bg-secondary-700 hover:bg-secondary-300 dark:hover:bg-secondary-600 text-secondary-900 dark:text-secondary-50 rounded-lg shadow-soft transition-all duration-200">
  Secondary
</button>

// Danger button
<button className="px-6 py-3 bg-error-500 hover:bg-error-600 text-white rounded-lg shadow-medium transition-all duration-200">
  Delete
</button>
```

### Input Field
```jsx
<input
  type="text"
  className="w-full px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-secondary-50"
  placeholder="Enter text..."
/>
```

### Modal Overlay
```jsx
<div className="fixed inset-0 z-90 bg-black/50 backdrop-blur-sm animate-fade-in">
  <div className="flex items-center justify-center min-h-screen p-4">
    <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-hard max-w-2xl w-full animate-scale-in">
      {/* Modal content */}
    </div>
  </div>
</div>
```

### Loading Spinner
```jsx
<div className="flex items-center justify-center">
  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
</div>
```

## Integration with Vite

Tailwind CSS is integrated with Vite through PostCSS. The configuration is automatically loaded when Vite processes CSS files.

The main CSS file (`src/index.css`) includes the Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Performance Considerations

1. **Content Paths**: Only files matching the content paths are scanned for classes, ensuring fast builds
2. **Purging**: Unused CSS is automatically removed in production builds
3. **JIT Mode**: Tailwind uses Just-In-Time mode by default for faster development builds

## Best Practices

1. **Use Semantic Colors**: Prefer `primary`, `secondary`, and semantic colors over generic colors
2. **Dark Mode**: Always provide dark mode variants for better user experience
3. **Consistent Spacing**: Use the spacing scale consistently throughout the app
4. **Transitions**: Add transitions to interactive elements for smooth UX
5. **Responsive Design**: Use responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) for adaptive layouts

## Extending the Configuration

To add custom utilities or components, edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    // Add your custom extensions here
  }
},
plugins: [
  // Add Tailwind plugins here
]
```

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Tailwind CSS Customization](https://tailwindcss.com/docs/configuration)
