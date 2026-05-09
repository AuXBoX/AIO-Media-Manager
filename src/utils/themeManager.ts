/**
 * Theme Manager
 * Handles theme switching, persistence, and system preference detection
 */

import { ThemeMode, ResolvedTheme, THEME_CONFIG, resolveTheme, getSystemTheme } from '@/config/theme';

/**
 * Theme change listener callback
 */
export type ThemeChangeListener = (theme: ResolvedTheme) => void;

/**
 * Theme Manager Class
 * Manages theme state, persistence, and system preference detection
 */
export class ThemeManager {
  private currentMode: ThemeMode = THEME_CONFIG.DEFAULT_THEME;
  private currentTheme: ResolvedTheme = 'light';
  private listeners: Set<ThemeChangeListener> = new Set();
  private mediaQuery: MediaQueryList | null = null;
  private systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize theme manager
   */
  private initialize(): void {
    // Load saved theme preference
    this.currentMode = this.loadThemePreference();

    // Resolve initial theme
    this.currentTheme = resolveTheme(this.currentMode);

    // Apply theme to DOM
    this.applyTheme(this.currentTheme);

    // Set up system theme listener if in system mode
    if (this.currentMode === 'system') {
      this.setupSystemThemeListener();
    }
  }

  /**
   * Load theme preference from storage
   */
  private loadThemePreference(): ThemeMode {
    try {
      const stored = localStorage.getItem(THEME_CONFIG.STORAGE_KEY);
      if (stored && this.isValidThemeMode(stored)) {
        return stored as ThemeMode;
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
    return THEME_CONFIG.DEFAULT_THEME;
  }

  /**
   * Save theme preference to storage
   */
  private saveThemePreference(mode: ThemeMode): void {
    try {
      localStorage.setItem(THEME_CONFIG.STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }

  /**
   * Validate theme mode
   */
  private isValidThemeMode(value: string): boolean {
    return value === 'light' || value === 'dark' || value === 'system';
  }

  /**
   * Apply theme to DOM
   */
  private applyTheme(theme: ResolvedTheme): void {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add(THEME_CONFIG.DARK_CLASS);
    } else {
      root.classList.remove(THEME_CONFIG.DARK_CLASS);
    }

    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(theme);
  }

  /**
   * Update meta theme-color tag
   */
  private updateMetaThemeColor(theme: ResolvedTheme): void {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      // Light mode: white background, Dark mode: dark gray background
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#111827' : '#ffffff');
    }
  }

  /**
   * Set up system theme preference listener
   */
  private setupSystemThemeListener(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      this.mediaQuery = window.matchMedia(THEME_CONFIG.MEDIA_QUERY);

      this.systemThemeListener = (e: MediaQueryListEvent) => {
        if (this.currentMode === 'system') {
          const newTheme = e.matches ? 'dark' : 'light';
          this.currentTheme = newTheme;
          this.applyTheme(newTheme);
          this.notifyListeners(newTheme);
        }
      };

      // Modern browsers
      if (this.mediaQuery.addEventListener) {
        this.mediaQuery.addEventListener('change', this.systemThemeListener);
      }
      // Legacy browsers
      else if (this.mediaQuery.addListener) {
        this.mediaQuery.addListener(this.systemThemeListener);
      }
    } catch (error) {
      console.error('Failed to set up system theme listener:', error);
    }
  }

  /**
   * Remove system theme preference listener
   */
  private removeSystemThemeListener(): void {
    if (this.mediaQuery && this.systemThemeListener) {
      // Modern browsers
      if (this.mediaQuery.removeEventListener) {
        this.mediaQuery.removeEventListener('change', this.systemThemeListener);
      }
      // Legacy browsers
      else if (this.mediaQuery.removeListener) {
        this.mediaQuery.removeListener(this.systemThemeListener);
      }
    }
  }

  /**
   * Notify all listeners of theme change
   */
  private notifyListeners(theme: ResolvedTheme): void {
    this.listeners.forEach((listener) => {
      try {
        listener(theme);
      } catch (error) {
        console.error('Theme listener error:', error);
      }
    });
  }

  /**
   * Set theme mode
   */
  setTheme(mode: ThemeMode): void {
    // Remove old system listener if switching away from system mode
    if (this.currentMode === 'system' && mode !== 'system') {
      this.removeSystemThemeListener();
    }

    this.currentMode = mode;
    this.saveThemePreference(mode);

    // Resolve and apply new theme
    const newTheme = resolveTheme(mode);
    this.currentTheme = newTheme;
    this.applyTheme(newTheme);

    // Set up system listener if switching to system mode
    if (mode === 'system') {
      this.setupSystemThemeListener();
    }

    // Notify listeners
    this.notifyListeners(newTheme);
  }

  /**
   * Get current theme mode
   */
  getThemeMode(): ThemeMode {
    return this.currentMode;
  }

  /**
   * Get current resolved theme
   */
  getResolvedTheme(): ResolvedTheme {
    return this.currentTheme;
  }

  /**
   * Get system theme preference
   */
  getSystemTheme(): ResolvedTheme {
    return getSystemTheme();
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: ThemeChangeListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.removeSystemThemeListener();
    this.listeners.clear();
  }
}

/**
 * Singleton instance
 */
let themeManagerInstance: ThemeManager | null = null;

/**
 * Get theme manager instance
 */
export function getThemeManager(): ThemeManager {
  if (!themeManagerInstance) {
    themeManagerInstance = new ThemeManager();
  }
  return themeManagerInstance;
}

/**
 * Initialize theme on app startup (before React renders)
 * This prevents flash of unstyled content
 */
export function initializeTheme(): void {
  try {
    const stored = localStorage.getItem(THEME_CONFIG.STORAGE_KEY);
    const mode: ThemeMode = stored && (stored === 'light' || stored === 'dark' || stored === 'system')
      ? stored as ThemeMode
      : THEME_CONFIG.DEFAULT_THEME;

    const theme = resolveTheme(mode);
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add(THEME_CONFIG.DARK_CLASS);
    } else {
      root.classList.remove(THEME_CONFIG.DARK_CLASS);
    }
  } catch (error) {
    console.error('Failed to initialize theme:', error);
  }
}
