import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProgressiveImage, useImagePreload, useLazyImage, useLazyProgressiveImage } from './useProgressiveImage';

describe('useProgressiveImage', () => {
  beforeEach(() => {
    // Mock Image constructor
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        // Simulate async image loading
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 10);
      }
    } as any;
  });

  it('should start with low quality image', () => {
    const { result } = renderHook(() =>
      useProgressiveImage('low-quality.jpg', 'high-quality.jpg')
    );

    expect(result.current.src).toBe('low-quality.jpg');
    expect(result.current.isLoading).toBe(true);
  });

  it('should load high quality image', async () => {
    const { result } = renderHook(() =>
      useProgressiveImage('low-quality.jpg', 'high-quality.jpg')
    );

    await waitFor(() => {
      expect(result.current.src).toBe('high-quality.jpg');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle image load error', async () => {
    // Mock Image with error
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror();
          }
        }, 10);
      }
    } as any;

    const { result } = renderHook(() =>
      useProgressiveImage('low-quality.jpg', 'high-quality.jpg')
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should reset state when URLs change', async () => {
    const { result, rerender } = renderHook(
      ({ low, high }) => useProgressiveImage(low, high),
      {
        initialProps: { low: 'low1.jpg', high: 'high1.jpg' },
      }
    );

    await waitFor(() => {
      expect(result.current.src).toBe('high1.jpg');
    });

    // Change URLs
    rerender({ low: 'low2.jpg', high: 'high2.jpg' });

    expect(result.current.src).toBe('low2.jpg');
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.src).toBe('high2.jpg');
    });
  });
});

describe('useImagePreload', () => {
  beforeEach(() => {
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 10);
      }
    } as any;
  });

  it('should preload multiple images', async () => {
    const urls = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
    const { result } = renderHook(() => useImagePreload(urls));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.loadedCount).toBe(0);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.loadedCount).toBe(3);
    });
  });

  it('should handle empty array', () => {
    const { result } = renderHook(() => useImagePreload([]));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.loadedCount).toBe(0);
  });

  it('should handle image load errors', async () => {
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror();
          }
        }, 10);
      }
    } as any;

    const urls = ['image1.jpg', 'image2.jpg'];
    const { result } = renderHook(() => useImagePreload(urls));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should track loaded count', async () => {
    let loadedImages = 0;
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          loadedImages++;
          if (this.onload) {
            this.onload();
          }
        }, 10 * loadedImages);
      }
    } as any;

    const urls = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
    const { result } = renderHook(() => useImagePreload(urls));

    await waitFor(() => {
      expect(result.current.loadedCount).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(result.current.loadedCount).toBe(3);
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('useLazyImage', () => {
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let observerCallback: IntersectionObserverCallback | null;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockUnobserve = vi.fn();
    mockDisconnect = vi.fn();
    observerCallback = null;

    global.IntersectionObserver = vi.fn((callback) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
        root: null,
        rootMargin: '',
        thresholds: [],
        takeRecords: () => [],
      };
    }) as any;

    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 10);
      }
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    observerCallback = null;
  });

  it('should not load image initially', () => {
    const { result } = renderHook(() => useLazyImage('image.jpg'));

    expect(result.current.isVisible).toBe(false);
    expect(result.current.currentSrc).toBeNull();
  });

  it('should show placeholder initially if provided', () => {
    const { result } = renderHook(() => 
      useLazyImage('image.jpg', { placeholder: 'placeholder.jpg' })
    );

    expect(result.current.currentSrc).toBe('placeholder.jpg');
  });

  it('should load image when visible', async () => {
    const { result } = renderHook(() => useLazyImage('image.jpg'));

    // Attach ref to a mock element
    const mockElement = document.createElement('img');
    result.current.ref(mockElement);

    // Wait for observer to be created
    await waitFor(() => {
      expect(observerCallback).not.toBeNull();
    });

    // Simulate intersection
    if (observerCallback) {
      observerCallback(
        [{ isIntersecting: true, target: mockElement } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    }

    await waitFor(() => {
      expect(result.current.isVisible).toBe(true);
      expect(result.current.currentSrc).toBe('image.jpg');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should use fallback image on error', async () => {
    // Mock Image with error for main image, success for fallback
    let imageCount = 0;
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        const isFirstImage = imageCount === 0;
        imageCount++;
        
        setTimeout(() => {
          if (isFirstImage && this.onerror) {
            this.onerror();
          } else if (!isFirstImage && this.onload) {
            this.onload();
          }
        }, 10);
      }
    } as any;

    const { result } = renderHook(() => 
      useLazyImage('image.jpg', { fallbackSrc: 'fallback.jpg' })
    );

    const mockElement = document.createElement('img');
    result.current.ref(mockElement);

    await waitFor(() => {
      expect(observerCallback).not.toBeNull();
    });

    if (observerCallback) {
      observerCallback(
        [{ isIntersecting: true, target: mockElement } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    }

    await waitFor(() => {
      expect(result.current.currentSrc).toBe('fallback.jpg');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should observe element when ref is set', async () => {
    const { result } = renderHook(() => useLazyImage('image.jpg'));

    const mockElement = document.createElement('img');
    result.current.ref(mockElement);

    await waitFor(() => {
      expect(mockObserve).toHaveBeenCalledWith(mockElement);
    });
  });

  it('should unobserve after loading', async () => {
    const { result } = renderHook(() => useLazyImage('image.jpg'));

    const mockElement = document.createElement('img');
    result.current.ref(mockElement);

    // Wait for observer to be created
    await waitFor(() => {
      expect(observerCallback).not.toBeNull();
    });

    // Simulate intersection
    if (observerCallback) {
      observerCallback(
        [{ isIntersecting: true, target: mockElement } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    }

    await waitFor(() => {
      expect(mockUnobserve).toHaveBeenCalledWith(mockElement);
    });
  });

  it('should disconnect observer on unmount', async () => {
    const { result, unmount } = renderHook(() => useLazyImage('image.jpg'));

    const mockElement = document.createElement('img');
    result.current.ref(mockElement);

    // Wait for observer to be created
    await waitFor(() => {
      expect(mockObserve).toHaveBeenCalled();
    });

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should respect custom intersection observer options', async () => {
    const customOptions = {
      rootMargin: '100px',
      threshold: 0.5,
    };

    const { result } = renderHook(() => useLazyImage('image.jpg', customOptions));

    // Attach ref to trigger observer creation
    const mockElement = document.createElement('img');
    result.current.ref(mockElement);

    await waitFor(() => {
      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        customOptions
      );
    });
  });
});

describe('useLazyProgressiveImage', () => {
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let observerCallback: IntersectionObserverCallback | null;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockUnobserve = vi.fn();
    mockDisconnect = vi.fn();
    observerCallback = null;

    global.IntersectionObserver = vi.fn((callback) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
        root: null,
        rootMargin: '',
        thresholds: [],
        takeRecords: () => [],
      };
    }) as any;

    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 10);
      }
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    observerCallback = null;
  });

  it('should start with low quality image when visible', async () => {
    const { result } = renderHook(() => 
      useLazyProgressiveImage('low.jpg', 'high.jpg')
    );

    const mockElement = document.createElement('img');
    result.current.ref(mockElement);

    await waitFor(() => {
      expect(observerCallback).not.toBeNull();
    });

    if (observerCallback) {
      observerCallback(
        [{ isIntersecting: true, target: mockElement } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    }

    // Should immediately show low quality
    await waitFor(() => {
      expect(result.current.src).toBe('low.jpg');
    });
  });

  it('should load high quality image after low quality', async () => {
    const { result } = renderHook(() => 
      useLazyProgressiveImage('low.jpg', 'high.jpg')
    );

    const mockElement = document.createElement('img');
    result.current.ref(mockElement);

    await waitFor(() => {
      expect(observerCallback).not.toBeNull();
    });

    if (observerCallback) {
      observerCallback(
        [{ isIntersecting: true, target: mockElement } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    }

    await waitFor(() => {
      expect(result.current.src).toBe('high.jpg');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should use fallback on high quality error', async () => {
    let imageCount = 0;
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        const isFirstImage = imageCount === 0;
        imageCount++;
        
        setTimeout(() => {
          if (isFirstImage && this.onerror) {
            // High quality fails
            this.onerror();
          } else if (!isFirstImage && this.onload) {
            // Fallback succeeds
            this.onload();
          }
        }, 10);
      }
    } as any;

    const { result } = renderHook(() => 
      useLazyProgressiveImage('low.jpg', 'high.jpg', { fallbackSrc: 'fallback.jpg' })
    );

    const mockElement = document.createElement('img');
    result.current.ref(mockElement);

    await waitFor(() => {
      expect(observerCallback).not.toBeNull();
    });

    if (observerCallback) {
      observerCallback(
        [{ isIntersecting: true, target: mockElement } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    }

    await waitFor(() => {
      expect(result.current.src).toBe('fallback.jpg');
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should keep low quality image if high quality and fallback fail', async () => {
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror();
          }
        }, 10);
      }
    } as any;

    const { result } = renderHook(() => 
      useLazyProgressiveImage('low.jpg', 'high.jpg')
    );

    const mockElement = document.createElement('img');
    result.current.ref(mockElement);

    await waitFor(() => {
      expect(observerCallback).not.toBeNull();
    });

    if (observerCallback) {
      observerCallback(
        [{ isIntersecting: true, target: mockElement } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    }

    await waitFor(() => {
      expect(result.current.src).toBe('low.jpg');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should not load until visible', () => {
    const { result } = renderHook(() => 
      useLazyProgressiveImage('low.jpg', 'high.jpg')
    );

    expect(result.current.isVisible).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});
