import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOfflineDetection } from './useOfflineDetection';

describe('useOfflineDetection', () => {
  let originalNavigator: Navigator;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Save original navigator
    originalNavigator = global.navigator;

    // Mock navigator.onLine
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    // Restore navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });

    // Restore fetch
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with navigator.onLine status', () => {
      const { result } = renderHook(() => useOfflineDetection());

      expect(result.current.navigatorOnline).toBe(true);
    });

    it('should start with serverReachable as true', () => {
      const { result } = renderHook(() => useOfflineDetection());

      expect(result.current.serverReachable).toBe(true);
    });

    it('should check server connectivity on mount', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      renderHook(() =>
        useOfflineDetection({
          serverUrl: 'http://localhost:32400',
        })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:32400/identity',
          expect.any(Object)
        );
      });
    });
  });

  describe('browser online/offline events', () => {
    it('should update navigatorOnline when browser goes offline', async () => {
      const { result } = renderHook(() => useOfflineDetection());

      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));

      await waitFor(() => {
        expect(result.current.navigatorOnline).toBe(false);
        expect(result.current.isOnline).toBe(false);
      });
    });

    it('should update navigatorOnline when browser comes online', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      // Start offline
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() =>
        useOfflineDetection({
          serverUrl: 'http://localhost:32400',
        })
      );

      window.dispatchEvent(new Event('offline'));

      await waitFor(() => {
        expect(result.current.navigatorOnline).toBe(false);
      });

      // Go online
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));

      await waitFor(() => {
        expect(result.current.navigatorOnline).toBe(true);
      });
    });

    it('should check server connectivity when browser comes online', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      renderHook(() =>
        useOfflineDetection({
          serverUrl: 'http://localhost:32400',
        })
      );

      mockFetch.mockClear();

      window.dispatchEvent(new Event('online'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:32400/identity',
          expect.objectContaining({
            method: 'GET',
            cache: 'no-cache',
          })
        );
      });
    });
  });

  describe('server connectivity checks', () => {
    it('should mark server as reachable when fetch succeeds', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { result } = renderHook(() =>
        useOfflineDetection({
          serverUrl: 'http://localhost:32400',
        })
      );

      await waitFor(() => {
        expect(result.current.serverReachable).toBe(true);
        expect(result.current.isOnline).toBe(true);
      });
    });

    it('should mark server as unreachable when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useOfflineDetection({
          serverUrl: 'http://localhost:32400',
        })
      );

      await waitFor(() => {
        expect(result.current.serverReachable).toBe(false);
        expect(result.current.isOnline).toBe(false);
      });
    });

    it('should mark server as unreachable when response is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const { result } = renderHook(() =>
        useOfflineDetection({
          serverUrl: 'http://localhost:32400',
        })
      );

      await waitFor(() => {
        expect(result.current.serverReachable).toBe(false);
      });
    });

    it('should assume reachable if no server URL provided and navigator is online', async () => {
      const { result } = renderHook(() => useOfflineDetection());

      await waitFor(() => {
        expect(result.current.serverReachable).toBe(true);
        expect(result.current.isOnline).toBe(true);
      });
    });
  });

  describe('manual connectivity check', () => {
    it('should allow manual connectivity check', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { result } = renderHook(() =>
        useOfflineDetection({
          serverUrl: 'http://localhost:32400',
        })
      );

      mockFetch.mockClear();

      await result.current.checkConnectivity();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        expect(result.current.lastChecked).not.toBeNull();
      });
    });

    it('should update lastChecked timestamp after manual check', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { result } = renderHook(() =>
        useOfflineDetection({
          serverUrl: 'http://localhost:32400',
        })
      );

      const beforeCheck = Date.now();

      await result.current.checkConnectivity();

      await waitFor(() => {
        expect(result.current.lastChecked).toBeGreaterThanOrEqual(beforeCheck);
      });
    });
  });

  describe('status change callback', () => {
    it('should call onStatusChange when online status changes to true', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const onStatusChange = vi.fn();

      renderHook(() =>
        useOfflineDetection({
          serverUrl: 'http://localhost:32400',
          onStatusChange,
        })
      );

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith(true);
      });
    });

    it('should call onStatusChange when going offline', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const onStatusChange = vi.fn();

      renderHook(() =>
        useOfflineDetection({
          serverUrl: 'http://localhost:32400',
          onStatusChange,
        })
      );

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useOfflineDetection());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
    });

    it('should clear interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() =>
        useOfflineDetection({
          checkInterval: 10000,
        })
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('combined online status', () => {
    it('should be offline when navigator is offline even if server is reachable', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() =>
        useOfflineDetection({
          serverUrl: 'http://localhost:32400',
        })
      );

      window.dispatchEvent(new Event('offline'));

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
    });

    it('should be offline when server is unreachable even if navigator is online', async () => {
      mockFetch.mockRejectedValue(new Error('Server down'));

      const { result } = renderHook(() =>
        useOfflineDetection({
          serverUrl: 'http://localhost:32400',
        })
      );

      await waitFor(() => {
        expect(result.current.navigatorOnline).toBe(true);
        expect(result.current.serverReachable).toBe(false);
        expect(result.current.isOnline).toBe(false);
      });
    });
  });
});
