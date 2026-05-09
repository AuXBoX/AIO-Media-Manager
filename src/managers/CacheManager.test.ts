import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CacheManager } from './CacheManager';
import { PlexClient } from '@/api/plexClient';
import { db } from '@/db/database';
import { MetadataItem } from './MetadataManager';

// Mock the database
vi.mock('@/db/database', () => {
  const mockDb = {
    metadata: {
      get: vi.fn(),
      put: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
        })),
        below: vi.fn(() => ({
          delete: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      clear: vi.fn(),
    },
    artwork: {
      get: vi.fn(),
      put: vi.fn(),
      where: vi.fn(() => ({
        below: vi.fn(() => ({
          delete: vi.fn(),
        })),
      })),
      toArray: vi.fn(),
      clear: vi.fn(),
    },
    librarySections: {
      put: vi.fn(),
      clear: vi.fn(),
    },
    offlineChanges: {
      add: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
    },
  };
  return { db: mockDb };
});

// Mock fetch
global.fetch = vi.fn();

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let mockClient: PlexClient;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      get: vi.fn(),
      put: vi.fn(),
      post: vi.fn(),
      config: {
        baseURL: 'http://localhost:32400',
        token: 'test-token',
      },
    } as any;

    cacheManager = new CacheManager(mockClient);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cacheMetadata', () => {
    it('should cache a metadata item', async () => {
      const item: MetadataItem = {
        ratingKey: '123',
        key: '/library/metadata/123',
        guid: 'plex://movie/123',
        type: 'movie',
        title: 'Test Movie',
        addedAt: Date.now(),
        updatedAt: Date.now(),
        librarySectionID: '1',
      };

      await cacheManager.cacheMetadata(item);

      expect(db.metadata.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ratingKey: '123',
          sectionId: '1',
          type: 'movie',
          data: item,
          dirty: false,
        })
      );
    });

    it('should handle items without librarySectionID', async () => {
      const item: MetadataItem = {
        ratingKey: '456',
        key: '/library/metadata/456',
        guid: 'plex://movie/456',
        type: 'movie',
        title: 'Test Movie 2',
        addedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await cacheManager.cacheMetadata(item);

      expect(db.metadata.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ratingKey: '456',
          sectionId: '',
          type: 'movie',
        })
      );
    });
  });

  describe('cacheArtwork', () => {
    it('should cache artwork blob', async () => {
      const url = 'http://example.com/image.jpg';
      const blob = new Blob(['test'], { type: 'image/jpeg' });

      const result = await cacheManager.cacheArtwork(url, blob);

      expect(result).toBe(url);
      expect(db.artwork.put).toHaveBeenCalledWith(
        expect.objectContaining({
          url,
          blob,
          mimeType: 'image/jpeg',
          size: blob.size,
        })
      );
    });
  });

  describe('getCachedMetadata', () => {
    it('should return cached metadata if available', async () => {
      const item: MetadataItem = {
        ratingKey: '123',
        key: '/library/metadata/123',
        guid: 'plex://movie/123',
        type: 'movie',
        title: 'Test Movie',
        addedAt: Date.now(),
        updatedAt: Date.now(),
      };

      vi.mocked(db.metadata.get).mockResolvedValue({
        ratingKey: '123',
        sectionId: '1',
        type: 'movie',
        data: item,
        cachedAt: Date.now(),
        lastModified: Date.now(),
        dirty: false,
      });

      const result = await cacheManager.getCachedMetadata('123');

      expect(result).toEqual(item);
      expect(db.metadata.get).toHaveBeenCalledWith('123');
    });

    it('should return null if metadata not cached', async () => {
      vi.mocked(db.metadata.get).mockResolvedValue(undefined);

      const result = await cacheManager.getCachedMetadata('999');

      expect(result).toBeNull();
    });
  });

  describe('getCachedArtwork', () => {
    it('should return cached artwork if available', async () => {
      const url = 'http://example.com/image.jpg';
      const blob = new Blob(['test'], { type: 'image/jpeg' });

      vi.mocked(db.artwork.get).mockResolvedValue({
        url,
        blob,
        mimeType: 'image/jpeg',
        size: blob.size,
        cachedAt: Date.now(),
      });

      const result = await cacheManager.getCachedArtwork(url);

      expect(result).toEqual(blob);
    });

    it('should return null if artwork not cached', async () => {
      vi.mocked(db.artwork.get).mockResolvedValue(undefined);

      const result = await cacheManager.getCachedArtwork('http://example.com/missing.jpg');

      expect(result).toBeNull();
    });
  });

  describe('getCachedLibraryItems', () => {
    it('should return paginated cached items', async () => {
      const items = [
        {
          ratingKey: '1',
          sectionId: '1',
          type: 'movie',
          data: { ratingKey: '1', title: 'Movie 1' } as MetadataItem,
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
        {
          ratingKey: '2',
          sectionId: '1',
          type: 'movie',
          data: { ratingKey: '2', title: 'Movie 2' } as MetadataItem,
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
      ];

      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(items),
        })),
      }));

      vi.mocked(db.metadata.where).mockImplementation(mockWhere as any);

      const result = await cacheManager.getCachedLibraryItems('1', {
        offset: 0,
        limit: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.totalSize).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.size).toBe(2);
    });

    it('should filter by type', async () => {
      const items = [
        {
          ratingKey: '1',
          sectionId: '1',
          type: '1', // movie type as string
          data: { ratingKey: '1', title: 'Movie 1' } as MetadataItem,
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
        {
          ratingKey: '2',
          sectionId: '1',
          type: '2', // show type as string
          data: { ratingKey: '2', title: 'Show 1' } as MetadataItem,
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
      ];

      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(items),
        })),
      }));

      vi.mocked(db.metadata.where).mockImplementation(mockWhere as any);

      const result = await cacheManager.getCachedLibraryItems('1', {
        type: 1, // movie type
        offset: 0,
        limit: 10,
      });

      // Should only return movie type (type: '1' matches type: 1 as string)
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Movie 1');
    });

    it('should handle pagination', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        ratingKey: String(i),
        sectionId: '1',
        type: 'movie',
        data: { ratingKey: String(i), title: `Movie ${i}` } as MetadataItem,
        cachedAt: Date.now(),
        lastModified: Date.now(),
        dirty: false,
      }));

      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(items),
        })),
      }));

      vi.mocked(db.metadata.where).mockImplementation(mockWhere as any);

      const result = await cacheManager.getCachedLibraryItems('1', {
        offset: 10,
        limit: 20,
      });

      expect(result.items).toHaveLength(20);
      expect(result.offset).toBe(10);
      expect(result.totalSize).toBe(100);
      expect(result.items[0].title).toBe('Movie 10');
    });
  });

  describe('queueOfflineChange', () => {
    it('should queue an offline change', async () => {
      const change = {
        id: 'test-id',
        timestamp: Date.now(),
        type: 'update' as const,
        ratingKey: '123',
        data: { title: 'New Title' },
        synced: false,
      };

      vi.mocked(db.metadata.get).mockResolvedValue({
        ratingKey: '123',
        sectionId: '1',
        type: 'movie',
        data: {} as MetadataItem,
        cachedAt: Date.now(),
        lastModified: Date.now(),
        dirty: false,
      });

      await cacheManager.queueOfflineChange(change);

      expect(db.offlineChanges.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id',
          type: 'update',
          ratingKey: '123',
          synced: false,
        })
      );

      // Should mark metadata as dirty
      expect(db.metadata.put).toHaveBeenCalledWith(
        expect.objectContaining({
          dirty: true,
        })
      );
    });

    it('should generate ID if not provided', async () => {
      const change = {
        timestamp: Date.now(),
        type: 'update' as const,
        ratingKey: '123',
        data: { title: 'New Title' },
        synced: false,
      } as any;

      vi.mocked(db.metadata.get).mockResolvedValue(undefined);

      await cacheManager.queueOfflineChange(change);

      expect(db.offlineChanges.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^[0-9a-f-]{36}$/),
          type: 'update',
        })
      );
    });
  });

  describe('getOfflineChanges', () => {
    it('should return unsynced changes', async () => {
      const changes = [
        {
          id: '1',
          timestamp: Date.now(),
          type: 'update' as const,
          ratingKey: '123',
          data: { title: 'New Title' },
          synced: false,
        },
        {
          id: '2',
          timestamp: Date.now(),
          type: 'match' as const,
          ratingKey: '456',
          data: { guid: 'tmdb://123' },
          synced: false,
        },
      ];

      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(changes),
        })),
      }));

      vi.mocked(db.offlineChanges.where).mockImplementation(mockWhere as any);

      const result = await cacheManager.getOfflineChanges();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });
  });

  describe('syncOfflineChanges', () => {
    it('should sync changes without conflicts', async () => {
      const changes = [
        {
          id: '1',
          timestamp: Date.now() - 1000,
          type: 'update' as const,
          ratingKey: '123',
          data: { title: 'New Title' },
          synced: false,
        },
      ];

      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(changes),
        })),
      }));

      vi.mocked(db.offlineChanges.where).mockImplementation(mockWhere as any);

      vi.mocked(mockClient.get).mockResolvedValue({
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              updatedAt: Date.now() - 2000, // Older than change
              title: 'Old Title',
            },
          ],
        },
      });

      vi.mocked(mockClient.put).mockResolvedValue({});
      vi.mocked(db.offlineChanges.get).mockResolvedValue(changes[0]);

      const result = await cacheManager.syncOfflineChanges();

      expect(result.total).toBe(1);
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect conflicts', async () => {
      const changes = [
        {
          id: '1',
          timestamp: Date.now() - 2000,
          type: 'update' as const,
          ratingKey: '123',
          data: { title: 'New Title' },
          synced: false,
        },
      ];

      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(changes),
        })),
      }));

      vi.mocked(db.offlineChanges.where).mockImplementation(mockWhere as any);

      vi.mocked(mockClient.get).mockResolvedValue({
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              updatedAt: Date.now() - 1000, // Newer than change
              title: 'Server Title',
            },
          ],
        },
      });

      const result = await cacheManager.syncOfflineChanges();

      expect(result.total).toBe(1);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe('manual');
    });

    it('should handle sync failures', async () => {
      const changes = [
        {
          id: '1',
          timestamp: Date.now(),
          type: 'update' as const,
          ratingKey: '123',
          data: { title: 'New Title' },
          synced: false,
        },
      ];

      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(changes),
        })),
      }));

      vi.mocked(db.offlineChanges.where).mockImplementation(mockWhere as any);
      vi.mocked(mockClient.get).mockRejectedValue(new Error('Network error'));
      vi.mocked(db.offlineChanges.get).mockResolvedValue(changes[0]);

      const result = await cacheManager.syncOfflineChanges();

      expect(result.total).toBe(1);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('getCacheSize', () => {
    it('should calculate total cache size', async () => {
      const metadataRecords = [
        {
          ratingKey: '1',
          sectionId: '1',
          type: 'movie',
          data: { title: 'Movie 1' },
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
      ];

      const artworkRecords = [
        {
          url: 'http://example.com/image.jpg',
          blob: new Blob(['test']),
          mimeType: 'image/jpeg',
          size: 1024,
          cachedAt: Date.now(),
        },
      ];

      vi.mocked(db.metadata.toArray).mockResolvedValue(metadataRecords);
      vi.mocked(db.artwork.toArray).mockResolvedValue(artworkRecords);

      const size = await cacheManager.getCacheSize();

      expect(size).toBeGreaterThan(0);
      expect(size).toBeGreaterThanOrEqual(1024); // At least artwork size
    });
  });

  describe('clearCache', () => {
    it('should clear all cache when no date provided', async () => {
      await cacheManager.clearCache();

      expect(db.metadata.clear).toHaveBeenCalled();
      expect(db.artwork.clear).toHaveBeenCalled();
      expect(db.librarySections.clear).toHaveBeenCalled();
    });

    it('should clear only old cache when date provided', async () => {
      const olderThan = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const mockMetadataWhere = vi.fn(() => ({
        below: vi.fn(() => ({
          delete: vi.fn(),
        })),
      }));

      const mockArtworkWhere = vi.fn(() => ({
        below: vi.fn(() => ({
          delete: vi.fn(),
        })),
      }));

      vi.mocked(db.metadata.where).mockImplementation(mockMetadataWhere as any);
      vi.mocked(db.artwork.where).mockImplementation(mockArtworkWhere as any);

      await cacheManager.clearCache(olderThan);

      expect(db.metadata.where).toHaveBeenCalledWith('cachedAt');
      expect(db.artwork.where).toHaveBeenCalledWith('cachedAt');
      expect(db.metadata.clear).not.toHaveBeenCalled();
    });
  });

  describe('isCacheAvailable', () => {
    it('should return true if metadata is cached', async () => {
      vi.mocked(db.metadata.get).mockResolvedValue({
        ratingKey: '123',
        sectionId: '1',
        type: 'movie',
        data: {} as MetadataItem,
        cachedAt: Date.now(),
        lastModified: Date.now(),
        dirty: false,
      });

      const result = await cacheManager.isCacheAvailable('123');

      expect(result).toBe(true);
    });

    it('should return false if metadata is not cached', async () => {
      vi.mocked(db.metadata.get).mockResolvedValue(undefined);

      const result = await cacheManager.isCacheAvailable('999');

      expect(result).toBe(false);
    });
  });

  describe('cacheLibrarySection', () => {
    it('should cache library section with pagination', async () => {
      const mockItems = Array.from({ length: 150 }, (_, i) => ({
        ratingKey: String(i),
        key: `/library/metadata/${i}`,
        guid: `plex://movie/${i}`,
        type: 'movie',
        title: `Movie ${i}`,
        addedAt: Date.now(),
        updatedAt: Date.now(),
        librarySectionID: '1',
      }));

      // Mock first page
      vi.mocked(mockClient.get)
        .mockResolvedValueOnce({
          MediaContainer: {
            Metadata: mockItems.slice(0, 100),
            totalSize: 150,
          },
        })
        // Mock second page
        .mockResolvedValueOnce({
          MediaContainer: {
            Metadata: mockItems.slice(100, 150),
            totalSize: 150,
          },
        });

      vi.mocked(db.artwork.get).mockResolvedValue(undefined);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'])),
      } as Response);

      const progressEvents: any[] = [];
      cacheManager.on('cache-progress', (data) => progressEvents.push(data));

      await cacheManager.cacheLibrarySection('1');

      expect(db.metadata.put).toHaveBeenCalledTimes(150);
      expect(db.librarySections.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: '1',
          itemCount: 150,
        })
      );

      // Should emit progress events
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1].progress).toBe(100);
    });
  });

  describe('event emitter', () => {
    it('should emit and listen to events', () => {
      const listener = vi.fn();
      cacheManager.on('test-event', listener);

      cacheManager['emit']('test-event', { data: 'test' });

      expect(listener).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should remove event listeners', () => {
      const listener = vi.fn();
      cacheManager.on('test-event', listener);
      cacheManager.off('test-event', listener);

      cacheManager['emit']('test-event', { data: 'test' });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners for same event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      cacheManager.on('test-event', listener1);
      cacheManager.on('test-event', listener2);

      cacheManager['emit']('test-event', { data: 'test' });

      expect(listener1).toHaveBeenCalledWith({ data: 'test' });
      expect(listener2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should not error when emitting event with no listeners', () => {
      expect(() => {
        cacheManager['emit']('non-existent-event', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('sortItems', () => {
    it('should sort items by field ascending', async () => {
      const items = [
        {
          ratingKey: '3',
          sectionId: '1',
          type: 'movie',
          data: { ratingKey: '3', title: 'C Movie', year: 2020 } as MetadataItem,
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
        {
          ratingKey: '1',
          sectionId: '1',
          type: 'movie',
          data: { ratingKey: '1', title: 'A Movie', year: 2018 } as MetadataItem,
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
        {
          ratingKey: '2',
          sectionId: '1',
          type: 'movie',
          data: { ratingKey: '2', title: 'B Movie', year: 2019 } as MetadataItem,
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
      ];

      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(items),
        })),
      }));

      vi.mocked(db.metadata.where).mockImplementation(mockWhere as any);

      const result = await cacheManager.getCachedLibraryItems('1', {
        sort: 'title:asc',
        offset: 0,
        limit: 10,
      });

      expect(result.items[0].title).toBe('A Movie');
      expect(result.items[1].title).toBe('B Movie');
      expect(result.items[2].title).toBe('C Movie');
    });

    it('should sort items by field descending', async () => {
      const items = [
        {
          ratingKey: '1',
          sectionId: '1',
          type: 'movie',
          data: { ratingKey: '1', title: 'Movie 1', year: 2018 } as MetadataItem,
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
        {
          ratingKey: '2',
          sectionId: '1',
          type: 'movie',
          data: { ratingKey: '2', title: 'Movie 2', year: 2020 } as MetadataItem,
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
        {
          ratingKey: '3',
          sectionId: '1',
          type: 'movie',
          data: { ratingKey: '3', title: 'Movie 3', year: 2019 } as MetadataItem,
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
      ];

      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(items),
        })),
      }));

      vi.mocked(db.metadata.where).mockImplementation(mockWhere as any);

      const result = await cacheManager.getCachedLibraryItems('1', {
        sort: 'year:desc',
        offset: 0,
        limit: 10,
      });

      expect(result.items[0].year).toBe(2020);
      expect(result.items[1].year).toBe(2019);
      expect(result.items[2].year).toBe(2018);
    });

    it('should handle items with undefined sort field', async () => {
      const items = [
        {
          ratingKey: '1',
          sectionId: '1',
          type: 'movie',
          data: { ratingKey: '1', title: 'Movie 1', year: 2020 } as MetadataItem,
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
        {
          ratingKey: '2',
          sectionId: '1',
          type: 'movie',
          data: { ratingKey: '2', title: 'Movie 2' } as MetadataItem, // No year
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
      ];

      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue(items),
        })),
      }));

      vi.mocked(db.metadata.where).mockImplementation(mockWhere as any);

      const result = await cacheManager.getCachedLibraryItems('1', {
        sort: 'year:asc',
        offset: 0,
        limit: 10,
      });

      // Items with undefined should be sorted to the end
      expect(result.items).toHaveLength(2);
      expect(result.items[0].year).toBe(2020);
      expect(result.items[1].year).toBeUndefined();
    });
  });

  describe('cacheArtworkUrl (private)', () => {
    it('should skip caching if artwork already exists', async () => {
      vi.mocked(db.artwork.get).mockResolvedValue({
        url: 'http://example.com/image.jpg',
        blob: new Blob(['test']),
        mimeType: 'image/jpeg',
        size: 1024,
        cachedAt: Date.now(),
      });

      vi.mocked(mockClient.get).mockResolvedValue({
        MediaContainer: {
          Metadata: [],
          totalSize: 0,
        },
      });

      await cacheManager.cacheLibrarySection('1');

      // Should not fetch artwork if already cached
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle artwork fetch failures gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.mocked(mockClient.get).mockResolvedValue({
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '1',
              key: '/library/metadata/1',
              guid: 'plex://movie/1',
              type: 'movie',
              title: 'Test Movie',
              thumb: '/library/metadata/1/thumb',
              addedAt: Date.now(),
              updatedAt: Date.now(),
              librarySectionID: '1',
            },
          ],
          totalSize: 1,
        },
      });

      vi.mocked(db.artwork.get).mockResolvedValue(undefined);
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await cacheManager.cacheLibrarySection('1');

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('applyChange (private)', () => {
    it('should apply match change', async () => {
      const change = {
        id: '1',
        timestamp: Date.now() - 1000,
        type: 'match' as const,
        ratingKey: '123',
        data: { guid: 'tmdb://123' },
        synced: false,
      };

      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([change]),
        })),
      }));

      vi.mocked(db.offlineChanges.where).mockImplementation(mockWhere as any);

      vi.mocked(mockClient.get).mockResolvedValue({
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              updatedAt: Date.now() - 2000,
              title: 'Old Title',
            },
          ],
        },
      });

      vi.mocked(mockClient.put).mockResolvedValue({});
      vi.mocked(db.offlineChanges.get).mockResolvedValue(change);

      const result = await cacheManager.syncOfflineChanges();

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/metadata/123/match',
        null,
        expect.objectContaining({
          params: { guid: 'tmdb://123' },
        })
      );
      expect(result.synced).toBe(1);
    });

    it('should apply artwork change', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const change = {
        id: '1',
        timestamp: Date.now() - 1000,
        type: 'artwork' as const,
        ratingKey: '123',
        data: { file, type: 'poster' },
        synced: false,
      };

      const mockWhere = vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([change]),
        })),
      }));

      vi.mocked(db.offlineChanges.where).mockImplementation(mockWhere as any);

      vi.mocked(mockClient.get).mockResolvedValue({
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              updatedAt: Date.now() - 2000,
              title: 'Old Title',
            },
          ],
        },
      });

      vi.mocked(mockClient.post).mockResolvedValue({});
      vi.mocked(db.offlineChanges.get).mockResolvedValue(change);

      const result = await cacheManager.syncOfflineChanges();

      expect(mockClient.post).toHaveBeenCalledWith(
        '/library/metadata/123/poster',
        expect.any(FormData)
      );
      expect(result.synced).toBe(1);
    });
  });
});
