import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/managers/SettingsManager';

export interface GeneralSettingsProps {
  settings: AppSettings;
  onSave: (updates: Partial<AppSettings>) => Promise<void>;
  saving: boolean;
}

/**
 * GeneralSettings Component
 * UI for general application preferences (theme, language, view mode)
 */
export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  settings,
  onSave,
  saving,
}) => {
  const [localSettings, setLocalSettings] = useState({
    theme: settings.theme,
    language: settings.language,
    defaultView: settings.defaultView,
    gridColumns: settings.gridColumns,
    thumbnailQuality: settings.thumbnailQuality,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed =
      localSettings.theme !== settings.theme ||
      localSettings.language !== settings.language ||
      localSettings.defaultView !== settings.defaultView ||
      localSettings.gridColumns !== settings.gridColumns ||
      localSettings.thumbnailQuality !== settings.thumbnailQuality;

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
      theme: settings.theme,
      language: settings.language,
      defaultView: settings.defaultView,
      gridColumns: settings.gridColumns,
      thumbnailQuality: settings.thumbnailQuality,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          General Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure basic application preferences
        </p>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Theme
        </label>
        <div className="space-y-2">
          {[
            { value: 'light', label: 'Light', description: 'Light color scheme' },
            { value: 'dark', label: 'Dark', description: 'Dark color scheme' },
            { value: 'system', label: 'System', description: 'Follow system preference' },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-start p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={localSettings.theme === option.value}
                onChange={(e) => handleChange('theme', e.target.value as any)}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {option.label}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <label
          htmlFor="language"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Language
        </label>
        <select
          id="language"
          value={localSettings.language}
          onChange={(e) => handleChange('language', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="it">Italiano</option>
          <option value="pt">Português</option>
          <option value="ja">日本語</option>
          <option value="zh">中文</option>
        </select>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Select your preferred language
        </p>
      </div>

      {/* Default View */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Default View Mode
        </label>
        <div className="flex gap-4">
          <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-1">
            <input
              type="radio"
              name="defaultView"
              value="grid"
              checked={localSettings.defaultView === 'grid'}
              onChange={(e) => handleChange('defaultView', e.target.value as any)}
              className="mr-3"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Grid</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Display items in a grid
              </div>
            </div>
          </label>

          <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-1">
            <input
              type="radio"
              name="defaultView"
              value="list"
              checked={localSettings.defaultView === 'list'}
              onChange={(e) => handleChange('defaultView', e.target.value as any)}
              className="mr-3"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">List</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Display items in a list
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Grid Columns */}
      {localSettings.defaultView === 'grid' && (
        <div>
          <label
            htmlFor="gridColumns"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Grid Columns: {localSettings.gridColumns}
          </label>
          <input
            type="range"
            id="gridColumns"
            min="2"
            max="8"
            value={localSettings.gridColumns}
            onChange={(e) => handleChange('gridColumns', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>2 columns</span>
            <span>8 columns</span>
          </div>
        </div>
      )}

      {/* Thumbnail Quality */}
      <div>
        <label
          htmlFor="thumbnailQuality"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Thumbnail Quality
        </label>
        <select
          id="thumbnailQuality"
          value={localSettings.thumbnailQuality}
          onChange={(e) => handleChange('thumbnailQuality', e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="low">Low (Faster loading)</option>
          <option value="medium">Medium (Balanced)</option>
          <option value="high">High (Best quality)</option>
        </select>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Higher quality uses more bandwidth and storage
        </p>
      </div>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
