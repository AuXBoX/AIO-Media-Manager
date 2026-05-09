import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SettingsManager,
  AppSettings,
  DEFAULT_SETTINGS,
  ValidationError,
  createSettingsManager,
  getSettingsManager,
} from './SettingsManager';

describe('SettingsManager', () => {
  let manager: SettingsManager;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    manager = new SettingsManager(false);
  });

  describe('getSettings', () => {
    it('should return default settings when no settings are stored', async () => {
      const settings = await manager.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should return stored settings', async () => {
      const customSettings: Partial<AppSettings> = {
        theme: 'dark',
        defaultView: 'list',
        gridColumns: 6,
      };

      await manager.updateSettings(customSettings);
      const settings = await manager.getSettings();

      expect(settings.theme).toBe('dark');
      expect(settings.defaultView).toBe('list');
      expect(settings.gridColumns).toBe(6);
    });

    it('should merge stored settings with defaults', async () => {
      // Store partial settings
      localStorage.setItem(
        'aio-media-manager-settings',
        JSON.stringify({ theme: 'dark' })
      );

      const settings = await manager.getSettings();

      expect(settings.theme).toBe('dark');
      expect(settings.defaultView).toBe(DEFAULT_SETTINGS.defaultView);
      expect(settings.cacheEnabled).toBe(DEFAULT_SETTINGS.cacheEnabled);
    });

    it('should handle corrupted stored data', async () => {
      localStorage.setItem('aio-media-manager-settings', 'invalid json');

      const settings = await manager.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should cache settings after first load', async () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem');

      await manager.getSettings();
      await manager.getSettings();

      // Should only call getItem once due to caching
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSettings', () => {
    it('should update settings', async () => {
      await manager.updateSettings({ theme: 'dark', gridColumns: 8 });

      const settings = await manager.getSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.gridColumns).toBe(8);
    });

    it('should persist settings to storage', async () => {
      await manager.updateSettings({ theme: 'light' });

      const stored = localStorage.getItem('aio-media-manager-settings');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.theme).toBe('light');
    });

    it('should merge updates with existing settings', async () => {
      await manager.updateSettings({ theme: 'dark' });
      await manager.updateSettings({ gridColumns: 6 });

      const settings = await manager.getSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.gridColumns).toBe(6);
    });

    it('should throw error for invalid settings', async () => {
      await expect(
        manager.updateSettings({ gridColumns: 20 } as any)
      ).rejects.toThrow('Validation failed');
    });

    it('should update cache after update', async () => {
      await manager.getSettings(); // Load cache
      await manager.updateSettings({ theme: 'dark' });

      const settings = await manager.getSettings();
      expect(settings.theme).toBe('dark');
    });
  });

  describe('resetSettings', () => {
    it('should reset settings to defaults', async () => {
      await manager.updateSettings({ theme: 'dark', gridColumns: 8 });
      await manager.resetSettings();

      const settings = await manager.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should clear stored settings', async () => {
      await manager.updateSettings({ theme: 'dark' });
      await manager.resetSettings();

      const stored = localStorage.getItem('aio-media-manager-settings');
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('validateSettings', () => {
    it('should validate theme', () => {
      const errors = manager.validateSettings({ theme: 'invalid' as any });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('theme');
    });

    it('should validate defaultView', () => {
      const errors = manager.validateSettings({ defaultView: 'invalid' as any });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('defaultView');
    });

    it('should validate gridColumns range', () => {
      let errors = manager.validateSettings({ gridColumns: 0 });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('gridColumns');

      errors = manager.validateSettings({ gridColumns: 13 });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('gridColumns');

      errors = manager.validateSettings({ gridColumns: 6 });
      expect(errors).toHaveLength(0);
    });

    it('should validate thumbnailQuality', () => {
      const errors = manager.validateSettings({ thumbnailQuality: 'ultra' as any });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('thumbnailQuality');
    });

    it('should validate maxCacheSize range', () => {
      let errors = manager.validateSettings({ maxCacheSize: -1 });
      expect(errors).toHaveLength(1);

      errors = manager.validateSettings({ maxCacheSize: 20000 });
      expect(errors).toHaveLength(1);

      errors = manager.validateSettings({ maxCacheSize: 1024 });
      expect(errors).toHaveLength(0);
    });

    it('should validate cacheRetentionDays range', () => {
      let errors = manager.validateSettings({ cacheRetentionDays: 0 });
      expect(errors).toHaveLength(1);

      errors = manager.validateSettings({ cacheRetentionDays: 400 });
      expect(errors).toHaveLength(1);

      errors = manager.validateSettings({ cacheRetentionDays: 30 });
      expect(errors).toHaveLength(0);
    });

    it('should validate syncInterval range', () => {
      let errors = manager.validateSettings({ syncInterval: 0 });
      expect(errors).toHaveLength(1);

      errors = manager.validateSettings({ syncInterval: 2000 });
      expect(errors).toHaveLength(1);

      errors = manager.validateSettings({ syncInterval: 15 });
      expect(errors).toHaveLength(0);
    });

    it('should validate pageSize range', () => {
      let errors = manager.validateSettings({ pageSize: 5 });
      expect(errors).toHaveLength(1);

      errors = manager.validateSettings({ pageSize: 300 });
      expect(errors).toHaveLength(1);

      errors = manager.validateSettings({ pageSize: 50 });
      expect(errors).toHaveLength(0);
    });

    it('should validate imagePreloadCount range', () => {
      let errors = manager.validateSettings({ imagePreloadCount: -1 });
      expect(errors).toHaveLength(1);

      errors = manager.validateSettings({ imagePreloadCount: 100 });
      expect(errors).toHaveLength(1);

      errors = manager.validateSettings({ imagePreloadCount: 10 });
      expect(errors).toHaveLength(0);
    });

    it('should validate metadataSaveMode', () => {
      const errors = manager.validateSettings({ metadataSaveMode: 'invalid' as any });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('metadataSaveMode');
    });

    it('should validate localMetadataFormat', () => {
      const errors = manager.validateSettings({ localMetadataFormat: 'invalid' as any });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('localMetadataFormat');
    });

    it('should validate nfoTemplate', () => {
      const errors = manager.validateSettings({ nfoTemplate: 'invalid' as any });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('nfoTemplate');
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const errors = manager.validateSettings({
        theme: 'invalid' as any,
        gridColumns: 20,
        maxCacheSize: -1,
      });

      expect(errors.length).toBeGreaterThan(1);
    });

    it('should return empty array for valid settings', () => {
      const errors = manager.validateSettings({
        theme: 'dark',
        gridColumns: 6,
        maxCacheSize: 2048,
        cacheRetentionDays: 30,
      });

      expect(errors).toHaveLength(0);
    });
  });

  describe('getSetting', () => {
    it('should get a single setting', async () => {
      await manager.updateSettings({ theme: 'dark' });

      const theme = await manager.getSetting('theme');
      expect(theme).toBe('dark');
    });

    it('should get default value for unset setting', async () => {
      const theme = await manager.getSetting('theme');
      expect(theme).toBe(DEFAULT_SETTINGS.theme);
    });
  });

  describe('setSetting', () => {
    it('should set a single setting', async () => {
      await manager.setSetting('theme', 'dark');

      const settings = await manager.getSettings();
      expect(settings.theme).toBe('dark');
    });

    it('should validate single setting', async () => {
      await expect(manager.setSetting('gridColumns', 20)).rejects.toThrow();
    });
  });

  describe('clearCache', () => {
    it('should clear cached settings', async () => {
      await manager.getSettings(); // Load cache
      manager.clearCache();

      const spy = vi.spyOn(Storage.prototype, 'getItem');
      await manager.getSettings();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('ElectronStoreAdapter', () => {
    it('should use ElectronStoreAdapter when useElectronStore is true', async () => {
      const electronManager = new SettingsManager(true);
      
      // Should still work (falls back to localStorage for now)
      const settings = await electronManager.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should persist settings with ElectronStoreAdapter', async () => {
      const electronManager = new SettingsManager(true);
      
      await electronManager.updateSettings({ theme: 'dark' });
      const settings = await electronManager.getSettings();
      
      expect(settings.theme).toBe('dark');
    });
  });
});

describe('Factory Functions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('createSettingsManager', () => {
    it('should create a new SettingsManager instance', () => {
      const manager = createSettingsManager();
      expect(manager).toBeInstanceOf(SettingsManager);
    });

    it('should create SettingsManager with electron store when specified', () => {
      const manager = createSettingsManager(true);
      expect(manager).toBeInstanceOf(SettingsManager);
    });
  });

  describe('getSettingsManager', () => {
    it('should return a singleton instance', () => {
      const manager1 = getSettingsManager();
      const manager2 = getSettingsManager();
      
      expect(manager1).toBe(manager2);
    });

    it('should detect Electron environment', () => {
      // Mock window.electron
      const originalWindow = global.window;
      (global as any).window = { electron: {} };
      
      const manager = getSettingsManager();
      expect(manager).toBeInstanceOf(SettingsManager);
      
      // Restore
      (global as any).window = originalWindow;
    });
  });
});
