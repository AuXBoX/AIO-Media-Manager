/**
 * Electron Storage Utilities
 * Simplified - no longer used by Zustand persist middleware
 */

// Flag to track if storage has been initialized
let storageInitialized = false;
let isHydrating = true; // Prevent writes during initial hydration

/**
 * Check if running in Electron environment
 */
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && 
         window.electron !== undefined;
};

/**
 * Initialize storage (no-op now, kept for compatibility)
 */
export async function initializeElectronStorage(): Promise<void> {
  if (storageInitialized) {
    return Promise.resolve();
  }

  if (!isElectron()) {
    console.log('[Storage] Not in Electron, skipping initialization');
    storageInitialized = true;
    return;
  }

  console.log('[Storage] ✓ Electron storage ready');
  storageInitialized = true;
}

/**
 * Mark hydration as complete and enable writes
 */
export function markHydrationComplete() {
  console.log('[Storage] ✓ Hydration complete, enabling writes');
  isHydrating = false;
}
