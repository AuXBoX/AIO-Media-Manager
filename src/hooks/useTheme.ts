/**
 * useTheme Hook
 * React hook for accessing and managing theme state
 */

import { useState, useEffect, useCallback } from 'react';
import { ThemeMode, ResolvedTheme } from '@/config/theme';
import { getThemeManager } from '@/utils/themeManager';

/**
 * Theme hook return type
 */
export interface UseThemeReturn {
  /**
   * Current theme mode (light, dark, or system)
   */
  themeMode: ThemeMode;

  /**
   * Resolved theme (light or dark)
   */
  resolvedTheme: ResolvedTheme;

  /**
   * System theme preference
   */
  systemTheme: ResolvedTheme;

  /**
   * Set theme mode
   */
  setTheme: (mode: ThemeMode) => void;

  /**
   * Toggle between light and dark (ignores system)
   */
  toggleTheme: () => void;

  /**
   * Check if dark mode is active
   */
  isDark: boolean;
}

/**
 * useTheme Hook
 * Provides access to theme state and controls
 */
export function useTheme(): UseThemeReturn {
  const themeManager = getThemeManager();

  const [themeMode, setThemeMode] = useState<ThemeMode>(themeManager.getThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(themeManager.getResolvedTheme());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(themeManager.getSystemTheme());

  // Subscribe to theme changes
  useEffect(() => {
    const unsubscribe = themeManager.subscribe((newTheme) => {
      setResolvedTheme(newTheme);
      setThemeMode(themeManager.getThemeMode());
      setSystemTheme(themeManager.getSystemTheme());
    });

    return unsubscribe;
  }, [themeManager]);

  // Set theme mode
  const setTheme = useCallback(
    (mode: ThemeMode) => {
      themeManager.setTheme(mode);
    },
    [themeManager]
  );

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newMode: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    themeManager.setTheme(newMode);
  }, [resolvedTheme, themeManager]);

  return {
    themeMode,
    resolvedTheme,
    systemTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
}
