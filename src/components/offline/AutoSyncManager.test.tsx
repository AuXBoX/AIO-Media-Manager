import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AutoSyncManager } from './AutoSyncManager';
import type { CacheManager, SyncResult, ConflictResolution } from '@/managers/CacheManager';

// Mock the useAutoSync hook
vi.mock('@/hooks/useAutoSync', () => ({
  useAutoSync: vi.fn(),
}));

import { useAutoSync } from '@/hooks/useAutoSync';

describe('AutoSyncManager', () => {
  let mockCacheManager: Partial<CacheManager>;
  let mockUseAutoSync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCacheManager = {
      getOfflineChanges: vi.fn().mockResolvedValue([]),
      syncOfflineChanges: vi.fn().mockResolvedValue({
        total: 0,
        synced: 0,
        failed: 0,
        conflicts: [],
      }),
    };

    mockUseAutoSync = useAutoSync as ReturnType<typeof vi.fn>;
    mockUseAutoSync.mockReturnValue({
      isSyncing: false,
      lastSyncResult: null,
      lastSyncTime: null,
      lastSyncError: null,
      triggerSync: vi.fn(),
    });
  });

  it('renders without crashing', () => {
    render(
      <AutoSyncManager
        cacheManager={mockCacheManager as CacheManager}
        isOnline={true}
      />
    );

    // Component doesn't render visible content by default
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls useAutoSync with correct parameters', () => {
    const onSyncSuccess = vi.fn();
    const onSyncError = vi.fn();

    render(
      <AutoSyncManager
        cacheManager={mockCacheManager as CacheManager}
        isOnline={true}
        enabled={true}
        onSyncSuccess={onSyncSuccess}
        onSyncError={onSyncError}
      />
    );

    expect(mockUseAutoSync).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheManager: mockCacheManager,
        isOnline: true,
        enabled: true,
      })
    );
  });

  it('shows conflict modal when conflicts are detected', async () => {
    const conflicts: ConflictResolution[] = [
      {
        ratingKey: '123',
        localChange: { title: 'Local Title' },
        serverValue: { title: 'Server Title' },
        resolution: 'manual',
      },
    ];

    const syncResult: SyncResult = {
      total: 1,
      synced: 0,
      failed: 0,
      conflicts,
    };

    // Mock useAutoSync to trigger onSyncComplete with conflicts
    mockUseAutoSync.mockImplementation((options: any) => {
      // Simulate sync complete with conflicts
      setTimeout(() => {
        options.onSyncComplete(syncResult);
      }, 0);

      return {
        isSyncing: false,
        lastSyncResult: null,
        lastSyncTime: null,
        lastSyncError: null,
        triggerSync: vi.fn(),
      };
    });

    render(
      <AutoSyncManager
        cacheManager={mockCacheManager as CacheManager}
        isOnline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Resolve Sync Conflicts')).toBeInTheDocument();
    });
  });

  it('calls onSyncSuccess when sync completes without conflicts', async () => {
    const onSyncSuccess = vi.fn();

    const syncResult: SyncResult = {
      total: 5,
      synced: 5,
      failed: 0,
      conflicts: [],
    };

    mockUseAutoSync.mockImplementation((options: any) => {
      setTimeout(() => {
        options.onSyncComplete(syncResult);
      }, 0);

      return {
        isSyncing: false,
        lastSyncResult: null,
        lastSyncTime: null,
        lastSyncError: null,
        triggerSync: vi.fn(),
      };
    });

    render(
      <AutoSyncManager
        cacheManager={mockCacheManager as CacheManager}
        isOnline={true}
        onSyncSuccess={onSyncSuccess}
      />
    );

    await waitFor(() => {
      expect(onSyncSuccess).toHaveBeenCalledWith(syncResult);
    });
  });

  it('calls onSyncError when sync fails', async () => {
    const onSyncError = vi.fn();
    const error = new Error('Sync failed');

    mockUseAutoSync.mockImplementation((options: any) => {
      setTimeout(() => {
        options.onSyncError(error);
      }, 0);

      return {
        isSyncing: false,
        lastSyncResult: null,
        lastSyncTime: null,
        lastSyncError: error,
        triggerSync: vi.fn(),
      };
    });

    render(
      <AutoSyncManager
        cacheManager={mockCacheManager as CacheManager}
        isOnline={true}
        onSyncError={onSyncError}
      />
    );

    await waitFor(() => {
      expect(onSyncError).toHaveBeenCalledWith(error);
    });
  });

  it('calls onConflictsDetected when conflicts are found', async () => {
    const onConflictsDetected = vi.fn();

    const conflicts: ConflictResolution[] = [
      {
        ratingKey: '123',
        localChange: { title: 'Local Title' },
        serverValue: { title: 'Server Title' },
        resolution: 'manual',
      },
    ];

    const syncResult: SyncResult = {
      total: 1,
      synced: 0,
      failed: 0,
      conflicts,
    };

    mockUseAutoSync.mockImplementation((options: any) => {
      setTimeout(() => {
        options.onSyncComplete(syncResult);
      }, 0);

      return {
        isSyncing: false,
        lastSyncResult: null,
        lastSyncTime: null,
        lastSyncError: null,
        triggerSync: vi.fn(),
      };
    });

    render(
      <AutoSyncManager
        cacheManager={mockCacheManager as CacheManager}
        isOnline={true}
        onConflictsDetected={onConflictsDetected}
      />
    );

    await waitFor(() => {
      expect(onConflictsDetected).toHaveBeenCalledWith(conflicts);
    });
  });

  it('closes conflict modal when cancel is clicked', async () => {
    const conflicts: ConflictResolution[] = [
      {
        ratingKey: '123',
        localChange: { title: 'Local Title' },
        serverValue: { title: 'Server Title' },
        resolution: 'manual',
      },
    ];

    const syncResult: SyncResult = {
      total: 1,
      synced: 0,
      failed: 0,
      conflicts,
    };

    mockUseAutoSync.mockImplementation((options: any) => {
      setTimeout(() => {
        options.onSyncComplete(syncResult);
      }, 0);

      return {
        isSyncing: false,
        lastSyncResult: null,
        lastSyncTime: null,
        lastSyncError: null,
        triggerSync: vi.fn(),
      };
    });

    render(
      <AutoSyncManager
        cacheManager={mockCacheManager as CacheManager}
        isOnline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Resolve Sync Conflicts')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    
    await waitFor(async () => {
      cancelButton.click();
      await waitFor(() => {
        expect(screen.queryByText('Resolve Sync Conflicts')).not.toBeInTheDocument();
      });
    });
  });
});
