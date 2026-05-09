import { useState, useEffect } from 'react';

/**
 * Hook for progressive image loading
 * Loads a low-quality placeholder first, then the full-quality image
 * 
 * @param lowQualitySrc - Low quality image URL (thumbnail)
 * @param highQualitySrc - High quality image URL
 * @returns Current image source and loading state
 */
export function useProgressiveImage(
  lowQualitySrc: string,
  highQualitySrc: string
): { src: string; isLoading: boolean; error: Error | null } {
  const [src, setSrc] = useState<string>(lowQualitySrc);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state when URLs change
    setSrc(lowQualitySrc);
    setIsLoading(true);
    setError(null);

    // Load high quality image
    const img = new Image();

    img.onload = () => {
      setSrc(highQualitySrc);
      setIsLoading(false);
    };

    img.onerror = () => {
      setError(new Error('Failed to load high quality image'));
      setIsLoading(false);
    };

    img.src = highQualitySrc;

    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [lowQualitySrc, highQualitySrc]);

  return { src, isLoading, error };
}

/**
 * Hook for preloading images
 * Preloads an array of images and tracks loading state
 * 
 * @param urls - Array of image URLs to preload
 * @returns Loading state and error
 */
export function useImagePreload(
  urls: string[]
): { isLoading: boolean; error: Error | null; loadedCount: number } {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadedCount, setLoadedCount] = useState<number>(0);

  useEffect(() => {
    if (urls.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadedCount(0);

    let mounted = true;
    let loaded = 0;

    const loadImage = (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
          if (mounted) {
            loaded++;
            setLoadedCount(loaded);
          }
          resolve();
        };

        img.onerror = () => {
          reject(new Error(`Failed to load image: ${url}`));
        };

        img.src = url;
      });
    };

    Promise.all(urls.map(url => loadImage(url)))
      .then(() => {
        if (mounted) {
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [urls]);

  return { isLoading, error, loadedCount };
}

/**
 * Hook for lazy loading images with Intersection Observer
 * Only loads the image when it enters the viewport
 * 
 * @param src - Image URL
 * @param options - Intersection Observer options and lazy loading config
 * @returns Ref to attach to image element and loading state
 */
export function useLazyImage(
  src: string,
  options: IntersectionObserverInit & {
    fallbackSrc?: string;
    placeholder?: string;
  } = {}
): {
  ref: (node: HTMLImageElement | null) => void;
  isLoading: boolean;
  isVisible: boolean;
  currentSrc: string | null;
  error: Error | null;
} {
  const { fallbackSrc, placeholder, ...observerOptions } = options;
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(placeholder || null);
  const [error, setError] = useState<Error | null>(null);
  const [node, setNode] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry && entry.isIntersecting) {
        setIsVisible(true);
        setIsLoading(true);
        setError(null);

        // Load the image
        const img = new Image();
        img.onload = () => {
          setCurrentSrc(src);
          setIsLoading(false);
        };
        img.onerror = () => {
          const loadError = new Error(`Failed to load image: ${src}`);
          setError(loadError);
          
          // Try fallback if available
          if (fallbackSrc) {
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              setCurrentSrc(fallbackSrc);
              setIsLoading(false);
            };
            fallbackImg.onerror = () => {
              setIsLoading(false);
            };
            fallbackImg.src = fallbackSrc;
          } else {
            setIsLoading(false);
          }
        };
        img.src = src;

        // Stop observing once loaded
        observer.unobserve(node);
      }
    }, observerOptions);

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node, src, fallbackSrc, observerOptions]);

  return { ref: setNode, isLoading, isVisible, currentSrc, error };
}

/**
 * Hook for lazy loading with progressive image support
 * Combines lazy loading with progressive image loading (low-res → high-res)
 * 
 * @param lowQualitySrc - Low quality image URL (thumbnail)
 * @param highQualitySrc - High quality image URL
 * @param options - Intersection Observer options and lazy loading config
 * @returns Ref to attach to image element and loading state
 */
export function useLazyProgressiveImage(
  lowQualitySrc: string,
  highQualitySrc: string,
  options: IntersectionObserverInit & {
    fallbackSrc?: string;
  } = {}
): {
  ref: (node: HTMLImageElement | null) => void;
  src: string;
  isLoading: boolean;
  isVisible: boolean;
  error: Error | null;
} {
  const { fallbackSrc, ...observerOptions } = options;
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [src, setSrc] = useState<string>(lowQualitySrc);
  const [error, setError] = useState<Error | null>(null);
  const [node, setNode] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry && entry.isIntersecting) {
        setIsVisible(true);
        setIsLoading(true);
        setError(null);
        
        // Start with low quality
        setSrc(lowQualitySrc);

        // Load high quality image
        const img = new Image();
        img.onload = () => {
          setSrc(highQualitySrc);
          setIsLoading(false);
        };
        img.onerror = () => {
          const loadError = new Error(`Failed to load high quality image: ${highQualitySrc}`);
          setError(loadError);
          
          // Try fallback if available
          if (fallbackSrc) {
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              setSrc(fallbackSrc);
              setIsLoading(false);
            };
            fallbackImg.onerror = () => {
              // Keep low quality image
              setIsLoading(false);
            };
            fallbackImg.src = fallbackSrc;
          } else {
            // Keep low quality image
            setIsLoading(false);
          }
        };
        img.src = highQualitySrc;

        // Stop observing once loaded
        observer.unobserve(node);
      }
    }, observerOptions);

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node, lowQualitySrc, highQualitySrc, fallbackSrc, observerOptions]);

  return { ref: setNode, src, isLoading, isVisible, error };
}
