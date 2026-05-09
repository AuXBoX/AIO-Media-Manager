/**
 * Theme Configuration
 * Defines theme types, constants, and utilities for the theme system
 */

/**
 * Available theme modes
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Resolved theme (after system preference detection)
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Theme configuration constants
 */
export const THEME_CONFIG = {
  /**
   * Storage key for theme preference
   */
  STORAGE_KEY: 'aio-media-manager-theme',

  /**
   * CSS class applied to document element for dark mode
   */
  DARK_CLASS: 'dark',

  /**
   * Default theme mode
   */
  DEFAULT_THEME: 'system' as ThemeMode,

  /**
   * Media query for system dark mode preference
   */
  MEDIA_QUERY: '(prefers-color-scheme: dark)',
} as const;

/**
 * Theme labels for UI display
 */
export const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

/**
 * Theme icons for UI display
 */
export const THEME_ICONS: Record<ThemeMode, string> = {
  light: '☀️',
  dark: '🌙',
  system: '💻',
};

/**
 * Validate theme mode
 */
export function isValidThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Get system theme preference
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia(THEME_CONFIG.MEDIA_QUERY).matches ? 'dark' : 'light';
}

/**
 * Resolve theme mode to actual theme
 */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}
