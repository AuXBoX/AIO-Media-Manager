import React from 'react';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electron !== undefined;

/**
 * PWA Wrapper Component
 * 
 * Conditionally loads PWA features only when not running in Electron.
 * This prevents service worker registration issues in the Electron environment.
 */
export const PWAWrapper: React.FC = () => {
  // Don't load PWA features in Electron
  if (isElectron) {
    return null;
  }

  // Lazy load PWA component only in web environment
  const PWAUpdatePrompt = React.lazy(() =>
    import('./PWAUpdatePrompt').then((module) => ({
      default: module.PWAUpdatePrompt,
    }))
  );

  return (
    <React.Suspense fallback={null}>
      <PWAUpdatePrompt />
    </React.Suspense>
  );
};
