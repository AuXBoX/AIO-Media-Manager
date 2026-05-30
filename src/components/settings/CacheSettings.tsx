import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/managers/SettingsManager';
import { Button } from '@/components/ui/Button';

export interface CacheSettingsProps {
  settings: AppSettings;
  onSave: (updates: Partial<AppSettings>) => Promise<void>;
  saving: boolean;
}

/**
 * CacheSettings Component
 * UI for cache and offline mode configuration
 */
export const CacheSettings: React.FC<CacheSettingsProps> = ({
  settings,
  onSave,
  saving,
}) => {
  const [localSettings, setLocalSettings] = useState({
    cacheEnabled: settings.cacheEnabled,
    maxCacheSize: settings.maxCacheSize,
    cacheRetentionDays: settings.cacheRetentionDays,
    autoSync: settings.autoSync,
    syncInterval: settings.syncInterval,
    offlineModeEnabled: settings.offlineModeEnabled,
    autoClearInterval: settings.autoClearInterval,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed =
      localSettings.cacheEnabled !== settings.cacheEnabled ||
      localSettings.maxCacheSize !== settings.maxCacheSize ||
      localSettings.cacheRetentionDays !== settings.cacheRetentionDays ||
      localSettings.autoSync !== settings.autoSync ||
      localSettings.syncInterval !== settings.syncInterval ||
      localSettings.offlineModeEnabled !== settings.offlineModeEnabled ||
      localSettings.autoClearInterval !== settings.autoClearInterval;

    setHasChanges(changed);
  }, [localSettings, settings]);

  const handleChange = <K extends keyof typeof localSettings>(
    key: K,
    value: (typeof localSettings)[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    await onSave(localSettings);
  };

  const handleCancel = () => {
    setLocalSettings({
      cacheEnabled: settings.cacheEnabled,
      maxCacheSize: settings.maxCacheSize,
      cacheRetentionDays: settings.cacheRetentionDays,
      autoSync: settings.autoSync,
      syncInterval: settings.syncInterval,
      offlineModeEnabled: settings.offlineModeEnabled,
      autoClearInterval: settings.autoClearInterval,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Cache & Offline Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure caching and offline mode behavior
        </p>
      </div>

      {/* Enable Cache */}
      <div className="flex items-start">
        <input
          type="checkbox"
          id="cacheEnabled"
          checked={localSettings.cacheEnabled}
          onChange={(e) => handleChange('cacheEnabled', e.target.checked)}
          className="mt-1 mr-3"
        />
        <div>
          <label
            htmlFor="cacheEnabled"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Enable Caching
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Store metadata and images locally for faster access and offline use
          </p>
        </div>
      </div>

      {localSettings.cacheEnabled && (
        <>
          {/* Max Cache Size */}
          <div>
            <label
              htmlFor="maxCacheSize"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Maximum Cache Size: {localSettings.maxCacheSize} MB
            </label>
            <input
              type="range"
              id="maxCacheSize"
              min="100"
              max="10240"
              step="100"
              value={localSettings.maxCacheSize}
              onChange={(e) => handleChange('maxCacheSize', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>100 MB</span>
              <span>10 GB</span>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Maximum amount of disk space to use for cache
            </p>
          </div>

          {/* Cache Retention */}
          <div>
            <label
              htmlFor="cacheRetentionDays"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Cache Retention: {localSettings.cacheRetentionDays} days
            </label>
            <input
              type="range"
              id="cacheRetentionDays"
              min="1"
              max="90"
              value={localSettings.cacheRetentionDays}
              onChange={(e) => handleChange('cacheRetentionDays', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>1 day</span>
              <span>90 days</span>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              How long to keep cached data before automatic cleanup
            </p>
          </div>

          {/* Auto Clear Interval */}
          <div>
            <label
              htmlFor="autoClearInterval"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Auto-Clear Interval: Every {localSettings.autoClearInterval} days
            </label>
            <input
              type="range"
              id="autoClearInterval"
              min="1"
              max="30"
              value={localSettings.autoClearInterval}
              onChange={(e) => handleChange('autoClearInterval', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Daily</span>
              <span>Monthly</span>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Automatically clear old cache entries at this interval
            </p>
          </div>
        </>
      )}

      {/* Offline Mode */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-start mb-4">
          <input
            type="checkbox"
            id="offlineModeEnabled"
            checked={localSettings.offlineModeEnabled}
            onChange={(e) => handleChange('offlineModeEnabled', e.target.checked)}
            className="mt-1 mr-3"
          />
          <div>
            <label
              htmlFor="offlineModeEnabled"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Enable Offline Mode
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Allow browsing and editing metadata when server is unavailable
            </p>
          </div>
        </div>

        {localSettings.offlineModeEnabled && (
          <>
            {/* Auto Sync */}
            <div className="flex items-start mb-4">
              <input
                type="checkbox"
                id="autoSync"
                checked={localSettings.autoSync}
                onChange={(e) => handleChange('autoSync', e.target.checked)}
                className="mt-1 mr-3"
              />
              <div>
                <label
                  htmlFor="autoSync"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Automatic Synchronization
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Automatically sync offline changes when server becomes available
                </p>
              </div>
            </div>

            {/* Sync Interval */}
            {localSettings.autoSync && (
              <div>
                <label
                  htmlFor="syncInterval"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Sync Interval: Every {localSettings.syncInterval} minutes
                </label>
                <input
                  type="range"
                  id="syncInterval"
                  min="5"
                  max="120"
                  step="5"
                  value={localSettings.syncInterval}
                  onChange={(e) => handleChange('syncInterval', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>5 min</span>
                  <span>2 hours</span>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  How often to check for and sync offline changes
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="secondary" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};
