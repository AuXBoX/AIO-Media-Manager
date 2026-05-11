/**
 * Settings Manager
 * Handles application settings storage, retrieval, validation, and updates
 */

import { ExternalProvider } from '@/types';

/**
 * Application Settings Schema
 */
export interface AppSettings {
  // Server connection
  selectedServerId?: string;
  lastConnectedServer?: {
    machineIdentifier: string;
    name: string;
  };

  // User context
  currentUserId?: string;

  // UI preferences
  theme: 'light' | 'dark' | 'system';
  defaultView: 'grid' | 'list';
  gridColumns: number;
  thumbnailQuality: 'low' | 'medium' | 'high';
  language: string;

  // External providers
  defaultMetadataProvider: ExternalProvider;
  tmdbApiKey?: string;
  fanartApiKey?: string;
  tvdbApiKey?: string;
  subdlApiKey?: string;

  // Cache settings
  cacheEnabled: boolean;
  maxCacheSize: number; // MB
  cacheRetentionDays: number;
  autoSync: boolean;
  syncInterval: number; // minutes
  offlineModeEnabled: boolean;
  autoClearInterval: number; // days

  // Local metadata settings
  metadataSaveMode: 'plex' | 'local' | 'both';
  localMetadataFormat: 'nfo' | 'embedded' | 'both';
  createNfoBackups: boolean;
  nfoTemplate: 'kodi' | 'emby' | 'custom';
  autoSyncLocalChanges: boolean;

  // Performance
  pageSize: number;
  imagePreloadCount: number;
  enableLazyLoading: boolean;
  enableVirtualScrolling: boolean;
  imageQuality: 'low' | 'medium' | 'high';

  // Privacy
  analyticsEnabled: boolean;
  errorReporting: boolean;
  usageStatistics: boolean;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: AppSettings = {
  // UI preferences
  theme: 'system',
  defaultView: 'grid',
  gridColumns: 4,
  thumbnailQuality: 'medium',
  language: 'en',

  // External providers
  defaultMetadataProvider: 'tmdb',

  // Cache settings
  cacheEnabled: true,
  maxCacheSize: 1024, // 1GB
  cacheRetentionDays: 30,
  autoSync: true,
  syncInterval: 15,
  offlineModeEnabled: true,
  autoClearInterval: 7,

  // Local metadata settings
  metadataSaveMode: 'plex',
  localMetadataFormat: 'nfo',
  createNfoBackups: true,
  nfoTemplate: 'kodi',
  autoSyncLocalChanges: false,

  // Performance
  pageSize: 50,
  imagePreloadCount: 10,
  enableLazyLoading: true,
  enableVirtualScrolling: true,
  imageQuality: 'medium',

  // Privacy
  analyticsEnabled: false,
  errorReporting: true,
  usageStatistics: false,
};

/**
 * Settings validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Settings Manager Interface
 */
export interface ISettingsManager {
  getSettings(): Promise<AppSettings>;
  updateSettings(updates: Partial<AppSettings>): Promise<void>;
  resetSettings(): Promise<void>;
  validateSettings(settings: Partial<AppSettings>): ValidationError[];
  getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]>;
  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
}

/**
 * Storage adapter interface for different platforms
 */
interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * LocalStorage adapter for web
 */
class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

/**
 * Electron Store adapter (for desktop)
 * Stores settings in %APPDATA%/aio-media-manager/settings/app-settings.json
 */
class ElectronStoreAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && (window as any).electron?.settings) {
        // Get all settings directly (no nested key)
        const settings = await (window as any).electron.settings.get();
        if (!settings || Object.keys(settings).length === 0) {
          return null;
        }
        // Return the settings as JSON string
        return JSON.stringify(settings);
      }
      // Fallback to localStorage if electron API not available
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to get settings from Electron store:', error);
      return localStorage.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).electron?.settings) {
        // Validate value before parsing
        if (!value || value === 'null' || value === 'undefined') {
          console.warn('[ElectronStoreAdapter] Attempted to save invalid value:', value);
          return;
        }
        
        // Parse the JSON string and save directly (no nested key)
        let settings;
        try {
          settings = JSON.parse(value);
        } catch (parseError) {
          console.error('[ElectronStoreAdapter] Failed to parse settings JSON:', parseError);
          throw new Error('Invalid settings data');
        }
        
        if (!settings || typeof settings !== 'object') {
          console.error('[ElectronStoreAdapter] Settings is not an object:', settings);
          throw new Error('Settings must be an object');
        }
        
        // Remove any undefined or null values before sending to Electron
        const cleanedSettings: Record<string, any> = {};
        for (const [k, v] of Object.entries(settings)) {
          if (v !== undefined && v !== null) {
            cleanedSettings[k] = v;
          } else {
            console.warn('[ElectronStoreAdapter] Filtering out undefined/null value for key:', k);
          }
        }
        
        console.log('[ElectronStoreAdapter] Saving cleaned settings with', Object.keys(cleanedSettings).length, 'keys');
        
        // Pass the settings object directly as the first parameter (bulk update)
        // The Electron handler will detect it's an object and do a bulk update
        await (window as any).electron.settings.set(cleanedSettings);
        return;
      }
      // Fallback to localStorage if electron API not available
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to set settings in Electron store:', error);
      // Don't fallback to localStorage on error, let it propagate
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).electron?.settings) {
        await (window as any).electron.settings.delete();
        return;
      }
      // Fallback to localStorage if electron API not available
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove settings from Electron store:', error);
      localStorage.removeItem(key);
    }
  }
}

/**
 * Settings Manager Implementation
 */
export class SettingsManager implements ISettingsManager {
  private static readonly STORAGE_KEY = 'aio-media-manager-settings';
  private storage: StorageAdapter;
  private cachedSettings: AppSettings | null = null; // Start with null to force initial load

  constructor(useElectronStore = false) {
    this.storage = useElectronStore ? new ElectronStoreAdapter() : new LocalStorageAdapter();
    console.log('[SettingsManager] Initialized with storage:', useElectronStore ? 'Electron' : 'LocalStorage');
  }

  /**
   * Get all settings
   */
  async getSettings(): Promise<AppSettings> {
    // Always load from storage if cache is empty
    if (!this.cachedSettings) {
      console.log('[SettingsManager] Loading settings from storage...');
      const stored = await this.storage.getItem(SettingsManager.STORAGE_KEY);

      if (!stored) {
        console.log('[SettingsManager] No stored settings found, using defaults');
        this.cachedSettings = { ...DEFAULT_SETTINGS };
        // Save defaults to storage
        await this.storage.setItem(SettingsManager.STORAGE_KEY, JSON.stringify(this.cachedSettings));
        return this.cachedSettings;
      }

      try {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all fields exist
        this.cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
        console.log('[SettingsManager] Loaded settings:', this.cachedSettings);
        return this.cachedSettings!;
      } catch (error) {
        console.error('[SettingsManager] Failed to parse settings:', error);
        this.cachedSettings = { ...DEFAULT_SETTINGS };
        return this.cachedSettings!;
      }
    }

    // Cache exists, return it (TypeScript doesn't understand we checked for null above)
    return this.cachedSettings!;
  }

  /**
   * Update settings with partial updates
   */
  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    console.log('[SettingsManager] Updating settings:', updates);
    
    // Validate updates
    const errors = this.validateSettings(updates);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map((e) => e.message).join(', ')}`);
    }

    const current = await this.getSettings();
    
    // Remove undefined and null values from updates to prevent JSON serialization issues
    const cleanUpdates: Partial<AppSettings> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== null) {
        cleanUpdates[key as keyof AppSettings] = value as any;
      } else {
        console.warn('[SettingsManager] Skipping undefined/null value for key:', key);
      }
    }
    
    const updated = { ...current, ...cleanUpdates };
    
    // Final pass: remove any undefined/null values from the entire settings object
    const cleanedSettings: Partial<AppSettings> = {};
    for (const [key, value] of Object.entries(updated)) {
      if (value !== undefined && value !== null) {
        cleanedSettings[key as keyof AppSettings] = value as any;
      }
    }

    console.log('[SettingsManager] Saving to storage:', cleanedSettings);
    
    try {
      // Use a custom replacer to filter out undefined values during JSON.stringify
      const jsonString = JSON.stringify(cleanedSettings, (key, value) => {
        // Filter out undefined and null values
        if (value === undefined || value === null) {
          return undefined; // This will cause JSON.stringify to omit the key
        }
        return value;
      });
      await this.storage.setItem(SettingsManager.STORAGE_KEY, jsonString);
      this.cachedSettings = cleanedSettings as AppSettings;
      console.log('[SettingsManager] Settings saved successfully');
    } catch (error) {
      console.error('[SettingsManager] Failed to save settings:', error);
      throw error;
    }

    // Apply theme change if theme was updated
    if (updates.theme !== undefined) {
      this.applyThemeChange(updates.theme);
    }
  }

  /**
   * Apply theme change to theme manager
   */
  private applyThemeChange(theme: 'light' | 'dark' | 'system'): void {
    try {
      // Dynamically import to avoid circular dependencies
      import('@/utils/themeManager').then(({ getThemeManager }) => {
        const themeManager = getThemeManager();
        themeManager.setTheme(theme);
      });
    } catch (error) {
      console.error('Failed to apply theme change:', error);
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<void> {
    await this.storage.setItem(SettingsManager.STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    this.cachedSettings = { ...DEFAULT_SETTINGS };
  }

  /**
   * Validate settings
   */
  validateSettings(settings: Partial<AppSettings>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate theme
    if (settings.theme && !['light', 'dark', 'system'].includes(settings.theme)) {
      errors.push({
        field: 'theme',
        message: 'Theme must be "light", "dark", or "system"',
      });
    }

    // Validate defaultView
    if (settings.defaultView && !['grid', 'list'].includes(settings.defaultView)) {
      errors.push({
        field: 'defaultView',
        message: 'Default view must be "grid" or "list"',
      });
    }

    // Validate gridColumns
    if (settings.gridColumns !== undefined) {
      if (settings.gridColumns < 1 || settings.gridColumns > 12) {
        errors.push({
          field: 'gridColumns',
          message: 'Grid columns must be between 1 and 12',
        });
      }
    }

    // Validate thumbnailQuality
    if (
      settings.thumbnailQuality &&
      !['low', 'medium', 'high'].includes(settings.thumbnailQuality)
    ) {
      errors.push({
        field: 'thumbnailQuality',
        message: 'Thumbnail quality must be "low", "medium", or "high"',
      });
    }

    // Validate maxCacheSize
    if (settings.maxCacheSize !== undefined) {
      if (settings.maxCacheSize < 0 || settings.maxCacheSize > 10240) {
        errors.push({
          field: 'maxCacheSize',
          message: 'Max cache size must be between 0 and 10240 MB',
        });
      }
    }

    // Validate cacheRetentionDays
    if (settings.cacheRetentionDays !== undefined) {
      if (settings.cacheRetentionDays < 1 || settings.cacheRetentionDays > 365) {
        errors.push({
          field: 'cacheRetentionDays',
          message: 'Cache retention days must be between 1 and 365',
        });
      }
    }

    // Validate syncInterval
    if (settings.syncInterval !== undefined) {
      if (settings.syncInterval < 1 || settings.syncInterval > 1440) {
        errors.push({
          field: 'syncInterval',
          message: 'Sync interval must be between 1 and 1440 minutes',
        });
      }
    }

    // Validate pageSize
    if (settings.pageSize !== undefined) {
      if (settings.pageSize < 10 || settings.pageSize > 200) {
        errors.push({
          field: 'pageSize',
          message: 'Page size must be between 10 and 200',
        });
      }
    }

    // Validate imagePreloadCount
    if (settings.imagePreloadCount !== undefined) {
      if (settings.imagePreloadCount < 0 || settings.imagePreloadCount > 50) {
        errors.push({
          field: 'imagePreloadCount',
          message: 'Image preload count must be between 0 and 50',
        });
      }
    }

    // Validate metadataSaveMode
    if (
      settings.metadataSaveMode &&
      !['plex', 'local', 'both'].includes(settings.metadataSaveMode)
    ) {
      errors.push({
        field: 'metadataSaveMode',
        message: 'Metadata save mode must be "plex", "local", or "both"',
      });
    }

    // Validate localMetadataFormat
    if (
      settings.localMetadataFormat &&
      !['nfo', 'embedded', 'both'].includes(settings.localMetadataFormat)
    ) {
      errors.push({
        field: 'localMetadataFormat',
        message: 'Local metadata format must be "nfo", "embedded", or "both"',
      });
    }

    // Validate nfoTemplate
    if (settings.nfoTemplate && !['kodi', 'emby', 'custom'].includes(settings.nfoTemplate)) {
      errors.push({
        field: 'nfoTemplate',
        message: 'NFO template must be "kodi", "emby", or "custom"',
      });
    }

    return errors;
  }

  /**
   * Get a single setting
   */
  async getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * Set a single setting
   */
  async setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    await this.updateSettings({ [key]: value } as Partial<AppSettings>);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedSettings = { ...DEFAULT_SETTINGS };
  }
}

/**
 * Create a Settings Manager instance
 */
export function createSettingsManager(useElectronStore = false): SettingsManager {
  return new SettingsManager(useElectronStore);
}

/**
 * Singleton instance for convenience
 */
let settingsManagerInstance: SettingsManager | null = null;

export function getSettingsManager(): SettingsManager {
  if (!settingsManagerInstance) {
    // Detect if running in Electron
    const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;
    settingsManagerInstance = new SettingsManager(isElectron);
  }
  return settingsManagerInstance;
}
