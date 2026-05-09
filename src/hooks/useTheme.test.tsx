/**
 * useTheme Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTheme } from './useTheme';

// Create mock state outside the mock factory
let mockThemeMode: 'light' | 'dark' | 'system' = 'system';
let mockResolvedTheme: 'light' | 'dark' = 'light';
let mockListeners: Set<(theme: 'light' | 'dark') => void> = new Set();

// Mock theme manager
vi.mock('@/utils/themeManager', () => {
  return {
    getThemeManager: vi.fn(() => ({
      getThemeMode: () => mockThemeMode,
      getResolvedTheme: () => mockResolvedTheme,
      getSystemTheme: () => 'light',
      setTheme: (mode: 'light' | 'dark' | 'system') => {
        mockThemeMode = mode;
        mockResolvedTheme = mode === 'system' ? 'light' : mode;
        mockListeners.forEach((listener) => listener(mockResolvedTheme));
      },
      subscribe: (listener: (theme: 'light' | 'dark') => void) => {
        mockListeners.add(listener);
        return () => mockListeners.delete(listener);
      },
    })),
  };
});

describe('useTheme', () => {
  beforeEach(() => {
    // Reset mock state
    mockThemeMode = 'system';
    mockResolvedTheme = 'light';
    mockListeners.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial theme state', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.themeMode).toBe('system');
    expect(result.current.resolvedTheme).toBe('light');
    expect(result.current.systemTheme).toBe('light');
    expect(result.current.isDark).toBe(false);
  });

  it('should update when theme changes', async () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });
  });

  it('should toggle theme between light and dark', async () => {
    const { result } = renderHook(() => useTheme());

    // Start with light
    act(() => {
      result.current.setTheme('light');
    });

    await waitFor(() => {
      expect(result.current.resolvedTheme).toBe('light');
    });

    // Toggle to dark
    act(() => {
      result.current.toggleTheme();
    });

    await waitFor(() => {
      expect(result.current.resolvedTheme).toBe('dark');
    });

    // Toggle back to light
    act(() => {
      result.current.toggleTheme();
    });

    await waitFor(() => {
      expect(result.current.resolvedTheme).toBe('light');
    });
  });

  it('should subscribe to theme changes', async () => {
    const { result } = renderHook(() => useTheme());

    // Trigger external theme change
    act(() => {
      mockResolvedTheme = 'dark';
      mockListeners.forEach((listener) => listener('dark'));
    });

    await waitFor(() => {
      expect(result.current.resolvedTheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useTheme());

    unmount();

    // Listeners should be cleared after unmount
    expect(mockListeners.size).toBe(0);
  });

  it('should handle system theme mode', async () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('system');
    });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('system');
      expect(result.current.resolvedTheme).toBe('light');
    });
  });

  it('should provide correct isDark value', async () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('light');
    });

    await waitFor(() => {
      expect(result.current.isDark).toBe(false);
    });

    act(() => {
      result.current.setTheme('dark');
    });

    await waitFor(() => {
      expect(result.current.isDark).toBe(true);
    });
  });
});
