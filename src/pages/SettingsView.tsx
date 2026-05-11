import React, { useState, useEffect } from 'react';
import { getSettingsManager, AppSettings } from '@/managers/SettingsManager';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { CacheSettings } from '@/components/settings/CacheSettings';
import { LocalMetadataSettings } from '@/components/local-metadata/LocalMetadataSettings';
import { PerformanceSettings } from '@/components/settings/PerformanceSettings';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { APIKeysSettings } from '@/components/settings/APIKeysSettings';
import { BinarySettings } from '@/components/settings/BinarySettings';

type SettingsTab = 'general' | 'apikeys' | 'binaries' | 'cache' | 'metadata' | 'performance' | 'privacy';

/**
 * SettingsView Component
 * Main settings page with tabbed interface for different setting categories
 */
export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const settingsManager = getSettingsManager();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedSettings = await settingsManager.getSettings();
      setSettings(loadedSettings);
    } catch (err) {
      setError('Failed to load settings');
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<AppSettings>) => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      await settingsManager.updateSettings(updates);
      const updatedSettings = await settingsManager.getSettings();
      setSettings(updatedSettings);

      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      await settingsManager.resetSettings();
      const resetSettings = await settingsManager.getSettings();
      setSettings(resetSettings);

      setSuccessMessage('Settings reset to defaults');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to reset settings');
      console.error('Failed to reset settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'apikeys', label: 'API Keys' },
    { id: 'binaries', label: 'Binaries' },
    { id: 'cache', label: 'Cache & Offline' },
    { id: 'metadata', label: 'Local Metadata' },
    { id: 'performance', label: 'Performance' },
    { id: 'privacy', label: 'Privacy' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Failed to load settings</p>
          <button
            onClick={loadSettings}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage your application preferences and configuration
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Reset Button */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleReset}
                disabled={saving}
                className="w-full px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {activeTab === 'general' && (
                <GeneralSettings
                  settings={settings}
                  onSave={handleSave}
                  saving={saving}
                />
              )}

              {activeTab === 'apikeys' && (
                <APIKeysSettings
                  settings={settings}
                  onSave={handleSave}
                  saving={saving}
                />
              )}

              {activeTab === 'binaries' && (
                <BinarySettings
                  saving={saving}
                />
              )}

              {activeTab === 'cache' && (
                <CacheSettings
                  settings={settings}
                  onSave={handleSave}
                  saving={saving}
                />
              )}

              {activeTab === 'metadata' && (
                <LocalMetadataSettings
                  initialSettings={{
                    saveMode: settings.metadataSaveMode,
                    localFormat: settings.localMetadataFormat,
                    createBackups: settings.createNfoBackups,
                    nfoTemplate: settings.nfoTemplate,
                    autoSync: settings.autoSyncLocalChanges,
                  }}
                  onSave={(localSettings) => {
                    handleSave({
                      metadataSaveMode: localSettings.saveMode,
                      localMetadataFormat: localSettings.localFormat,
                      createNfoBackups: localSettings.createBackups,
                      nfoTemplate: localSettings.nfoTemplate,
                      autoSyncLocalChanges: localSettings.autoSync,
                    });
                  }}
                />
              )}

              {activeTab === 'performance' && (
                <PerformanceSettings
                  settings={settings}
                  onSave={handleSave}
                  saving={saving}
                />
              )}

              {activeTab === 'privacy' && (
                <PrivacySettings
                  settings={settings}
                  onSave={handleSave}
                  saving={saving}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;

