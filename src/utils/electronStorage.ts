/**
 * Electron Storage Adapter for Zustand Persist
 * Uses Electron IPC to store data in %APPDATA%\aio-media-manager
 */

import type { StateStorage } from 'zustand/middleware';

// Flag to track if storage has been initialized
let storageInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Check if running in Electron environment
 */
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && 
         window.electron !== undefined;
};

/**
 * Electron storage adapter for Zustand persist middleware
 * Handles async storage operations properly with synchronous fallback
 */
export const electronStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (!isElectron()) {
      // Fallback to localStorage in web mode
      console.log('[Storage] Using localStorage (not Electron)');
      return localStorage.getItem(name);
    }

    // For Electron, we need to use synchronous storage
    // Store in memory and sync with IPC in background
    const cache = (window as any).__electronStorageCache;
    const cached = cache?.[name];
    
    console.log('[Storage] getItem called for:', name);
    console.log('[Storage] Is Electron:', isElectron());
    console.log('[Storage] Cache exists:', !!cache);
    console.log('[Storage] Cache keys:', cache ? Object.keys(cache) : 'no cache');
    console.log('[Storage] Value found:', !!cached);
    
    if (cached) {
      console.log('[Storage] Returning cached value (preview):', cached.substring(0, 100));
    } else {
      console.log('[Storage] ⚠ No cached value found for:', name);
      console.log('[Storage] ⚠ This means either:');
      console.log('[Storage]    1. No settings file exists (first run)');
      console.log('[Storage]    2. Settings file exists but key name mismatch');
      console.log('[Storage]    3. initializeElectronStorage() was not called');
    }
    
    return cached || null;
  },

  setItem: (name: string, value: string): void => {
    console.log('[Storage] setItem:', name, '=', value.substring(0, 100) + '...');
    
    if (!isElectron()) {
      // Fallback to localStorage in web mode
      localStorage.setItem(name, value);
      return;
    }

    // Cache in memory immediately for synchronous access
    if (!(window as any).__electronStorageCache) {
      (window as any).__electronStorageCache = {};
    }
    (window as any).__electronStorageCache[name] = value;

    // Persist to disk asynchronously
    try {
      const parsed = JSON.parse(value);
      window.electron!.settings.set(name, parsed).then(() => {
        console.log('[Storage] Persisted to disk:', name);
      }).catch((error: Error) => {
        console.error('[Storage] Failed to persist to Electron storage:', error);
      });
    } catch (error) {
      console.error('[Storage] Failed to parse value for Electron storage:', error);
    }
  },

  removeItem: (name: string): void => {
    console.log('[Storage] removeItem:', name);
    
    if (!isElectron()) {
      // Fallback to localStorage in web mode
      localStorage.removeItem(name);
      return;
    }

    // Remove from memory cache
    if ((window as any).__electronStorageCache) {
      delete (window as any).__electronStorageCache[name];
    }

    // Remove from disk asynchronously
    window.electron!.settings.delete(name).catch((error: Error) => {
      console.error('[Storage] Failed to remove from Electron storage:', error);
    });
  },
};

/**
 * Initialize storage cache from Electron settings
 * Call this before rendering the app
 */
export async function initializeElectronStorage(): Promise<void> {
  // Return existing promise if already initializing
  if (initializationPromise) {
    return initializationPromise;
  }

  // Return immediately if already initialized
  if (storageInitialized) {
    return Promise.resolve();
  }

  initializationPromise = (async () => {
    if (!isElectron()) {
      console.log('[Storage] Not in Electron, skipping initialization');
      storageInitialized = true;
      return;
    }

    try {
      console.log('[Storage] Initializing Electron storage...');
      
      // Get debug information
      const debugInfo = await window.electron!.settings.debug();
      console.log('[Storage] ===== DEBUG INFO =====');
      console.log('[Storage] Paths:', debugInfo.paths);
      console.log('[Storage] File exists:', debugInfo.file?.exists);
      console.log('[Storage] File size:', debugInfo.file?.size, 'bytes');
      console.log('[Storage] Environment:', debugInfo.environment);
      
      if (debugInfo.file?.content) {
        console.log('[Storage] File content:', debugInfo.file.content);
        try {
          const parsed = JSON.parse(debugInfo.file.content);
          console.log('[Storage] Parsed settings keys:', Object.keys(parsed));
        } catch (e) {
          console.error('[Storage] Failed to parse settings file:', e);
        }
      } else {
        console.log('[Storage] No settings file content (file may not exist)');
      }
      console.log('[Storage] ===== END DEBUG INFO =====');
      
      // Get the settings file path for debugging
      const paths = await window.electron!.settings.getPath();
      console.log('[Storage] Settings file location:', paths.settingsFile);
      
      // Load all settings from disk into memory cache
      const allSettings = await window.electron!.settings.get();
      
      console.log('[Storage] Raw settings loaded:', allSettings);
      console.log('[Storage] Settings keys:', allSettings ? Object.keys(allSettings) : 'none');
      
      // Initialize cache object
      (window as any).__electronStorageCache = {};
      
      if (allSettings && Object.keys(allSettings).length > 0) {
        // Convert each setting to JSON string for Zustand
        for (const [key, value] of Object.entries(allSettings)) {
          const jsonValue = JSON.stringify(value);
          (window as any).__electronStorageCache[key] = jsonValue;
          console.log('[Storage] Cached key:', key);
          console.log('[Storage] Cached value preview:', jsonValue.substring(0, 200));
        }
        
        console.log('[Storage] ✓ Electron storage initialized with', Object.keys(allSettings).length, 'items');
      } else {
        console.log('[Storage] ⚠ No existing settings found - this is normal for first run');
      }
      
      // Log the final cache state
      console.log('[Storage] Final cache keys:', Object.keys((window as any).__electronStorageCache || {}));
      
      storageInitialized = true;
    } catch (error) {
      console.error('[Storage] ✗ Failed to initialize Electron storage:', error);
      // Initialize empty cache to prevent errors
      (window as any).__electronStorageCache = {};
      storageInitialized = true;
    }
  })();

  return initializationPromise;
}
