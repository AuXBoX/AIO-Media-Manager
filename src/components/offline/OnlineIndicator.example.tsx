/**
 * OnlineIndicator Usage Example
 * 
 * This file demonstrates how to integrate the OnlineIndicator component
 * with the app store and CacheManager for offline mode functionality.
 */

import { OnlineIndicator } from './OnlineIndicator';
import { useAppStore } from '@/store/appStore';
import { CacheManager } from '@/managers/CacheManager';
import { useState } from 'react';

/**
 * Example: Basic usage with app store
 */
export function BasicOnlineIndicatorExample() {
  const isOnline = useAppStore((state) => state.isOnline);

  return <OnlineIndicator isOnline={isOnline} />;
}

/**
 * Example: Full-featured usage with sync functionality
 * 
 * Note: In a real implementation, you would get the PlexClient instance
 * from your app's context or dependency injection system.
 */
export function FullFeaturedOnlineIndicatorExample() {
  const isOnline = useAppStore((state) => state.isOnline);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | undefined>(undefined);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      // In a real implementation, get the PlexClient from context
      // const client = usePlexClient();
      // const cacheManager = new CacheManager(client);
      // const result = await cacheManager.syncOfflineChanges();
      
      // Simulated sync for example purposes
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastSyncTime(Date.now());
      console.log('Sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <OnlineIndicator
      isOnline={isOnline}
      isSyncing={isSyncing}
      lastSyncTime={lastSyncTime}
      onManualSync={handleManualSync}
    />
  );
}

/**
 * Example: Placement in app header/navbar
 */
export function AppHeaderWithOnlineIndicator() {
  const isOnline = useAppStore((state) => state.isOnline);

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Plex Media Manager</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Other header items */}
        <OnlineIndicator isOnline={isOnline} />
      </div>
    </header>
  );
}

/**
 * Example: Automatic online/offline detection
 * 
 * This hook can be used to automatically update the online status
 * based on browser connectivity and server reachability.
 */
export function useOnlineDetection() {
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus);

  // Listen to browser online/offline events
  useState(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });
}
