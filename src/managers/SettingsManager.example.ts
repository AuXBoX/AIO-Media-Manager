/**
 * SettingsManager Usage Examples
 * 
 * This file demonstrates how to use the SettingsManager in the application.
 */

import { getSettingsManager, AppSettings } from './SettingsManager';

/**
 * Example 1: Get all settings
 */
async function getAllSettings() {
  const settingsManager = getSettingsManager();
  const settings = await settingsManager.getSettings();
  
  console.log('Current theme:', settings.theme);
  console.log('Default view:', settings.defaultView);
  console.log('Cache enabled:', settings.cacheEnabled);
}

/**
 * Example 2: Update multiple settings
 */
async function updateMultipleSettings() {
  const settingsManager = getSettingsManager();
  
  await settingsManager.updateSettings({
    theme: 'dark',
    defaultView: 'list',
    gridColumns: 6,
    cacheEnabled: true,
    maxCacheSize: 2048,
  });
  
  console.log('Settings updated successfully');
}

/**
 * Example 3: Get a single setting
 */
async function getSingleSetting() {
  const settingsManager = getSettingsManager();
  const theme = await settingsManager.getSetting('theme');
  
  console.log('Current theme:', theme);
}

/**
 * Example 4: Set a single setting
 */
async function setSingleSetting() {
  const settingsManager = getSettingsManager();
  await settingsManager.setSetting('theme', 'light');
  
  console.log('Theme updated to light');
}

/**
 * Example 5: Validate settings before updating
 */
async function validateBeforeUpdate() {
  const settingsManager = getSettingsManager();
  
  const updates: Partial<AppSettings> = {
    gridColumns: 8,
    maxCacheSize: 2048,
    pageSize: 100,
  };
  
  const errors = settingsManager.validateSettings(updates);
  
  if (errors.length > 0) {
    console.error('Validation errors:', errors);
    return;
  }
  
  await settingsManager.updateSettings(updates);
  console.log('Settings updated successfully');
}

/**
 * Example 6: Reset to defaults
 */
async function resetToDefaults() {
  const settingsManager = getSettingsManager();
  await settingsManager.resetSettings();
  
  console.log('Settings reset to defaults');
}

/**
 * Example 7: Handle validation errors
 */
async function handleValidationErrors() {
  const settingsManager = getSettingsManager();
  
  try {
    await settingsManager.updateSettings({
      gridColumns: 20, // Invalid: must be between 1 and 12
      maxCacheSize: -100, // Invalid: must be positive
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
  }
}

/**
 * Example 8: Use in React component
 */
/*
import { useEffect, useState } from 'react';
import { getSettingsManager, AppSettings } from '@/managers';

function SettingsComponent() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const settingsManager = getSettingsManager();

  useEffect(() => {
    settingsManager.getSettings().then(setSettings);
  }, []);

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    await settingsManager.setSetting('theme', theme);
    setSettings(await settingsManager.getSettings());
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div>
      <h2>Settings</h2>
      <select value={settings.theme} onChange={(e) => handleThemeChange(e.target.value as any)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
}
*/

/**
 * Example 9: Use with Zustand store
 */
/*
import { create } from 'zustand';
import { getSettingsManager, AppSettings } from '@/managers';

interface SettingsStore {
  settings: AppSettings | null;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: null,
  
  loadSettings: async () => {
    const settingsManager = getSettingsManager();
    const settings = await settingsManager.getSettings();
    set({ settings });
  },
  
  updateSettings: async (updates) => {
    const settingsManager = getSettingsManager();
    await settingsManager.updateSettings(updates);
    const settings = await settingsManager.getSettings();
    set({ settings });
  },
  
  resetSettings: async () => {
    const settingsManager = getSettingsManager();
    await settingsManager.resetSettings();
    const settings = await settingsManager.getSettings();
    set({ settings });
  },
}));
*/

export {
  getAllSettings,
  updateMultipleSettings,
  getSingleSetting,
  setSingleSetting,
  validateBeforeUpdate,
  resetToDefaults,
  handleValidationErrors,
};
