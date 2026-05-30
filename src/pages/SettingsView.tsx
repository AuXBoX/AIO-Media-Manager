import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { PageLoadingState } from '@/components/ui/LoadingState';
import { getSettingsManager, AppSettings } from '@/managers/SettingsManager';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { CacheSettings } from '@/components/settings/CacheSettings';
import { LocalMetadataSettings } from '@/components/local-metadata/LocalMetadataSettings';
import { PerformanceSettings } from '@/components/settings/PerformanceSettings';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { APIKeysSettings } from '@/components/settings/APIKeysSettings';
import { BinarySettings } from '@/components/settings/BinarySettings';
import { useAppStore } from '@/store/appStore';

type SettingsTab = 'general' | 'apikeys' | 'binaries' | 'cache' | 'metadata' | 'performance' | 'privacy';

/**
 * Logout Button - small inline component for settings sidebar
 */
function LogoutButton() {
  const { clearAuthentication, currentUser } = useAppStore();
  
  const handleLogout = () => {
    clearAuthentication();
  };

  return (
    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
      {currentUser && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-1">
          Signed in as <span className="font-medium">{currentUser.username}</span>
        </p>
      )}
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </button>
    </div>
  );
}

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
    return <PageLoadingState message="Loading settings..." />;
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Failed to load settings</p>
          <Button onClick={loadSettings} variant="primary" className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 bg-background-primary overflow-y-auto">
      {/* Header / Toolbar with Glass Effect */}
      <div className="sticky top-0 z-50 h-16 bg-white/75 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-full flex flex-col justify-center">
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">Settings</h1>
          <p className="text-sm text-text-tertiary">
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
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Reset Button */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <Button
                variant="secondary"
                onClick={handleReset}
                disabled={saving}
                className="w-full !text-red-700 dark:!text-red-400 !bg-red-50 dark:!bg-red-900/20 !border-red-200 dark:!border-red-800 hover:!bg-red-100 dark:hover:!bg-red-900/30"
              >
                Reset to Defaults
              </Button>
              <LogoutButton />
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

