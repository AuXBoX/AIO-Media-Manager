import { useEffect, useCallback, useRef, useState } from 'react';
import type { CacheManager, SyncResult } from '@/managers/CacheManager';

interface AutoSyncOptions {
  /**
   * Cache manager instance
   */
  cacheManager: CacheManager;
  /**
   * Whether the application is online
   */
  isOnline: boolean;
  /**
   * Whether auto-sync is enabled
   */
  enabled?: boolean;
  /**
   * Callback when sync starts
   */
  onSyncStart?: () => void;
  /**
   * Callback when sync completes
   */
  onSyncComplete?: (result: SyncResult) => void;
  /**
   * Callback when sync fails
   */
  onSyncError?: (error: Error) => void;
}

interface AutoSyncResult {
  /**
   * Whether sync is currently in progress
   */
  isSyncing: boolean;
  /**
   * Last sync result
   */
  lastSyncResult: SyncResult | null;
  /**
   * Last sync timestamp
   */
  lastSyncTime: number | null;
  /**
   * Last sync error
   */
  lastSyncError: Error | null;
  /**
   * Manually trigger sync
   */
  triggerSync: () => Promise<void>;
}

/**
 * useAutoSync Hook
 * 
 * Automatically syncs offline changes when connection is restored
 * Provides manual sync trigger and sync status tracking
 */
export function useAutoSync(options: AutoSyncOptions): AutoSyncResult {
  const {
    cacheManager,
    isOnline,
    enabled = true,
    onSyncStart,
    onSyncComplete,
    onSyncError,
  } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [lastSyncError, setLastSyncError] = useState<Error | null>(null);

  // Track previous online status to detect reconnection
  const prevOnlineRef = useRef(isOnline);
  const syncInProgressRef = useRef(false);

  /**
   * Perform sync operation
   */
  const performSync = useCallback(async () => {
    // Prevent concurrent syncs
    if (syncInProgressRef.current) {
      return;
    }

    // Only sync when online
    if (!isOnline) {
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);
    setLastSyncError(null);

    if (onSyncStart) {
      onSyncStart();
    }

    try {
      // Get offline changes
      const changes = await cacheManager.getOfflineChanges();

      // Only sync if there are changes
      if (changes.length === 0) {
        const emptyResult: SyncResult = {
          total: 0,
          synced: 0,
          failed: 0,
          conflicts: [],
        };
        setLastSyncResult(emptyResult);
        setLastSyncTime(Date.now());
        
        if (onSyncComplete) {
          onSyncComplete(emptyResult);
        }
        return;
      }

      // Perform sync
      const result = await cacheManager.syncOfflineChanges();
      
      setLastSyncResult(result);
      setLastSyncTime(Date.now());

      if (onSyncComplete) {
        onSyncComplete(result);
      }
    } catch (error) {
      const syncError = error instanceof Error ? error : new Error('Sync failed');
      setLastSyncError(syncError);

      if (onSyncError) {
        onSyncError(syncError);
      }
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  }, [cacheManager, isOnline, onSyncStart, onSyncComplete, onSyncError]);

  /**
   * Manual sync trigger
   */
  const triggerSync = useCallback(async () => {
    if (!enabled) {
      throw new Error('Auto-sync is disabled');
    }

    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await performSync();
  }, [enabled, isOnline, performSync]);

  /**
   * Detect reconnection and trigger sync
   */
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    const isNowOnline = isOnline;

    // Update ref for next check
    prevOnlineRef.current = isOnline;

    // If we just came online and auto-sync is enabled, trigger sync
    if (wasOffline && isNowOnline && enabled) {
      // Small delay to ensure connection is stable
      const timeoutId = setTimeout(() => {
        performSync();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, enabled, performSync]);

  return {
    isSyncing,
    lastSyncResult,
    lastSyncTime,
    lastSyncError,
    triggerSync,
  };
}
