/**
 * SyncButton Usage Examples
 * 
 * This file demonstrates how to integrate the SyncButton component
 * with the auto-sync system and cache manager.
 */

import { SyncButton } from './SyncButton';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useAppStore } from '@/store/appStore';
import { createCacheManager } from '@/managers/CacheManager';
import { PlexClient } from '@/api/plexClient';
import { useMemo, useState, useEffect } from 'react';

/**
 * Example 1: Basic usage with auto-sync hook
 */
export function BasicSyncButtonExample() {
  const { serverConnection, currentToken, isOnline } = useAppStore();

  // Create cache manager
  const cacheManager = useMemo(() => {
    if (!serverConnection || !currentToken) return null;
    const client = new PlexClient({
      baseURL: serverConnection.uri,
      token: currentToken,
    });
    return createCacheManager(client);
  }, [serverConnection, currentToken]);

  // Use auto-sync hook
  const { isSyncing, triggerSync } = useAutoSync({
    cacheManager: cacheManager!,
    isOnline,
    enabled: true,
  });

  // Get pending changes count
  const [pendingChanges, setPendingChanges] = useState(0);
  useEffect(() => {
    if (!cacheManager) return;
    cacheManager.getOfflineChanges().then((changes) => {
      setPendingChanges(changes.length);
    });
  }, [cacheManager]);

  if (!cacheManager) return null;

  return (
    <SyncButton
      isSyncing={isSyncing}
      isOnline={isOnline}
      pendingChanges={pendingChanges}
      onSync={triggerSync}
    />
  );
}

/**
 * Example 2: Icon variant in header/toolbar
 */
export function HeaderSyncButtonExample() {
  const { serverConnection, currentToken, isOnline } = useAppStore();

  const cacheManager = useMemo(() => {
    if (!serverConnection || !currentToken) return null;
    const client = new PlexClient({
      baseURL: serverConnection.uri,
      token: currentToken,
    });
    return createCacheManager(client);
  }, [serverConnection, currentToken]);

  const { isSyncing, triggerSync } = useAutoSync({
    cacheManager: cacheManager!,
    isOnline,
    enabled: true,
  });

  const [pendingChanges, setPendingChanges] = useState(0);
  useEffect(() => {
    if (!cacheManager) return;
    cacheManager.getOfflineChanges().then((changes) => {
      setPendingChanges(changes.length);
    });
  }, [cacheManager]);

  if (!cacheManager) return null;

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b">
      <h1 className="text-xl font-bold">Library</h1>
      
      <div className="flex items-center gap-2">
        {/* Other header actions */}
        <SyncButton
          isSyncing={isSyncing}
          isOnline={isOnline}
          pendingChanges={pendingChanges}
          onSync={triggerSync}
          variant="icon"
          size="md"
        />
      </div>
    </header>
  );
}

/**
 * Example 3: Secondary variant in settings
 */
export function SettingsSyncButtonExample() {
  const { serverConnection, currentToken, isOnline } = useAppStore();

  const cacheManager = useMemo(() => {
    if (!serverConnection || !currentToken) return null;
    const client = new PlexClient({
      baseURL: serverConnection.uri,
      token: currentToken,
    });
    return createCacheManager(client);
  }, [serverConnection, currentToken]);

  const { isSyncing, triggerSync, lastSyncResult } = useAutoSync({
    cacheManager: cacheManager!,
    isOnline,
    enabled: true,
  });

  const [pendingChanges, setPendingChanges] = useState(0);
  useEffect(() => {
    if (!cacheManager) return;
    cacheManager.getOfflineChanges().then((changes) => {
      setPendingChanges(changes.length);
    });
  }, [cacheManager]);

  if (!cacheManager) return null;

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Offline Sync</h2>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Pending changes: {pendingChanges}
          </p>
          {lastSyncResult && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Last sync: {lastSyncResult.synced} synced, {lastSyncResult.failed} failed
            </p>
          )}
        </div>

        <SyncButton
          isSyncing={isSyncing}
          isOnline={isOnline}
          pendingChanges={pendingChanges}
          onSync={triggerSync}
          variant="secondary"
          size="md"
        />
      </div>
    </div>
  );
}

/**
 * Example 4: Large primary button for empty state
 */
export function EmptyStateSyncButtonExample() {
  const { serverConnection, currentToken, isOnline } = useAppStore();

  const cacheManager = useMemo(() => {
    if (!serverConnection || !currentToken) return null;
    const client = new PlexClient({
      baseURL: serverConnection.uri,
      token: currentToken,
    });
    return createCacheManager(client);
  }, [serverConnection, currentToken]);

  const { isSyncing, triggerSync } = useAutoSync({
    cacheManager: cacheManager!,
    isOnline,
    enabled: true,
  });

  const [pendingChanges, setPendingChanges] = useState(0);
  useEffect(() => {
    if (!cacheManager) return;
    cacheManager.getOfflineChanges().then((changes) => {
      setPendingChanges(changes.length);
    });
  }, [cacheManager]);

  if (!cacheManager || pendingChanges === 0) return null;

  return (
    <div className="flex flex-col items-center justify-center p-12">
      <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
        />
      </svg>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        You have {pendingChanges} pending {pendingChanges === 1 ? 'change' : 'changes'}
      </h3>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
        Your offline changes are ready to sync. Connect to the internet and sync now to update the server.
      </p>

      <SyncButton
        isSyncing={isSyncing}
        isOnline={isOnline}
        pendingChanges={pendingChanges}
        onSync={triggerSync}
        variant="primary"
        size="lg"
      />
    </div>
  );
}

/**
 * Example 5: Integration with OnlineIndicator
 * 
 * The OnlineIndicator component already includes a sync button in its dropdown.
 * This example shows how they work together.
 */
export function OnlineIndicatorWithSyncExample() {
  const { serverConnection, currentToken, isOnline } = useAppStore();

  const cacheManager = useMemo(() => {
    if (!serverConnection || !currentToken) return null;
    const client = new PlexClient({
      baseURL: serverConnection.uri,
      token: currentToken,
    });
    return createCacheManager(client);
  }, [serverConnection, currentToken]);

  const { isSyncing, triggerSync, lastSyncTime } = useAutoSync({
    cacheManager: cacheManager!,
    isOnline,
    enabled: true,
  });

  if (!cacheManager) return null;

  return (
    <div className="flex items-center gap-4">
      {/* OnlineIndicator has built-in sync button */}
      {/* OnlineIndicator
        isOnline={isOnline}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onManualSync={triggerSync}
      /> */}
      
      {/* Or use standalone SyncButton */}
      <SyncButton
        isSyncing={isSyncing}
        isOnline={isOnline}
        onSync={triggerSync}
        variant="icon"
      />
    </div>
  );
}
