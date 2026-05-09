# Offline Mode Components

This directory contains components for managing offline functionality in the AIO Media Manager application.

## Components

### AutoSyncManager

Manages automatic synchronization of offline changes when the application reconnects to the server.

**Features:**
- Automatically detects when the app transitions from offline to online
- Triggers sync of queued offline changes
- Handles conflicts through the ConflictResolutionModal
- Provides callbacks for sync success, error, and conflict detection

**Usage:**
```tsx
import { AutoSyncManager } from '@/components/offline';
import { createCacheManager } from '@/managers/CacheManager';

function App() {
  const cacheManager = createCacheManager(plexClient);
  const { isOnline } = useOfflineDetection();

  return (
    <AutoSyncManager
      cacheManager={cacheManager}
      isOnline={isOnline}
      enabled={true}
      onSyncSuccess={(result) => console.log('Synced:', result)}
      onSyncError={(error) => console.error('Sync failed:', error)}
      onConflictsDetected={(conflicts) => console.log('Conflicts:', conflicts)}
    />
  );
}
```

### ConflictResolutionModal

Modal UI for resolving sync conflicts between local and server changes.

**Features:**
- Displays conflicting fields side-by-side
- Allows per-item resolution (keep local or use server)
- Supports bulk resolution for all conflicts
- Shows field-level differences

### OnlineIndicator

Visual indicator showing the current online/offline status.

### CachedDataBadge

Badge component indicating when data is being displayed from cache.

### SyncButton

Button component for manually triggering sync operations.

## Hooks

### useAutoSync

Hook that manages automatic synchronization logic.

**Features:**
- Monitors online status changes
- Automatically triggers sync on reconnection
- Provides manual sync trigger
- Tracks sync status and results

**Usage:**
```tsx
import { useAutoSync } from '@/hooks/useAutoSync';

function MyComponent() {
  const { isSyncing, lastSyncResult, triggerSync } = useAutoSync({
    cacheManager,
    isOnline,
    enabled: true,
    onSyncComplete: (result) => console.log('Sync complete:', result),
    onSyncError: (error) => console.error('Sync error:', error),
  });

  return (
    <div>
      {isSyncing && <p>Syncing...</p>}
      <button onClick={triggerSync}>Sync Now</button>
    </div>
  );
}
```

### useOfflineDetection

Hook that detects offline/online status using both navigator.onLine and server ping.

## Integration

The offline mode system is integrated into the main App component:

1. **Offline Detection**: `useOfflineDetection` monitors connection status
2. **Auto-Sync**: `AutoSyncManager` handles automatic sync on reconnection
3. **User Feedback**: Toast notifications inform users of sync status
4. **Conflict Resolution**: Modal UI allows users to resolve conflicts

## Workflow

1. User makes changes while offline → changes queued in IndexedDB
2. Connection restored → `useOfflineDetection` detects online status
3. `AutoSyncManager` automatically triggers sync via `useAutoSync`
4. If no conflicts → changes synced, success toast shown
5. If conflicts → `ConflictResolutionModal` shown, user resolves conflicts
6. After resolution → remaining changes synced

## Testing

All components and hooks have comprehensive unit tests:
- `AutoSyncManager.test.tsx`
- `ConflictResolutionModal.test.tsx`
- `useAutoSync.test.ts` (in hooks directory)
- `useOfflineDetection.test.ts` (in hooks directory)
