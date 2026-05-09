/**
 * React Hook for Memory Cleanup
 * 
 * Provides hooks for managing memory cleanup in React components
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { CleanupTracker, ImageCacheManager } from '@/utils/memoryCleanup';

/**
 * Hook for automatic cleanup of event listeners and subscriptions
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const cleanup = useCleanup();
 *   
 *   useEffect(() => {
 *     cleanup.addEventListener(window, 'resize', handleResize);
 *     cleanup.setInterval(() => console.log('tick'), 1000);
 *   }, []);
 * }
 * ```
 */
export function useCleanup(): CleanupTracker {
  const trackerRef = useRef<CleanupTracker>();

  if (!trackerRef.current) {
    trackerRef.current = new CleanupTracker();
  }

  useEffect(() => {
    const tracker = trackerRef.current!;
    return () => {
      tracker.cleanup();
    };
  }, []);

  return trackerRef.current;
}

/**
 * Hook for managing image cache with automatic cleanup
 * 
 * @param maxCacheSize - Maximum number of images to cache
 * 
 * @example
 * ```tsx
 * function ImageGallery() {
 *   const imageCache = useImageCache(50);
 *   
 *   const loadImage = async (url: string) => {
 *     const cached = imageCache.get(url);
 *     if (cached) return cached;
 *     
 *     const blob = await fetch(url).then(r => r.blob());
 *     const objectUrl = URL.createObjectURL(blob);
 *     imageCache.add(url, objectUrl);
 *     return objectUrl;
 *   };
 * }
 * ```
 */
export function useImageCache(maxCacheSize = 100): ImageCacheManager {
  const cacheRef = useRef<ImageCacheManager>();

  if (!cacheRef.current) {
    cacheRef.current = new ImageCacheManager(maxCacheSize);
  }

  useEffect(() => {
    const cache = cacheRef.current!;
    return () => {
      cache.clear();
    };
  }, []);

  return cacheRef.current;
}

/**
 * Hook for creating an AbortController with automatic cleanup
 * 
 * @example
 * ```tsx
 * function DataFetcher() {
 *   const abortController = useAbortController();
 *   
 *   useEffect(() => {
 *     fetch('/api/data', { signal: abortController.signal })
 *       .then(r => r.json())
 *       .then(setData);
 *   }, []);
 * }
 * ```
 */
export function useAbortController(): AbortController {
  const controllerRef = useRef<AbortController>();

  if (!controllerRef.current) {
    controllerRef.current = new AbortController();
  }

  useEffect(() => {
    const controller = controllerRef.current!;
    return () => {
      controller.abort();
    };
  }, []);

  return controllerRef.current;
}

/**
 * Hook for managing event listeners with automatic cleanup
 * 
 * @param target - Event target (window, document, or element)
 * @param type - Event type
 * @param listener - Event listener function
 * @param options - Event listener options
 * 
 * @example
 * ```tsx
 * function WindowResizeHandler() {
 *   const [size, setSize] = useState({ width: 0, height: 0 });
 *   
 *   useEventListener(window, 'resize', () => {
 *     setSize({ width: window.innerWidth, height: window.innerHeight });
 *   });
 * }
 * ```
 */
export function useEventListener<K extends keyof WindowEventMap>(
  target: Window | Document | HTMLElement | null,
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions
): void {
  const savedListener = useRef(listener);

  useEffect(() => {
    savedListener.current = listener;
  }, [listener]);

  useEffect(() => {
    if (!target) return;

    const eventListener = (event: Event) => {
      savedListener.current.call(target as Window, event as WindowEventMap[K]);
    };

    target.addEventListener(type as string, eventListener, options);

    return () => {
      target.removeEventListener(type as string, eventListener, options);
    };
  }, [target, type, options]);
}

/**
 * Hook for managing intervals with automatic cleanup
 * 
 * @param callback - Function to call on each interval
 * @param delay - Delay in milliseconds (null to pause)
 * 
 * @example
 * ```tsx
 * function Timer() {
 *   const [count, setCount] = useState(0);
 *   
 *   useInterval(() => {
 *     setCount(c => c + 1);
 *   }, 1000);
 * }
 * ```
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => {
      clearInterval(id);
    };
  }, [delay]);
}

/**
 * Hook for managing timeouts with automatic cleanup
 * 
 * @param callback - Function to call after timeout
 * @param delay - Delay in milliseconds (null to cancel)
 * 
 * @example
 * ```tsx
 * function DelayedMessage() {
 *   const [show, setShow] = useState(false);
 *   
 *   useTimeout(() => {
 *     setShow(true);
 *   }, 3000);
 * }
 * ```
 */
export function useTimeout(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setTimeout(() => {
      savedCallback.current();
    }, delay);

    return () => {
      clearTimeout(id);
    };
  }, [delay]);
}

/**
 * Hook for debouncing a value
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * 
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebounce(search, 500);
 *   
 *   useEffect(() => {
 *     // Perform search with debouncedSearch
 *   }, [debouncedSearch]);
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      window.clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for managing object URLs with automatic cleanup
 * 
 * @param blob - Blob to create object URL from
 * 
 * @example
 * ```tsx
 * function ImagePreview({ blob }: { blob: Blob }) {
 *   const url = useObjectURL(blob);
 *   return <img src={url} alt="Preview" />;
 * }
 * ```
 */
export function useObjectURL(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return url;
}

/**
 * Hook for managing multiple object URLs with automatic cleanup
 * 
 * @param blobs - Array of blobs to create object URLs from
 * 
 * @example
 * ```tsx
 * function ImageGallery({ blobs }: { blobs: Blob[] }) {
 *   const urls = useObjectURLs(blobs);
 *   return urls.map((url, i) => <img key={i} src={url} />);
 * }
 * ```
 */
export function useObjectURLs(blobs: Blob[]): string[] {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const objectUrls = blobs.map((blob) => URL.createObjectURL(blob));
    setUrls(objectUrls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [blobs]);

  return urls;
}

/**
 * Hook for managing a callback that's safe to call even after unmount
 * 
 * @param callback - Callback function
 * 
 * @example
 * ```tsx
 * function AsyncComponent() {
 *   const [data, setData] = useState(null);
 *   const safeSetData = useSafeCallback(setData);
 *   
 *   useEffect(() => {
 *     fetchData().then(safeSetData); // Safe even if component unmounts
 *   }, []);
 * }
 * ```
 */
export function useSafeCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const mountedRef = useRef(true);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(
    ((...args: any[]) => {
      if (mountedRef.current) {
        return callbackRef.current(...args);
      }
    }) as T,
    []
  );
}
