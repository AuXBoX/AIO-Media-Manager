import { useState, useEffect } from 'react';

/**
 * Custom title bar for frameless Electron window
 * Provides window controls (minimize, maximize, close)
 */
export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    if (typeof window === 'undefined' || !window.electron) {
      return;
    }

    // Listen for maximize/unmaximize events
    const handleMaximize = () => setIsMaximized(true);
    const handleUnmaximize = () => setIsMaximized(false);

    // Note: These would need to be implemented in preload.js
    // For now, we'll just handle the state locally
  }, []);

  const handleMinimize = () => {
    if (window.electron?.windowControls) {
      window.electron.windowControls.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electron?.windowControls) {
      if (isMaximized) {
        window.electron.windowControls.unmaximize();
        setIsMaximized(false);
      } else {
        window.electron.windowControls.maximize();
        setIsMaximized(true);
      }
    }
  };

  const handleClose = () => {
    if (window.electron?.windowControls) {
      window.electron.windowControls.close();
    }
  };

  // Only show in Electron
  if (typeof window === 'undefined' || !window.electron) {
    return null;
  }

  return (
    <div className="flex items-center justify-between h-8 bg-secondary-100 dark:bg-secondary-900 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* App title with logo */}
      <div className="flex items-center gap-2 px-3 text-sm font-medium text-secondary-700 dark:text-secondary-300">
        <img src="./icon.png" alt="AIO Media Manager" className="w-6 h-6 rounded-sm" onError={(e) => e.currentTarget.style.display = 'none'} />
      </div>

      {/* Window controls */}
      <div className="flex" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-12 h-8 flex items-center justify-center hover:bg-secondary-200 dark:hover:bg-secondary-800 transition-colors"
          aria-label="Minimize"
        >
          <svg className="w-3 h-3 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          className="w-12 h-8 flex items-center justify-center hover:bg-secondary-200 dark:hover:bg-secondary-800 transition-colors"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg className="w-3 h-3 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h16v16H4V8z" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-12 h-8 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4 text-secondary-600 dark:text-secondary-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
