import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/managers/SettingsManager';

export interface PrivacySettingsProps {
  settings: AppSettings;
  onSave: (updates: Partial<AppSettings>) => Promise<void>;
  saving: boolean;
}

/**
 * PrivacySettings Component
 * UI for privacy and data collection preferences
 */
export const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  settings,
  onSave,
  saving,
}) => {
  const [localSettings, setLocalSettings] = useState({
    analyticsEnabled: settings.analyticsEnabled,
    errorReporting: settings.errorReporting,
    usageStatistics: settings.usageStatistics,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed =
      localSettings.analyticsEnabled !== settings.analyticsEnabled ||
      localSettings.errorReporting !== settings.errorReporting ||
      localSettings.usageStatistics !== settings.usageStatistics;

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
      analyticsEnabled: settings.analyticsEnabled,
      errorReporting: settings.errorReporting,
      usageStatistics: settings.usageStatistics,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Privacy Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Control what data is collected and shared
        </p>
      </div>

      {/* Analytics */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="analyticsEnabled"
            checked={localSettings.analyticsEnabled}
            onChange={(e) => handleChange('analyticsEnabled', e.target.checked)}
            className="mt-1 mr-3"
          />
          <div className="flex-1">
            <label
              htmlFor="analyticsEnabled"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Enable Analytics
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Help improve the application by sending anonymous usage analytics. This includes
              feature usage, performance metrics, and general application behavior.
            </p>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <strong>Data collected:</strong> Feature usage, page views, session duration
            </div>
          </div>
        </div>
      </div>

      {/* Error Reporting */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="errorReporting"
            checked={localSettings.errorReporting}
            onChange={(e) => handleChange('errorReporting', e.target.checked)}
            className="mt-1 mr-3"
          />
          <div className="flex-1">
            <label
              htmlFor="errorReporting"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Enable Error Reporting
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Automatically send error reports when the application crashes or encounters
              problems. This helps us identify and fix bugs quickly.
            </p>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <strong>Data collected:</strong> Error messages, stack traces, application state
            </div>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="usageStatistics"
            checked={localSettings.usageStatistics}
            onChange={(e) => handleChange('usageStatistics', e.target.checked)}
            className="mt-1 mr-3"
          />
          <div className="flex-1">
            <label
              htmlFor="usageStatistics"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Share Usage Statistics
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Share aggregated usage statistics to help us understand how the application is
              used and prioritize new features.
            </p>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <strong>Data collected:</strong> Library sizes, operation counts, feature adoption
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          🔒 Your Privacy Matters
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              All data collection is <strong>optional</strong> and can be disabled at any time
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              We <strong>never</strong> collect personal information, passwords, or media content
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              All collected data is <strong>anonymized</strong> and aggregated
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              Data is used <strong>only</strong> to improve the application
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              We <strong>never</strong> sell or share your data with third parties
            </span>
          </li>
        </ul>
      </div>

      {/* Recommended Settings */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          💡 Recommended Settings
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          We recommend enabling <strong>Error Reporting</strong> to help us identify and fix
          bugs that may affect your experience. Analytics and usage statistics are optional and
          help us prioritize features.
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
