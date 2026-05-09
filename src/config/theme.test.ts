/**
 * Theme Configuration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ThemeMode,
  ResolvedTheme,
  THEME_CONFIG,
  THEME_LABELS,
  THEME_ICONS,
  isValidThemeMode,
  getSystemTheme,
  resolveTheme,
} from './theme';

describe('Theme Configuration', () => {
  describe('Constants', () => {
    it('should have correct storage key', () => {
      expect(THEME_CONFIG.STORAGE_KEY).toBe('aio-media-manager-theme');
    });

    it('should have correct dark class', () => {
      expect(THEME_CONFIG.DARK_CLASS).toBe('dark');
    });

    it('should have correct default theme', () => {
      expect(THEME_CONFIG.DEFAULT_THEME).toBe('system');
    });

    it('should have correct media query', () => {
      expect(THEME_CONFIG.MEDIA_QUERY).toBe('(prefers-color-scheme: dark)');
    });
  });

  describe('Theme Labels', () => {
    it('should have labels for all theme modes', () => {
      expect(THEME_LABELS.light).toBe('Light');
      expect(THEME_LABELS.dark).toBe('Dark');
      expect(THEME_LABELS.system).toBe('System');
    });
  });

  describe('Theme Icons', () => {
    it('should have icons for all theme modes', () => {
      expect(THEME_ICONS.light).toBe('☀️');
      expect(THEME_ICONS.dark).toBe('🌙');
      expect(THEME_ICONS.system).toBe('💻');
    });
  });

  describe('isValidThemeMode', () => {
    it('should return true for valid theme modes', () => {
      expect(isValidThemeMode('light')).toBe(true);
      expect(isValidThemeMode('dark')).toBe(true);
      expect(isValidThemeMode('system')).toBe(true);
    });

    it('should return false for invalid theme modes', () => {
      expect(isValidThemeMode('invalid')).toBe(false);
      expect(isValidThemeMode('')).toBe(false);
      expect(isValidThemeMode(null)).toBe(false);
      expect(isValidThemeMode(undefined)).toBe(false);
      expect(isValidThemeMode(123)).toBe(false);
      expect(isValidThemeMode({})).toBe(false);
    });
  });

  describe('getSystemTheme', () => {
    let matchMediaMock: any;

    beforeEach(() => {
      matchMediaMock = vi.fn();
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return "dark" when system prefers dark mode', () => {
      matchMediaMock.mockReturnValue({ matches: true });
      expect(getSystemTheme()).toBe('dark');
    });

    it('should return "light" when system prefers light mode', () => {
      matchMediaMock.mockReturnValue({ matches: false });
      expect(getSystemTheme()).toBe('light');
    });

    it('should return "light" when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      expect(getSystemTheme()).toBe('light');
      global.window = originalWindow;
    });
  });

  describe('resolveTheme', () => {
    let matchMediaMock: any;

    beforeEach(() => {
      matchMediaMock = vi.fn();
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return "light" for light mode', () => {
      expect(resolveTheme('light')).toBe('light');
    });

    it('should return "dark" for dark mode', () => {
      expect(resolveTheme('dark')).toBe('dark');
    });

    it('should return system preference for system mode (dark)', () => {
      matchMediaMock.mockReturnValue({ matches: true });
      expect(resolveTheme('system')).toBe('dark');
    });

    it('should return system preference for system mode (light)', () => {
      matchMediaMock.mockReturnValue({ matches: false });
      expect(resolveTheme('system')).toBe('light');
    });
  });
});
