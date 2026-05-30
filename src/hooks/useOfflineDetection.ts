import { useState, useEffect, useCallback, useRef } from 'react';

interface OfflineDetectionOptions {
  /**
   * Server URL to ping for connectivity check
   */
  serverUrl?: string;
  /**
   * Interval in milliseconds to check server connectivity
   * Default: 30000 (30 seconds)
   */
  checkInterval?: number;
  /**
   * Timeout in milliseconds for server ping
   * Default: 5000 (5 seconds)
   */
  pingTimeout?: number;
  /**
   * Number of consecutive failed pings before marking offline
   * Default: 2
   */
  failureThreshold?: number;
  /**
   * Callback when online status changes
   */
  onStatusChange?: (isOnline: boolean) => void;
}

interface OfflineDetectionResult {
  /**
   * Whether the application is online (both navigator.onLine and server reachable)
   */
  isOnline: boolean;
  /**
   * Whether the browser reports being online
   */
  navigatorOnline: boolean;
  /**
   * Whether the server is reachable
   */
  serverReachable: boolean;
  /**
   * Last time connectivity was checked
   */
  lastChecked: number | null;
  /**
   * Manually trigger a connectivity check
   */
  checkConnectivity: () => Promise<void>;
}

/**
 * useOfflineDetection Hook
 * 
 * Detects offline mode using:
 * 1. navigator.onLine - Browser's network status
 * 2. Server ping - Actual connectivity to Plex server
 * 
 * Automatically checks connectivity at regular intervals and
 * responds to browser online/offline events
 */
export function useOfflineDetection(
  options: OfflineDetectionOptions = {}
): OfflineDetectionResult {
  const {
    serverUrl,
    checkInterval = 30000,
    pingTimeout = 5000,
    failureThreshold = 2,
    onStatusChange,
  } = options;

  const [navigatorOnline, setNavigatorOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [serverReachable, setServerReachable] = useState(true);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const consecutiveFailuresRef = useRef(0);

  // Combined online status
  const isOnline = navigatorOnline && serverReachable;

  /**
   * Check if server is reachable
   */
  const checkServerConnectivity = useCallback(async (): Promise<boolean> => {
    if (!serverUrl) {
      // If no server URL provided, assume reachable if navigator is online
      return navigatorOnline;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), pingTimeout);

      // Ping the server with a lightweight request
      const response = await fetch(`${serverUrl}/identity`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // Network error, timeout, or abort
      return false;
    }
  }, [serverUrl, pingTimeout, navigatorOnline]);

  /**
   * Perform full connectivity check with failure tolerance
   */
  const checkConnectivity = useCallback(async () => {
    const reachable = await checkServerConnectivity();
    
    if (reachable) {
      consecutiveFailuresRef.current = 0;
      setServerReachable(true);
    } else {
      consecutiveFailuresRef.current += 1;
      // Only mark as unreachable after multiple consecutive failures
      if (consecutiveFailuresRef.current >= failureThreshold) {
        console.log(
          `[OfflineDetection] Server marked offline after ${consecutiveFailuresRef.current} consecutive failures`
        );
        setServerReachable(false);
      } else {
        console.log(
          `[OfflineDetection] Ping failed (${consecutiveFailuresRef.current}/${failureThreshold}), still online`
        );
      }
    }
    
    setLastChecked(Date.now());
  }, [checkServerConnectivity, failureThreshold]);

  /**
   * Handle browser online event
   */
  const handleOnline = useCallback(() => {
    setNavigatorOnline(true);
    // Immediately check server connectivity when browser comes online
    checkConnectivity();
  }, [checkConnectivity]);

  /**
   * Handle browser offline event
   */
  const handleOffline = useCallback(() => {
    setNavigatorOnline(false);
    setServerReachable(false);
    consecutiveFailuresRef.current = 0; // Reset counter
    setLastChecked(Date.now());
  }, []);

  /**
   * Set up event listeners and periodic checks
   */
  useEffect(() => {
    // Listen to browser online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connectivity check
    checkConnectivity();

    // Set up periodic connectivity checks
    const intervalId = setInterval(checkConnectivity, checkInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [handleOnline, handleOffline, checkConnectivity, checkInterval]);

  /**
   * Notify when online status changes
   */
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(isOnline);
    }
  }, [isOnline, onStatusChange]);

  return {
    isOnline,
    navigatorOnline,
    serverReachable,
    lastChecked,
    checkConnectivity,
  };
}
