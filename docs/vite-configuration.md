# Vite Configuration

This document describes the Vite configuration for the AIO Media Manager project.

## Overview

The project uses Vite as the build tool and development server, configured to support both React web development and Electron desktop application integration.

## Configuration Features

### 1. React with TypeScript

- **Plugin**: `@vitejs/plugin-react`
- **Features**: Fast Refresh (HMR), JSX transformation, TypeScript support
- **JSX Runtime**: Automatic (no need to import React in every file)

### 2. Electron Integration

- **Plugin**: `vite-plugin-electron` and `vite-plugin-electron-renderer`
- **Main Process**: `electron/main.js`
- **Build Output**: `dist-electron/`
- **Features**: Automatic Electron process restart on changes

### 3. Path Aliases

Path aliases are configured to match `tsconfig.json`:

```typescript
'@/*': ['src/*']
'@/components/*': ['src/components/*']
'@/services/*': ['src/services/*']
'@/managers/*': ['src/managers/*']
'@/types/*': ['src/types/*']
'@/utils/*': ['src/utils/*']
'@/hooks/*': ['src/hooks/*']
'@/store/*': ['src/store/*']
'@/api/*': ['src/api/*']
'@/db/*': ['src/db/*']
```

**Usage Example**:
```typescript
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { PlexAPI } from '@/api/plex';
```

### 4. Development Server

- **Port**: 5173 (strict mode - won't use alternative port)
- **Host**: `true` (accessible from network)
- **HMR**: Enabled with error overlay
- **URL**: `http://localhost:5173`

### 5. Build Configuration

#### Output Directories
- **Web**: `dist/`
- **Electron**: `dist-electron/`

#### Code Splitting
The build is configured with manual chunks for optimal caching:

- **react-vendor**: React, React DOM, React Router
- **query-vendor**: TanStack Query
- **state-vendor**: Zustand
- **api-vendor**: Axios
- **db-vendor**: Dexie and Dexie React Hooks

#### Source Maps
- Enabled in production for debugging
- Enabled in development for CSS

### 6. Environment Variables

Environment variables must be prefixed with `VITE_` to be exposed to the client:

```bash
VITE_PLEX_CLIENT_IDENTIFIER=aio-media-manager
VITE_PLEX_PRODUCT=AIO Media Manager
VITE_TMDB_API_KEY=your_api_key
```

**Access in code**:
```typescript
const clientId = import.meta.env.VITE_PLEX_CLIENT_IDENTIFIER;
```

### 7. Dependency Optimization

Pre-bundled dependencies for faster cold starts:
- react, react-dom, react-router-dom
- @tanstack/react-query
- zustand
- axios
- dexie, dexie-react-hooks

## Available Scripts

### Development

```bash
# Start web development server
npm run dev

# Start Electron development mode
npm run dev:electron
```

### Build

```bash
# Build web application
npm run build

# Build Electron application
npm run build:electron

# Preview production build
npm run preview
```

### Type Checking

```bash
# Run TypeScript type checking
npm run type-check
```

## File Structure

```
aio-media-manager/
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── src/
│   ├── main.tsx           # React entry point
│   ├── App.tsx            # Root component
│   └── index.css          # Global styles (Tailwind)
├── electron/
│   ├── main.js            # Electron main process
│   └── preload.js         # Electron preload script
├── dist/                  # Web build output
└── dist-electron/         # Electron build output
```

## Hot Module Replacement (HMR)

HMR is enabled by default in development mode:

- **React Components**: Automatically refresh without losing state
- **CSS**: Updates instantly without page reload
- **Error Overlay**: Shows compilation errors in the browser

## Performance Optimizations

1. **Code Splitting**: Vendor chunks separated for better caching
2. **Tree Shaking**: Unused code automatically removed
3. **Minification**: Production builds are minified
4. **Lazy Loading**: Route-based code splitting (to be implemented)
5. **Image Optimization**: Progressive loading (to be implemented)

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, the server will fail to start due to `strictPort: true`. Either:
1. Stop the process using port 5173
2. Change the port in `vite.config.ts`

### Path Alias Not Working

Ensure both `vite.config.ts` and `tsconfig.json` have matching path configurations.

### Electron Not Starting

1. Verify `electron/main.js` exists
2. Check that `VITE_DEV_SERVER_URL` is set correctly
3. Ensure the web dev server is running before starting Electron

### Build Errors

1. Run `npm run type-check` to identify TypeScript errors
2. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Clear Vite cache: `rm -rf node_modules/.vite`

## Next Steps

After completing Task 1.4, the following tasks will build upon this configuration:

- **Task 1.5**: Configure Tailwind CSS (already partially set up)
- **Task 1.6**: Set up ESLint and Prettier
- **Task 2.1**: Configure Vitest for unit testing
- **Task 38**: Enhance Electron configuration with window management and auto-updater

## References

- [Vite Documentation](https://vitejs.dev/)
- [vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron)
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)
