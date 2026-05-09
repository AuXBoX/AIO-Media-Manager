# Memory Cleanup Guide

This guide explains how to use the memory cleanup utilities to prevent memory leaks and optimize memory usage during long sessions.

## Table of Contents

- [Overview](#overview)
- [Memory Manager](#memory-manager)
- [React Hooks](#react-hooks)
- [Cleanup Tracker](#cleanup-tracker)
- [Image Cache Manager](#image-cache-manager)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

The memory cleanup system provides utilities for:

1. **Automatic cache cleanup** - Removes old entries from React Query and IndexedDB
2. **Event listener cleanup** - Ensures event listeners are removed when components unmount
3. **Image cache management** - Manages object URLs and prevents blob memory leaks
4. **Memory monitoring** - Tracks memory usage and provides statistics

## Memory Manager

The `MemoryManager` class handles automatic cleanup of caches.

### Setup

```typescript
import { createMemoryManager } from '@/utils/memoryCleanup';
import { queryClient } from '@/api/queryClient';

// Create memory manager
const memoryManager = createMemoryManager(queryClient, {
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  queryCacheMaxAge: 30 * 60 * 1000, // 30 minutes
  dbCacheMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  autoCleanup: true,
});

// Start automatic cleanup
memoryManager.startCleanup();
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `cleanupInterval` | 5 minutes | How often to run cleanup |
| `queryCacheMaxAge` | 30 minutes | Max age for React Query cache entries |
| `dbCacheMaxAge` | 30 days | Max age for IndexedDB cache entries |
| `autoCleanup` | true | Enable automatic cleanup |

### Manual Cleanup

```typescript
// Run cleanup manually
const result = await memoryManager.cleanup();
console.log(`Removed ${result.queriesRemoved} queries`);
console.log(`Removed ${result.metadataRemoved} metadata items`);
console.log(`Freed ${result.bytesFreed} bytes`);

// Clear all caches (nuclear option)
await memoryManager.clearAllCaches();

// Clear only React Query cache
memoryManager.clearQueryCache();

// Clear only IndexedDB cache
await memoryManager.clearDatabaseCache();
```

### Memory Statistics

```typescript
import { formatMemoryStats } from '@/utils/memoryCleanup';

const stats = await memoryManager.getMemoryStats();
console.log(formatMemoryStats(stats));

// Output:
// Heap: 23.81 MB / 95.37 MB (25.0%)
// React Query Cache: 42 queries
// IndexedDB Cache: 15.2 MB
// Cached Metadata: 1,234 items
// Cached Artwork: 567 items
```

## React Hooks

### useCleanup

Automatically cleanup event listeners and subscriptions when component unmounts.

```typescript
import { useCleanup } from '@/hooks/useMemoryCleanup';

function MyComponent() {
  const cleanup = useCleanup();

  useEffect(() => {
    // Add event listener with automatic cleanup
    cleanup.addEventListener(window, 'resize', handleResize);

    // Add interval with automatic cleanup
    cleanup.setInterval(() => {
      console.log('tick');
    }, 1000);

    // Add timeout with automatic cleanup
    cleanup.setTimeout(() => {
      console.log('delayed');
    }, 5000);

    // Create AbortController with automatic cleanup
    const controller = cleanup.createAbortController();
    fetch('/api/data', { signal: controller.signal });
  }, []);

  return <div>Content</div>;
}
```

### useEventListener

Add event listeners with automatic cleanup.

```typescript
import { useEventListener } from '@/hooks/useMemoryCleanup';

function WindowResizeHandler() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEventListener(window, 'resize', () => {
    setSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  });

  return <div>Window: {size.width} x {size.height}</div>;
}
```

### useInterval

Manage intervals with automatic cleanup.

```typescript
import { useInterval } from '@/hooks/useMemoryCleanup';

function Timer() {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useInterval(
    () => {
      setCount((c) => c + 1);
    },
    isRunning ? 1000 : null // Pass null to pause
  );

  return (
    <div>
      <div>Count: {count}</div>
      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
}
```

### useTimeout

Manage timeouts with automatic cleanup.

```typescript
import { useTimeout } from '@/hooks/useMemoryCleanup';

function DelayedMessage() {
  const [show, setShow] = useState(false);

  useTimeout(() => {
    setShow(true);
  }, 3000);

  return show ? <div>Message appeared!</div> : null;
}
```

### useDebounce

Debounce values to reduce updates.

```typescript
import { useDebounce } from '@/hooks/useMemoryCleanup';

function SearchInput() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    // This only runs 500ms after user stops typing
    if (debouncedSearch) {
      performSearch(debouncedSearch);
    }
  }, [debouncedSearch]);

  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### useObjectURL

Manage object URLs with automatic cleanup.

```typescript
import { useObjectURL } from '@/hooks/useMemoryCleanup';

function ImagePreview({ blob }: { blob: Blob }) {
  const url = useObjectURL(blob);

  return url ? <img src={url} alt="Preview" /> : null;
}
```

### useObjectURLs

Manage multiple object URLs with automatic cleanup.

```typescript
import { useObjectURLs } from '@/hooks/useMemoryCleanup';

function ImageGallery({ blobs }: { blobs: Blob[] }) {
  const urls = useObjectURLs(blobs);

  return (
    <div className="grid grid-cols-3 gap-4">
      {urls.map((url, i) => (
        <img key={i} src={url} alt={`Image ${i}`} />
      ))}
    </div>
  );
}
```

### useImageCache

Manage image cache with automatic cleanup.

```typescript
import { useImageCache } from '@/hooks/useMemoryCleanup';

function ImageGallery() {
  const imageCache = useImageCache(50); // Cache up to 50 images

  const loadImage = async (url: string) => {
    // Check cache first
    const cached = imageCache.get(url);
    if (cached) return cached;

    // Fetch and cache
    const blob = await fetch(url).then((r) => r.blob());
    const objectUrl = URL.createObjectURL(blob);
    imageCache.add(url, objectUrl);
    return objectUrl;
  };

  // Use loadImage in your component...
}
```

### useAbortController

Create AbortController with automatic cleanup.

```typescript
import { useAbortController } from '@/hooks/useMemoryCleanup';

function DataFetcher() {
  const [data, setData] = useState(null);
  const abortController = useAbortController();

  useEffect(() => {
    fetch('/api/data', { signal: abortController.signal })
      .then((r) => r.json())
      .then(setData)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Fetch failed:', error);
        }
      });
  }, []);

  return data ? <div>{JSON.stringify(data)}</div> : <div>Loading...</div>;
}
```

### useSafeCallback

Create callback that's safe to call after unmount.

```typescript
import { useSafeCallback } from '@/hooks/useMemoryCleanup';

function AsyncComponent() {
  const [data, setData] = useState(null);
  const safeSetData = useSafeCallback(setData);

  useEffect(() => {
    // This is safe even if component unmounts before fetch completes
    fetchData().then(safeSetData);
  }, []);

  return data ? <div>{data}</div> : <div>Loading...</div>;
}
```

## Cleanup Tracker

The `CleanupTracker` class helps track and cleanup resources.

```typescript
import { CleanupTracker } from '@/utils/memoryCleanup';

class MyService {
  private cleanup = new CleanupTracker();

  start() {
    // Add event listener
    this.cleanup.addEventListener(window, 'resize', this.handleResize);

    // Add interval
    this.cleanup.setInterval(() => {
      this.poll();
    }, 5000);

    // Add custom cleanup
    this.cleanup.add(() => {
      console.log('Custom cleanup');
    });
  }

  stop() {
    // Cleanup all resources
    this.cleanup.cleanup();
  }

  private handleResize = () => {
    // Handle resize
  };

  private poll() {
    // Poll for updates
  }
}
```

## Image Cache Manager

The `ImageCacheManager` class manages object URLs for images.

```typescript
import { ImageCacheManager } from '@/utils/memoryCleanup';

const imageCache = new ImageCacheManager(100); // Cache up to 100 images

// Add image
const blob = await fetch(url).then((r) => r.blob());
const objectUrl = URL.createObjectURL(blob);
imageCache.add(url, objectUrl);

// Get cached image
const cachedUrl = imageCache.get(url);

// Revoke specific image
imageCache.revoke(url);

// Clear all images
imageCache.clear();
```

## Best Practices

### 1. Always Cleanup Event Listeners

```typescript
// ❌ Bad - Memory leak
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // Missing cleanup!
}, []);

// ✅ Good - Proper cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);

// ✅ Better - Use hook
useEventListener(window, 'resize', handleResize);
```

### 2. Cleanup Timers

```typescript
// ❌ Bad - Memory leak
useEffect(() => {
  const id = setInterval(() => {
    console.log('tick');
  }, 1000);
  // Missing cleanup!
}, []);

// ✅ Good - Proper cleanup
useEffect(() => {
  const id = setInterval(() => {
    console.log('tick');
  }, 1000);
  return () => {
    clearInterval(id);
  };
}, []);

// ✅ Better - Use hook
useInterval(() => {
  console.log('tick');
}, 1000);
```

### 3. Revoke Object URLs

```typescript
// ❌ Bad - Memory leak
const url = URL.createObjectURL(blob);
// URL is never revoked!

// ✅ Good - Proper cleanup
useEffect(() => {
  const url = URL.createObjectURL(blob);
  return () => {
    URL.revokeObjectURL(url);
  };
}, [blob]);

// ✅ Better - Use hook
const url = useObjectURL(blob);
```

### 4. Abort Fetch Requests

```typescript
// ❌ Bad - Request continues after unmount
useEffect(() => {
  fetch('/api/data')
    .then((r) => r.json())
    .then(setData);
}, []);

// ✅ Good - Abort on unmount
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then((r) => r.json())
    .then(setData)
    .catch((error) => {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    });

  return () => {
    controller.abort();
  };
}, []);

// ✅ Better - Use hook
const controller = useAbortController();
useEffect(() => {
  fetch('/api/data', { signal: controller.signal })
    .then((r) => r.json())
    .then(setData);
}, []);
```

### 5. Safe Callbacks

```typescript
// ❌ Bad - setState after unmount
useEffect(() => {
  fetchData().then((data) => {
    setData(data); // Error if component unmounted!
  });
}, []);

// ✅ Good - Check mounted state
useEffect(() => {
  let mounted = true;

  fetchData().then((data) => {
    if (mounted) {
      setData(data);
    }
  });

  return () => {
    mounted = false;
  };
}, []);

// ✅ Better - Use hook
const safeSetData = useSafeCallback(setData);
useEffect(() => {
  fetchData().then(safeSetData);
}, []);
```

### 6. Debounce Expensive Operations

```typescript
// ❌ Bad - Search on every keystroke
function SearchInput() {
  const [search, setSearch] = useState('');

  useEffect(() => {
    performSearch(search); // Too many requests!
  }, [search]);

  return <input value={search} onChange={(e) => setSearch(e.target.value)} />;
}

// ✅ Good - Debounce search
function SearchInput() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    if (debouncedSearch) {
      performSearch(debouncedSearch);
    }
  }, [debouncedSearch]);

  return <input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```

## Examples

### Complete Component Example

```typescript
import { useCleanup, useDebounce, useSafeCallback } from '@/hooks/useMemoryCleanup';

function DataViewer() {
  const [search, setSearch] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const cleanup = useCleanup();
  const debouncedSearch = useDebounce(search, 500);
  const safeSetData = useSafeCallback(setData);
  const safeSetLoading = useSafeCallback(setLoading);

  useEffect(() => {
    // Add window event listener
    cleanup.addEventListener(window, 'online', handleOnline);
    cleanup.addEventListener(window, 'offline', handleOffline);

    // Add polling interval
    cleanup.setInterval(() => {
      refreshData();
    }, 30000);
  }, []);

  useEffect(() => {
    if (!debouncedSearch) return;

    const controller = cleanup.createAbortController();

    safeSetLoading(true);
    fetch(`/api/search?q=${debouncedSearch}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        safeSetData(data);
        safeSetLoading(false);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Search failed:', error);
          safeSetLoading(false);
        }
      });
  }, [debouncedSearch]);

  const handleOnline = () => {
    console.log('Back online');
  };

  const handleOffline = () => {
    console.log('Gone offline');
  };

  const refreshData = () => {
    // Refresh data
  };

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
      />
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {data.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Service with Cleanup

```typescript
import { CleanupTracker } from '@/utils/memoryCleanup';

class WebSocketService {
  private cleanup = new CleanupTracker();
  private ws: WebSocket | null = null;

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.cleanup.addEventListener(this.ws, 'message', this.handleMessage);
    this.cleanup.addEventListener(this.ws, 'error', this.handleError);
    this.cleanup.addEventListener(this.ws, 'close', this.handleClose);

    // Add heartbeat
    this.cleanup.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Add custom cleanup
    this.cleanup.add(() => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    });
  }

  disconnect() {
    this.cleanup.cleanup();
  }

  private handleMessage = (event: MessageEvent) => {
    console.log('Message:', event.data);
  };

  private handleError = (event: Event) => {
    console.error('WebSocket error:', event);
  };

  private handleClose = () => {
    console.log('WebSocket closed');
  };
}
```

## Monitoring Memory Usage

```typescript
import { createMemoryManager, formatMemoryStats } from '@/utils/memoryCleanup';

// Create memory manager
const memoryManager = createMemoryManager(queryClient);
memoryManager.startCleanup();

// Add monitoring
setInterval(async () => {
  const stats = await memoryManager.getMemoryStats();
  console.log('Memory Stats:');
  console.log(formatMemoryStats(stats));

  // Alert if memory usage is high
  if (stats.usedHeapSize && stats.heapSizeLimit) {
    const percentage = (stats.usedHeapSize / stats.heapSizeLimit) * 100;
    if (percentage > 80) {
      console.warn('High memory usage detected!');
      await memoryManager.cleanup();
    }
  }
}, 60000); // Check every minute
```

## Summary

- Use `MemoryManager` for automatic cache cleanup
- Use React hooks for component-level cleanup
- Always cleanup event listeners, timers, and object URLs
- Use `CleanupTracker` for service-level cleanup
- Monitor memory usage in production
- Follow best practices to prevent memory leaks
