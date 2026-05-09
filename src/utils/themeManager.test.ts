/**
 * Theme Manager Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeManager, getThemeManager, initializeTheme } from './themeManager';
import { THEME_CONFIG } from '@/config/theme';

describe('ThemeManager', () => {
  let themeManager: ThemeManager;
  let matchMediaMock: any;
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    Storage.prototype.getItem = vi.fn((key: string) => localStorageMock[key] || null);
    Storage.prototype.setItem = vi.fn((key: string, value: string) => {
      localStorageMock[key] = value;
    });
    Storage.prototype.removeItem = vi.fn((key: string) => {
      delete localStorageMock[key];
    });

    // Mock matchMedia
    matchMediaMock = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    // Mock document.documentElement
    document.documentElement.classList.remove(THEME_CONFIG.DARK_CLASS);

    // Create fresh instance
    themeManager = new ThemeManager();
  });

  afterEach(() => {
    themeManager.destroy();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default theme when no stored preference', () => {
      expect(themeManager.getThemeMode()).toBe('system');
    });

    it('should load stored theme preference', () => {
      localStorageMock[THEME_CONFIG.STORAGE_KEY] = 'dark';
      const manager = new ThemeManager();
      expect(manager.getThemeMode()).toBe('dark');
      manager.destroy();
    });

    it('should apply dark class when theme is dark', () => {
      localStorageMock[THEME_CONFIG.STORAGE_KEY] = 'dark';
      const manager = new ThemeManager();
      expect(document.documentElement.classList.contains(THEME_CONFIG.DARK_CLASS)).toBe(true);
      manager.destroy();
    });

    it('should not apply dark class when theme is light', () => {
      localStorageMock[THEME_CONFIG.STORAGE_KEY] = 'light';
      const manager = new ThemeManager();
      expect(document.documentElement.classList.contains(THEME_CONFIG.DARK_CLASS)).toBe(false);
      manager.destroy();
    });

    it('should handle invalid stored theme', () => {
      localStorageMock[THEME_CONFIG.STORAGE_KEY] = 'invalid';
      const manager = new ThemeManager();
      expect(manager.getThemeMode()).toBe('system');
      manager.destroy();
    });

    it('should handle localStorage errors gracefully', () => {
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      const manager = new ThemeManager();
      expect(manager.getThemeMode()).toBe('system');
      manager.destroy();
    });
  });

  describe('setTheme', () => {
    it('should set theme mode', () => {
      themeManager.setTheme('dark');
      expect(themeManager.getThemeMode()).toBe('dark');
    });

    it('should save theme preference to localStorage', () => {
      themeManager.setTheme('dark');
      expect(localStorageMock[THEME_CONFIG.STORAGE_KEY]).toBe('dark');
    });

    it('should apply dark class when setting dark theme', () => {
      themeManager.setTheme('dark');
      expect(document.documentElement.classList.contains(THEME_CONFIG.DARK_CLASS)).toBe(true);
    });

    it('should remove dark class when setting light theme', () => {
      themeManager.setTheme('dark');
      themeManager.setTheme('light');
      expect(document.documentElement.classList.contains(THEME_CONFIG.DARK_CLASS)).toBe(false);
    });

    it('should resolve system theme correctly', () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      themeManager.setTheme('system');
      expect(themeManager.getResolvedTheme()).toBe('dark');
    });

    it('should notify listeners on theme change', () => {
      const listener = vi.fn();
      themeManager.subscribe(listener);
      themeManager.setTheme('dark');
      expect(listener).toHaveBeenCalledWith('dark');
    });

    it('should handle localStorage errors when saving', () => {
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      expect(() => themeManager.setTheme('dark')).not.toThrow();
    });
  });

  describe('getThemeMode', () => {
    it('should return current theme mode', () => {
      themeManager.setTheme('dark');
      expect(themeManager.getThemeMode()).toBe('dark');
    });
  });

  describe('getResolvedTheme', () => {
    it('should return resolved theme', () => {
      themeManager.setTheme('light');
      expect(themeManager.getResolvedTheme()).toBe('light');
    });

    it('should resolve system theme', () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      themeManager.setTheme('system');
      expect(themeManager.getResolvedTheme()).toBe('dark');
    });
  });

  describe('getSystemTheme', () => {
    it('should return system theme preference', () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      expect(themeManager.getSystemTheme()).toBe('dark');
    });
  });

  describe('System theme listener', () => {
    it('should set up listener when theme is system', () => {
      const addEventListenerSpy = vi.fn();
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
      });
      themeManager.setTheme('system');
      expect(addEventListenerSpy).toHaveBeenCalled();
    });

    it('should update theme when system preference changes', () => {
      let changeListener: any;
      const addEventListenerSpy = vi.fn((event, listener) => {
        changeListener = listener;
      });
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
      });

      themeManager.setTheme('system');
      expect(themeManager.getResolvedTheme()).toBe('light');

      // Simulate system theme change
      changeListener({ matches: true });
      expect(themeManager.getResolvedTheme()).toBe('dark');
    });

    it('should remove listener when switching away from system theme', () => {
      const removeEventListenerSpy = vi.fn();
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerSpy,
      });

      themeManager.setTheme('system');
      themeManager.setTheme('light');
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('should use legacy addListener if addEventListener not available', () => {
      const addListenerSpy = vi.fn();
      matchMediaMock.mockReturnValue({
        matches: false,
        addListener: addListenerSpy,
        removeListener: vi.fn(),
      });

      themeManager.setTheme('system');
      expect(addListenerSpy).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should add listener', () => {
      const listener = vi.fn();
      themeManager.subscribe(listener);
      themeManager.setTheme('dark');
      expect(listener).toHaveBeenCalledWith('dark');
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = themeManager.subscribe(listener);
      unsubscribe();
      themeManager.setTheme('dark');
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      themeManager.subscribe(errorListener);
      expect(() => themeManager.setTheme('dark')).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should remove system theme listener', () => {
      const removeEventListenerSpy = vi.fn();
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerSpy,
      });

      themeManager.setTheme('system');
      themeManager.destroy();
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('should clear all listeners', () => {
      const listener = vi.fn();
      themeManager.subscribe(listener);
      themeManager.destroy();
      themeManager.setTheme('dark');
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe('getThemeManager', () => {
  it('should return singleton instance', () => {
    const instance1 = getThemeManager();
    const instance2 = getThemeManager();
    expect(instance1).toBe(instance2);
  });
});

describe('initializeTheme', () => {
  let localStorageMock: { [key: string]: string };
  let matchMediaMock: any;

  beforeEach(() => {
    localStorageMock = {};
    Storage.prototype.getItem = vi.fn((key: string) => localStorageMock[key] || null);

    matchMediaMock = vi.fn().mockReturnValue({ matches: false });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    document.documentElement.classList.remove(THEME_CONFIG.DARK_CLASS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should apply dark class for dark theme', () => {
    localStorageMock[THEME_CONFIG.STORAGE_KEY] = 'dark';
    initializeTheme();
    expect(document.documentElement.classList.contains(THEME_CONFIG.DARK_CLASS)).toBe(true);
  });

  it('should not apply dark class for light theme', () => {
    localStorageMock[THEME_CONFIG.STORAGE_KEY] = 'light';
    initializeTheme();
    expect(document.documentElement.classList.contains(THEME_CONFIG.DARK_CLASS)).toBe(false);
  });

  it('should resolve system theme', () => {
    localStorageMock[THEME_CONFIG.STORAGE_KEY] = 'system';
    matchMediaMock.mockReturnValue({ matches: true });
    initializeTheme();
    expect(document.documentElement.classList.contains(THEME_CONFIG.DARK_CLASS)).toBe(true);
  });

  it('should use default theme when no stored preference', () => {
    matchMediaMock.mockReturnValue({ matches: false });
    initializeTheme();
    // Default is 'system', which should resolve to light (matches: false)
    expect(document.documentElement.classList.contains(THEME_CONFIG.DARK_CLASS)).toBe(false);
  });

  it('should handle errors gracefully', () => {
    Storage.prototype.getItem = vi.fn(() => {
      throw new Error('Storage error');
    });
    expect(() => initializeTheme()).not.toThrow();
  });
});
