import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/managers/SettingsManager';
import { Button } from '@/components/ui/Button';

export interface PerformanceSettingsProps {
  settings: AppSettings;
  onSave: (updates: Partial<AppSettings>) => Promise<void>;
  saving: boolean;
}

/**
 * PerformanceSettings Component
 * UI for performance-related configuration
 */
export const PerformanceSettings: React.FC<PerformanceSettingsProps> = ({
  settings,
  onSave,
  saving,
}) => {
  const [localSettings, setLocalSettings] = useState({
    pageSize: settings.pageSize,
    imagePreloadCount: settings.imagePreloadCount,
    enableLazyLoading: settings.enableLazyLoading,
    enableVirtualScrolling: settings.enableVirtualScrolling,
    imageQuality: settings.imageQuality,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed =
      localSettings.pageSize !== settings.pageSize ||
      localSettings.imagePreloadCount !== settings.imagePreloadCount ||
      localSettings.enableLazyLoading !== settings.enableLazyLoading ||
      localSettings.enableVirtualScrolling !== settings.enableVirtualScrolling ||
      localSettings.imageQuality !== settings.imageQuality;

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
      pageSize: settings.pageSize,
      imagePreloadCount: settings.imagePreloadCount,
      enableLazyLoading: settings.enableLazyLoading,
      enableVirtualScrolling: settings.enableVirtualScrolling,
      imageQuality: settings.imageQuality,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Performance Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Optimize application performance for your device
        </p>
      </div>

      {/* Page Size */}
      <div>
        <label
          htmlFor="pageSize"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Items Per Page: {localSettings.pageSize}
        </label>
        <input
          type="range"
          id="pageSize"
          min="10"
          max="200"
          step="10"
          value={localSettings.pageSize}
          onChange={(e) => handleChange('pageSize', parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>10 items</span>
          <span>200 items</span>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Number of items to load per page. Lower values improve initial load time.
        </p>
      </div>

      {/* Image Quality */}
      <div>
        <label
          htmlFor="imageQuality"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Image Quality
        </label>
        <select
          id="imageQuality"
          value={localSettings.imageQuality}
          onChange={(e) => handleChange('imageQuality', e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="low">Low (Fastest, less bandwidth)</option>
          <option value="medium">Medium (Balanced)</option>
          <option value="high">High (Best quality, more bandwidth)</option>
        </select>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Quality of images loaded from the server
        </p>
      </div>

      {/* Image Preload Count */}
      <div>
        <label
          htmlFor="imagePreloadCount"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Image Preload Count: {localSettings.imagePreloadCount}
        </label>
        <input
          type="range"
          id="imagePreloadCount"
          min="0"
          max="50"
          step="5"
          value={localSettings.imagePreloadCount}
          onChange={(e) => handleChange('imagePreloadCount', parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>None</span>
          <span>50 images</span>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Number of images to preload ahead of the current view. Higher values use more memory.
        </p>
      </div>

      {/* Lazy Loading */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="enableLazyLoading"
            checked={localSettings.enableLazyLoading}
            onChange={(e) => handleChange('enableLazyLoading', e.target.checked)}
            className="mt-1 mr-3"
          />
          <div>
            <label
              htmlFor="enableLazyLoading"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Enable Lazy Loading
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Load images only when they become visible. Improves initial page load time.
            </p>
          </div>
        </div>
      </div>

      {/* Virtual Scrolling */}
      <div>
        <div className="flex items-start">
          <input
            type="checkbox"
            id="enableVirtualScrolling"
            checked={localSettings.enableVirtualScrolling}
            onChange={(e) => handleChange('enableVirtualScrolling', e.target.checked)}
            className="mt-1 mr-3"
          />
          <div>
            <label
              htmlFor="enableVirtualScrolling"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Enable Virtual Scrolling
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Render only visible items in large lists. Significantly improves performance for
              large libraries.
            </p>
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          💡 Performance Tips
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Lower page size for faster initial loads</li>
          <li>Enable lazy loading and virtual scrolling for large libraries</li>
          <li>Use lower image quality on slower connections</li>
          <li>Reduce image preload count if experiencing memory issues</li>
        </ul>
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
