import React, { useState } from 'react';

export interface LocalMetadataSettingsProps {
  onSave: (settings: LocalMetadataSettingsState) => void;
  initialSettings?: LocalMetadataSettingsState;
}

export interface LocalMetadataSettingsState {
  saveMode: 'plex' | 'local' | 'both';
  localFormat: 'nfo' | 'embedded' | 'both';
  nfoTemplate: 'kodi' | 'emby' | 'custom';
  createBackups: boolean;
  autoSyncLocalChanges?: boolean; // Optional for backward compatibility
  autoSync?: boolean; // Alternative name used by SettingsView
}

/**
 * LocalMetadataSettings Component
 * 
 * Provides UI for configuring local metadata save options:
 * - Save mode selector (Plex/Local/Both)
 * - Format selector (NFO/Embedded/Both)
 * - NFO template selector
 * - Backup and auto-sync options
 */
export const LocalMetadataSettings: React.FC<LocalMetadataSettingsProps> = ({
  onSave,
  initialSettings,
}) => {
  const [settings, setSettings] = useState<LocalMetadataSettingsState>(
    initialSettings || {
      saveMode: 'plex',
      localFormat: 'nfo',
      nfoTemplate: 'kodi',
      createBackups: true,
      autoSyncLocalChanges: false,
    }
  );

  const handleSave = () => {
    onSave(settings);
  };

  const updateSetting = <K extends keyof LocalMetadataSettingsState>(
    key: K,
    value: LocalMetadataSettingsState[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Local Metadata Settings
      </h2>

      {/* Save Mode Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Save Mode
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="saveMode"
              value="plex"
              checked={settings.saveMode === 'plex'}
              onChange={(e) => updateSetting('saveMode', e.target.value as any)}
              className="mr-2"
            />
            <span className="text-gray-900 dark:text-gray-100">
              Plex Only - Save metadata only to Plex server
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="saveMode"
              value="local"
              checked={settings.saveMode === 'local'}
              onChange={(e) => updateSetting('saveMode', e.target.value as any)}
              className="mr-2"
            />
            <span className="text-gray-900 dark:text-gray-100">
              Local Only - Save metadata only to local files
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="saveMode"
              value="both"
              checked={settings.saveMode === 'both'}
              onChange={(e) => updateSetting('saveMode', e.target.value as any)}
              className="mr-2"
            />
            <span className="text-gray-900 dark:text-gray-100">
              Both - Save metadata to both Plex and local files
            </span>
          </label>
        </div>
      </div>

      {/* Local Format Selector (only shown when local or both is selected) */}
      {(settings.saveMode === 'local' || settings.saveMode === 'both') && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Local Format
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="localFormat"
                value="nfo"
                checked={settings.localFormat === 'nfo'}
                onChange={(e) => updateSetting('localFormat', e.target.value as any)}
                className="mr-2"
              />
              <span className="text-gray-900 dark:text-gray-100">
                NFO Files - Kodi/Emby compatible XML files
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="localFormat"
                value="embedded"
                checked={settings.localFormat === 'embedded'}
                onChange={(e) => updateSetting('localFormat', e.target.value as any)}
                className="mr-2"
              />
              <span className="text-gray-900 dark:text-gray-100">
                Embedded Tags - ID3/MP4 tags in media files
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="localFormat"
                value="both"
                checked={settings.localFormat === 'both'}
                onChange={(e) => updateSetting('localFormat', e.target.value as any)}
                className="mr-2"
              />
              <span className="text-gray-900 dark:text-gray-100">
                Both - NFO files and embedded tags
              </span>
            </label>
          </div>
        </div>
      )}

      {/* NFO Template Selector (only shown when NFO format is selected) */}
      {(settings.saveMode === 'local' || settings.saveMode === 'both') &&
        (settings.localFormat === 'nfo' || settings.localFormat === 'both') && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              NFO Template
            </label>
            <select
              value={settings.nfoTemplate}
              onChange={(e) => updateSetting('nfoTemplate', e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="kodi">Kodi (Default)</option>
              <option value="emby">Emby</option>
              <option value="custom">Custom</option>
            </select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Choose the NFO format compatible with your media center software
            </p>
          </div>
        )}

      {/* Backup Option */}
      {(settings.saveMode === 'local' || settings.saveMode === 'both') && (
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.createBackups}
              onChange={(e) => updateSetting('createBackups', e.target.checked)}
              className="mr-2"
            />
            <span className="text-gray-900 dark:text-gray-100">
              Create backups before overwriting existing files
            </span>
          </label>
          <p className="mt-1 ml-6 text-sm text-gray-500 dark:text-gray-400">
            Backup files will be saved with a timestamp suffix (.bak)
          </p>
        </div>
      )}

      {/* Auto-sync Option */}
      {(settings.saveMode === 'local' || settings.saveMode === 'both') && (
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.autoSyncLocalChanges}
              onChange={(e) => updateSetting('autoSyncLocalChanges', e.target.checked)}
              className="mr-2"
            />
            <span className="text-gray-900 dark:text-gray-100">
              Automatically sync local changes to Plex
            </span>
          </label>
          <p className="mt-1 ml-6 text-sm text-gray-500 dark:text-gray-400">
            When enabled, changes detected in local files will be synced to Plex automatically
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};
