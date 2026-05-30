import { useEffect, useMemo, useRef } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { useToast } from '@/hooks/useToast';
import { useAppStore } from '@/store/appStore';
import { AutoSyncManager } from '@/components/offline/AutoSyncManager';
import { ToastContainer } from '@/components/ui/Toast';
import { PWAWrapper } from '@/components/pwa/PWAWrapper';
import { TitleBar } from '@/components/layout/TitleBar';
import { createCacheManager } from '@/managers/CacheManager';
import { PlexClient } from '@/api/plexClient';
import { queryClient } from '@/api/queryClient';
import { router } from '@/router';

function App() {
  const { serverConnection, currentToken } = useAppStore();
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus);
  const { toasts, showToast, removeToast } = useToast();

  // Set up offline detection with server URL from app store
  const { isOnline } = useOfflineDetection({
    serverUrl: serverConnection?.uri,
    checkInterval: 30000, // Check every 30 seconds
    pingTimeout: 5000, // 5 second timeout for server ping
  });

  // Update app store when online status changes
  useEffect(() => {
    setOnlineStatus(isOnline);
  }, [isOnline, setOnlineStatus]);

  // Track previous online status to only show toast on actual transitions
  const prevOnlineRef = useRef<boolean | null>(null);

  // Show notifications when connection status changes (but not on initial mount)
  useEffect(() => {
    const prevOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    // Only show toast on actual transition (not initial mount)
    if (prevOnline !== null && prevOnline !== isOnline) {
      if (isOnline) {
        showToast('Connection restored. Syncing offline changes...', 'info');
      } else {
        showToast('Connection lost. Working in offline mode.', 'warning');
      }
    }
  }, [isOnline, showToast]);

  // Create cache manager instance
  const cacheManager = useMemo(() => {
    if (!serverConnection || !currentToken) {
      return null;
    }

    const client = new PlexClient({
      baseURL: serverConnection.uri,
      token: currentToken,
    });

    return createCacheManager(client);
  }, [serverConnection, currentToken]);

  // Handle sync success
  const handleSyncSuccess = (result: any) => {
    if (result.total === 0) {
      // No changes to sync
      return;
    }

    if (result.synced > 0 && result.failed === 0) {
      showToast(
        `Successfully synced ${result.synced} ${result.synced === 1 ? 'change' : 'changes'}`,
        'success'
      );
    } else if (result.synced > 0 && result.failed > 0) {
      showToast(
        `Synced ${result.synced} changes, ${result.failed} failed`,
        'warning'
      );
    } else if (result.failed > 0) {
      showToast(`Failed to sync ${result.failed} changes`, 'error');
    }
  };

  // Handle sync error
  const handleSyncError = (error: Error) => {
    showToast(`Sync failed: ${error.message}`, 'error');
  };

  // Handle conflicts detected
  const handleConflictsDetected = (conflicts: any[]) => {
    showToast(
      `${conflicts.length} ${conflicts.length === 1 ? 'conflict' : 'conflicts'} detected. Please resolve them.`,
      'warning'
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col h-screen">
        {/* Custom title bar for Electron */}
        <TitleBar />

        {/* Main content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Router */}
          <RouterProvider router={router} />

          {/* Auto-sync manager - handles automatic sync on reconnection */}
          {cacheManager && (
            <AutoSyncManager
              cacheManager={cacheManager}
              isOnline={isOnline}
              enabled={true}
              onSyncSuccess={handleSyncSuccess}
              onSyncError={handleSyncError}
              onConflictsDetected={handleConflictsDetected}
            />
          )}

          {/* PWA update prompt - only in web mode */}
          <PWAWrapper />

          {/* Toast notifications */}
          <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
