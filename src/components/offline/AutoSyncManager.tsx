import { useState, useCallback } from 'react';
import { useAutoSync } from '@/hooks/useAutoSync';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import type { CacheManager, SyncResult, ConflictResolution } from '@/managers/CacheManager';

interface AutoSyncManagerProps {
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
   * Callback when sync completes successfully
   */
  onSyncSuccess?: (result: SyncResult) => void;
  /**
   * Callback when sync fails
   */
  onSyncError?: (error: Error) => void;
  /**
   * Callback when conflicts are detected
   */
  onConflictsDetected?: (conflicts: ConflictResolution[]) => void;
}

/**
 * AutoSyncManager Component
 * 
 * Manages automatic synchronization of offline changes when reconnecting
 * Handles conflict resolution through modal UI
 * Provides feedback on sync status
 */
export function AutoSyncManager({
  cacheManager,
  isOnline,
  enabled = true,
  onSyncSuccess,
  onSyncError,
  onConflictsDetected,
}: AutoSyncManagerProps) {
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingSyncResult, setPendingSyncResult] = useState<SyncResult | null>(null);

  /**
   * Handle sync completion
   */
  const handleSyncComplete = useCallback(
    (result: SyncResult) => {
      // Check for conflicts
      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        setShowConflictModal(true);
        setPendingSyncResult(result);

        if (onConflictsDetected) {
          onConflictsDetected(result.conflicts);
        }
      } else {
        // No conflicts, sync completed successfully
        if (onSyncSuccess) {
          onSyncSuccess(result);
        }
      }
    },
    [onSyncSuccess, onConflictsDetected]
  );

  /**
   * Handle sync error
   */
  const handleSyncError = useCallback(
    (error: Error) => {
      if (onSyncError) {
        onSyncError(error);
      }
    },
    [onSyncError]
  );

  /**
   * Set up auto-sync
   */
  const { isSyncing: _isSyncing, lastSyncResult: _lastSyncResult, lastSyncError: _lastSyncError, triggerSync: _triggerSync } = useAutoSync({
    cacheManager,
    isOnline,
    enabled,
    onSyncComplete: handleSyncComplete,
    onSyncError: handleSyncError,
  });

  /**
   * Handle conflict resolution
   */
  const handleResolveConflicts = useCallback(
    async (resolutions: Map<string, 'local' | 'server'>) => {
      // Apply resolutions
      for (const [ratingKey, resolution] of resolutions.entries()) {
        const conflict = conflicts.find((c) => c.ratingKey === ratingKey);
        if (!conflict) continue;

        try {
          if (resolution === 'local') {
            // Keep local changes - re-apply the offline change
            const changes = await cacheManager.getOfflineChanges();
            const change = changes.find((c) => c.ratingKey === ratingKey);
            if (change) {
              // Force apply the change (implementation depends on CacheManager)
              // For now, we'll just mark it as resolved
              console.log(`Applying local changes for ${ratingKey}`);
            }
          } else {
            // Use server version - discard local changes
            const changes = await cacheManager.getOfflineChanges();
            const change = changes.find((c) => c.ratingKey === ratingKey);
            if (change) {
              // Mark change as synced to discard it
              await (cacheManager as any).markChangeSynced(change.id);
            }
          }
        } catch (error) {
          console.error(`Failed to resolve conflict for ${ratingKey}:`, error);
          throw error;
        }
      }

      // Close modal
      setShowConflictModal(false);
      setConflicts([]);

      // Notify success with pending result
      if (pendingSyncResult && onSyncSuccess) {
        onSyncSuccess(pendingSyncResult);
      }
      setPendingSyncResult(null);
    },
    [conflicts, cacheManager, pendingSyncResult, onSyncSuccess]
  );

  /**
   * Handle modal close
   */
  const handleCloseModal = useCallback(() => {
    setShowConflictModal(false);
    // Keep conflicts in state in case user wants to resolve later
  }, []);

  // This component doesn't render anything visible
  // It only manages the conflict resolution modal
  return (
    <>
      {showConflictModal && (
        <ConflictResolutionModal
          isOpen={showConflictModal}
          onClose={handleCloseModal}
          conflicts={conflicts}
          onResolve={handleResolveConflicts}
        />
      )}
    </>
  );
}
