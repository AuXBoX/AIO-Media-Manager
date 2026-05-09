/**
 * ThemeToggle Component
 * UI component for switching between theme modes
 */

import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { ThemeMode, THEME_LABELS, THEME_ICONS } from '@/config/theme';

/**
 * ThemeToggle Props
 */
export interface ThemeToggleProps {
  /**
   * Display variant
   */
  variant?: 'dropdown' | 'buttons' | 'icon';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show labels (for button variant)
   */
  showLabels?: boolean;
}

/**
 * ThemeToggle Component
 * Provides UI for switching between light, dark, and system themes
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'dropdown',
  className = '',
  showLabels = true,
}) => {
  const { themeMode, setTheme } = useTheme();

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
  };

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <label htmlFor="theme-select" className="sr-only">
          Select theme
        </label>
        <select
          id="theme-select"
          value={themeMode}
          onChange={(e) => handleThemeChange(e.target.value as ThemeMode)}
          className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:text-white transition-colors"
        >
          <option value="light">{THEME_ICONS.light} {THEME_LABELS.light}</option>
          <option value="dark">{THEME_ICONS.dark} {THEME_LABELS.dark}</option>
          <option value="system">{THEME_ICONS.system} {THEME_LABELS.system}</option>
        </select>
      </div>
    );
  }

  // Button group variant
  if (variant === 'buttons') {
    const themes: ThemeMode[] = ['light', 'dark', 'system'];

    return (
      <div className={`inline-flex rounded-lg border border-gray-300 dark:border-gray-600 ${className}`}>
        {themes.map((mode) => (
          <button
            key={mode}
            onClick={() => handleThemeChange(mode)}
            className={`px-4 py-2 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
              themeMode === mode
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            aria-label={`Switch to ${THEME_LABELS[mode]} theme`}
            aria-pressed={themeMode === mode}
          >
            <span className="mr-2">{THEME_ICONS[mode]}</span>
            {showLabels && THEME_LABELS[mode]}
          </button>
        ))}
      </div>
    );
  }

  // Icon-only variant (cycles through themes)
  const getNextTheme = (): ThemeMode => {
    if (themeMode === 'light') return 'dark';
    if (themeMode === 'dark') return 'system';
    return 'light';
  };

  return (
    <button
      onClick={() => handleThemeChange(getNextTheme())}
      className={`p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${className}`}
      aria-label={`Current theme: ${THEME_LABELS[themeMode]}. Click to change.`}
      title={`Current: ${THEME_LABELS[themeMode]}`}
    >
      <span className="text-2xl" role="img" aria-hidden="true">
        {THEME_ICONS[themeMode]}
      </span>
    </button>
  );
};
