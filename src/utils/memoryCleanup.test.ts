/**
 * Tests for Memory Cleanup Utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  MemoryManager,
  createMemoryManager,
  CleanupTracker,
  ImageCacheManager,
  formatBytes,
  formatMemoryStats,
  type MemoryStats,
} from './memoryCleanup';
import { db } from '@/db/database';

// Mock the database
vi.mock('@/db/database', () => ({
  db: {
    metadata: {
      where: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(),
      delete: vi.fn(),
    },
    artwork: {
      where: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(),
      delete: vi.fn(),
    },
    librarySections: {
      clear: vi.fn(),
    },
  },
}));

describe('MemoryManager', () => {
  let queryClient: QueryClient;
  let memoryManager: MemoryManager;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    memoryManager = new MemoryManager(queryClient, {
      cleanupInterval: 1000,
      queryCacheMaxAge: 5000,
      dbCacheMaxAge: 10000,
      autoCleanup: false,
    });
  });

  afterEach(() => {
    memoryManager.stopCleanup();
    queryClient.clear();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const manager = new MemoryManager(queryClient);
      expect(manager).toBeInstanceOf(MemoryManager);
    });

    it('should create instance with custom config', () => {
      const manager = new MemoryManager(queryClient, {
        cleanupInterval: 2000,
        queryCacheMaxAge: 10000,
      });
      expect(manager).toBeInstanceOf(MemoryManager);
    });
  });

  describe('startCleanup', () => {
    it('should start automatic cleanup', () => {
      const spy = vi.spyOn(window, 'setInterval');
      memoryManager = new MemoryManager(queryClient, { autoCleanup: true });
      memoryManager.startCleanup();
      expect(spy).toHaveBeenCalled();
      memoryManager.stopCleanup();
    });

    it('should not start if already running', () => {
      const spy = vi.spyOn(console, 'warn');
      memoryManager = new MemoryManager(queryClient, { autoCleanup: true });
      memoryManager.startCleanup();
      memoryManager.startCleanup();
      expect(spy).toHaveBeenCalledWith('Memory cleanup is already running');
      memoryManager.stopCleanup();
    });

    it('should not start if autoCleanup is disabled', () => {
      const spy = vi.spyOn(console, 'log');
      memoryManager.startCleanup();
      expect(spy).toHaveBeenCalledWith('Automatic cleanup is disabled');
    });
  });

  describe('stopCleanup', () => {
    it('should stop automatic cleanup', () => {
      const spy = vi.spyOn(window, 'clearInterval');
      memoryManager = new MemoryManager(queryClient, { autoCleanup: true });
      memoryManager.startCleanup();
      memoryManager.stopCleanup();
      expect(spy).toHaveBeenCalled();
    });

    it('should handle stop when not running', () => {
      expect(() => memoryManager.stopCleanup()).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should clean up old query cache entries', async () => {
      // Add some queries
      queryClient.setQueryData(['test1'], { data: 'test1' });
      queryClient.setQueryData(['test2'], { data: 'test2' });

      // Mock old timestamps
      const queries = queryClient.getQueryCache().getAll();
      queries.forEach((query) => {
        query.state.dataUpdatedAt = Date.now() - 10000; // 10 seconds ago
      });

      const result = await memoryManager.cleanup();
      expect(result.queriesRemoved).toBe(2);
    });

    it('should clean up old database entries', async () => {
      const oldMetadata = [
        {
          ratingKey: '1',
          sectionId: 'section1',
          type: 'movie',
          data: { title: 'Test Movie' },
          cachedAt: Date.now() - 20000,
          lastModified: Date.now(),
          dirty: false,
        },
      ];

      const oldArtwork = [
        {
          url: 'http://example.com/image.jpg',
          blob: new Blob(['test'], { type: 'image/jpeg' }),
          mimeType: 'image/jpeg',
          size: 1024,
          cachedAt: Date.now() - 20000,
        },
      ];

      vi.mocked(db.metadata.where).mockReturnValue({
        below: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(oldMetadata),
        }),
      } as any);

      vi.mocked(db.artwork.where).mockReturnValue({
        below: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(oldArtwork),
        }),
      } as any);

      const result = await memoryManager.cleanup();
      expect(result.metadataRemoved).toBe(1);
      expect(result.artworkRemoved).toBe(1);
      expect(result.bytesFreed).toBeGreaterThan(0);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(db.metadata.where).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await memoryManager.cleanup();
      expect(result.metadataRemoved).toBe(0);
      expect(result.artworkRemoved).toBe(0);
    });
  });

  describe('getMemoryStats', () => {
    it('should return memory statistics', async () => {
      vi.mocked(db.metadata.toArray).mockResolvedValue([
        {
          ratingKey: '1',
          sectionId: 'section1',
          type: 'movie',
          data: { title: 'Test' },
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
      ]);

      vi.mocked(db.artwork.toArray).mockResolvedValue([
        {
          url: 'http://example.com/image.jpg',
          blob: new Blob(['test'], { type: 'image/jpeg' }),
          mimeType: 'image/jpeg',
          size: 1024,
          cachedAt: Date.now(),
        },
      ]);

      const stats = await memoryManager.getMemoryStats();
      expect(stats.queryCacheSize).toBeGreaterThanOrEqual(0);
      expect(stats.cachedMetadataCount).toBe(1);
      expect(stats.cachedArtworkCount).toBe(1);
      expect(stats.dbCacheSize).toBeGreaterThan(0);
    });

    it('should handle database errors', async () => {
      vi.mocked(db.metadata.toArray).mockRejectedValue(new Error('Database error'));

      const stats = await memoryManager.getMemoryStats();
      expect(stats.cachedMetadataCount).toBe(0);
      expect(stats.cachedArtworkCount).toBe(0);
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches', async () => {
      queryClient.setQueryData(['test'], { data: 'test' });
      await memoryManager.clearAllCaches();

      expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
      expect(db.metadata.clear).toHaveBeenCalled();
      expect(db.artwork.clear).toHaveBeenCalled();
      expect(db.librarySections.clear).toHaveBeenCalled();
    });
  });

  describe('clearQueryCache', () => {
    it('should clear only React Query cache', () => {
      queryClient.setQueryData(['test'], { data: 'test' });
      memoryManager.clearQueryCache();
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    });
  });

  describe('clearDatabaseCache', () => {
    it('should clear only IndexedDB cache', async () => {
      await memoryManager.clearDatabaseCache();
      expect(db.metadata.clear).toHaveBeenCalled();
      expect(db.artwork.clear).toHaveBeenCalled();
      expect(db.librarySections.clear).toHaveBeenCalled();
    });
  });
});

describe('createMemoryManager', () => {
  it('should create a MemoryManager instance', () => {
    const queryClient = new QueryClient();
    const manager = createMemoryManager(queryClient);
    expect(manager).toBeInstanceOf(MemoryManager);
  });

  it('should create with custom config', () => {
    const queryClient = new QueryClient();
    const manager = createMemoryManager(queryClient, {
      cleanupInterval: 2000,
    });
    expect(manager).toBeInstanceOf(MemoryManager);
  });
});

describe('CleanupTracker', () => {
  let tracker: CleanupTracker;

  beforeEach(() => {
    tracker = new CleanupTracker();
  });

  afterEach(() => {
    tracker.cleanup();
  });

  describe('add', () => {
    it('should add cleanup function', () => {
      const cleanup = vi.fn();
      tracker.add(cleanup);
      expect(tracker.size).toBe(1);
    });

    it('should add multiple cleanup functions', () => {
      tracker.add(vi.fn());
      tracker.add(vi.fn());
      tracker.add(vi.fn());
      expect(tracker.size).toBe(3);
    });
  });

  describe('addEventListener', () => {
    it('should add event listener and cleanup', () => {
      const listener = vi.fn();
      const element = document.createElement('div');
      const addSpy = vi.spyOn(element, 'addEventListener');
      const removeSpy = vi.spyOn(element, 'removeEventListener');

      tracker.addEventListener(element, 'click' as any, listener);
      expect(addSpy).toHaveBeenCalledWith('click', listener, undefined);

      tracker.cleanup();
      expect(removeSpy).toHaveBeenCalledWith('click', listener, undefined);
    });
  });

  describe('setTimeout', () => {
    it('should add timeout and cleanup', () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      const clearSpy = vi.spyOn(window, 'clearTimeout');

      const id = tracker.setTimeout(callback, 1000);
      expect(id).toBeDefined();

      tracker.cleanup();
      expect(clearSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('setInterval', () => {
    it('should add interval and cleanup', () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      const clearSpy = vi.spyOn(window, 'clearInterval');

      const id = tracker.setInterval(callback, 1000);
      expect(id).toBeDefined();

      tracker.cleanup();
      expect(clearSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('createAbortController', () => {
    it('should create AbortController and cleanup', () => {
      const controller = tracker.createAbortController();
      expect(controller).toBeInstanceOf(AbortController);
      expect(controller.signal.aborted).toBe(false);

      tracker.cleanup();
      expect(controller.signal.aborted).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should execute all cleanup functions', () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      const cleanup3 = vi.fn();

      tracker.add(cleanup1);
      tracker.add(cleanup2);
      tracker.add(cleanup3);

      tracker.cleanup();

      expect(cleanup1).toHaveBeenCalled();
      expect(cleanup2).toHaveBeenCalled();
      expect(cleanup3).toHaveBeenCalled();
      expect(tracker.size).toBe(0);
    });

    it('should handle cleanup errors gracefully', () => {
      const errorCleanup = vi.fn(() => {
        throw new Error('Cleanup error');
      });
      const normalCleanup = vi.fn();

      tracker.add(errorCleanup);
      tracker.add(normalCleanup);

      expect(() => tracker.cleanup()).not.toThrow();
      expect(errorCleanup).toHaveBeenCalled();
      expect(normalCleanup).toHaveBeenCalled();
    });
  });
});

describe('ImageCacheManager', () => {
  let cacheManager: ImageCacheManager;

  beforeEach(() => {
    cacheManager = new ImageCacheManager(3);
    // Mock URL.createObjectURL and revokeObjectURL for Node.js environment
    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = vi.fn((blob: Blob) => `blob:mock-${Math.random()}`);
    }
    if (!global.URL.revokeObjectURL) {
      global.URL.revokeObjectURL = vi.fn();
    }
  });

  afterEach(() => {
    cacheManager.clear();
  });

  describe('add', () => {
    it('should add image to cache', () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      cacheManager.add('key1', url);
      expect(cacheManager.size).toBe(1);
      expect(cacheManager.get('key1')).toBe(url);
    });

    it('should remove oldest entry when cache is full', () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });

      cacheManager.add('key1', URL.createObjectURL(blob));
      cacheManager.add('key2', URL.createObjectURL(blob));
      cacheManager.add('key3', URL.createObjectURL(blob));
      cacheManager.add('key4', URL.createObjectURL(blob));

      expect(cacheManager.size).toBe(3);
      expect(cacheManager.get('key1')).toBeUndefined();
      expect(cacheManager.get('key4')).toBeDefined();
    });
  });

  describe('get', () => {
    it('should return cached URL', () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      cacheManager.add('key1', url);
      expect(cacheManager.get('key1')).toBe(url);
    });

    it('should return undefined for non-existent key', () => {
      expect(cacheManager.get('nonexistent')).toBeUndefined();
    });
  });

  describe('revoke', () => {
    it('should revoke and remove URL', () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

      cacheManager.add('key1', url);
      cacheManager.revoke('key1');

      expect(revokeSpy).toHaveBeenCalledWith(url);
      expect(cacheManager.get('key1')).toBeUndefined();
    });

    it('should handle non-existent key', () => {
      expect(() => cacheManager.revoke('nonexistent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all cached images', () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

      cacheManager.add('key1', URL.createObjectURL(blob));
      cacheManager.add('key2', URL.createObjectURL(blob));
      cacheManager.add('key3', URL.createObjectURL(blob));

      cacheManager.clear();

      expect(revokeSpy).toHaveBeenCalledTimes(3);
      expect(cacheManager.size).toBe(0);
    });
  });
});

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(1610612736)).toBe('1.5 GB');
  });
});

describe('formatMemoryStats', () => {
  it('should format memory stats without heap info', () => {
    const stats: MemoryStats = {
      queryCacheSize: 10,
      dbCacheSize: 1048576,
      cachedMetadataCount: 100,
      cachedArtworkCount: 50,
    };

    const formatted = formatMemoryStats(stats);
    expect(formatted).toContain('React Query Cache: 10 queries');
    expect(formatted).toContain('IndexedDB Cache: 1 MB');
    expect(formatted).toContain('Cached Metadata: 100 items');
    expect(formatted).toContain('Cached Artwork: 50 items');
  });

  it('should format memory stats with heap info', () => {
    const stats: MemoryStats = {
      totalHeapSize: 50000000,
      usedHeapSize: 25000000,
      heapSizeLimit: 100000000,
      queryCacheSize: 10,
      dbCacheSize: 1048576,
      cachedMetadataCount: 100,
      cachedArtworkCount: 50,
    };

    const formatted = formatMemoryStats(stats);
    expect(formatted).toContain('Heap:');
    expect(formatted).toContain('25.0%');
  });
});
