import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollectionManager } from './CollectionManager';
import { PlexClient } from '@/api/plexClient';

// Mock PlexClient
vi.mock('@/api/plexClient');

describe('CollectionManager', () => {
  let manager: CollectionManager;
  let mockClient: PlexClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any;

    manager = new CollectionManager(mockClient);
  });

  describe('getCollections', () => {
    it('should fetch collections for a library section', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              key: '/library/collections/123',
              title: 'Marvel Movies',
              summary: 'All Marvel movies',
              childCount: 25,
              addedAt: 1234567890,
              updatedAt: 1234567890,
              type: 'collection',
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const collections = await manager.getCollections('1');

      expect(mockClient.get).toHaveBeenCalledWith('/library/sections/1/collections');
      expect(collections).toHaveLength(1);
      expect(collections[0]?.title).toBe('Marvel Movies');
      expect(collections[0]?.childCount).toBe(25);
    });

    it('should return empty array when no collections exist', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const collections = await manager.getCollections('1');

      expect(collections).toEqual([]);
    });
  });

  describe('getCollection', () => {
    it('should fetch a specific collection', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              key: '/library/collections/123',
              title: 'Marvel Movies',
              summary: 'All Marvel movies',
              childCount: 25,
              addedAt: 1234567890,
              updatedAt: 1234567890,
              type: 'collection',
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const collection = await manager.getCollection('123');

      expect(mockClient.get).toHaveBeenCalledWith('/library/collections/123');
      expect(collection.title).toBe('Marvel Movies');
      expect(collection.ratingKey).toBe('123');
    });

    it('should throw error when collection not found', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      await expect(manager.getCollection('999')).rejects.toThrow('Collection not found: 999');
    });
  });

  describe('createCollection', () => {
    it('should create a new collection', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '456',
              key: '/library/collections/456',
              title: 'DC Movies',
              childCount: 0,
              addedAt: 1234567890,
              updatedAt: 1234567890,
              type: 'collection',
            },
          ],
        },
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const collection = await manager.createCollection('1', 'DC Movies');

      expect(mockClient.post).toHaveBeenCalledWith(
        '/library/collections',
        null,
        {
          params: {
            type: 1,
            title: 'DC Movies',
            sectionId: '1',
            smart: 0,
          },
        }
      );
      expect(collection.title).toBe('DC Movies');
      expect(collection.ratingKey).toBe('456');
    });

    it('should throw error when creation fails', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      await expect(manager.createCollection('1', 'Test')).rejects.toThrow(
        'Failed to create collection'
      );
    });
  });

  describe('deleteCollection', () => {
    it('should delete a collection', async () => {
      vi.mocked(mockClient.delete).mockResolvedValue(undefined);

      await manager.deleteCollection('123');

      expect(mockClient.delete).toHaveBeenCalledWith('/library/collections/123');
    });
  });

  describe('updateCollection', () => {
    it('should update collection title', async () => {
      vi.mocked(mockClient.put).mockResolvedValue(undefined);

      await manager.updateCollection('123', { title: 'Updated Title' });

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/metadata/123',
        null,
        {
          params: { title: 'Updated Title' },
        }
      );
    });

    it('should update collection summary', async () => {
      vi.mocked(mockClient.put).mockResolvedValue(undefined);

      await manager.updateCollection('123', { summary: 'New summary' });

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/metadata/123',
        null,
        {
          params: { summary: 'New summary' },
        }
      );
    });

    it('should update multiple fields', async () => {
      vi.mocked(mockClient.put).mockResolvedValue(undefined);

      await manager.updateCollection('123', {
        title: 'New Title',
        summary: 'New summary',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/metadata/123',
        null,
        {
          params: {
            title: 'New Title',
            summary: 'New summary',
          },
        }
      );
    });
  });

  describe('addToCollection', () => {
    it('should add single item to collection', async () => {
      vi.mocked(mockClient.put).mockResolvedValue(undefined);

      await manager.addToCollection('123', ['456']);

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/collections/123/items',
        null,
        {
          params: { uri: 'server://library/metadata/456' },
        }
      );
    });

    it('should add multiple items to collection', async () => {
      vi.mocked(mockClient.put).mockResolvedValue(undefined);

      await manager.addToCollection('123', ['456', '789', '101']);

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/collections/123/items',
        null,
        {
          params: {
            uri: 'server://library/metadata/456,server://library/metadata/789,server://library/metadata/101',
          },
        }
      );
    });
  });

  describe('removeFromCollection', () => {
    it('should remove item from collection', async () => {
      vi.mocked(mockClient.delete).mockResolvedValue(undefined);

      await manager.removeFromCollection('123', '456');

      expect(mockClient.delete).toHaveBeenCalledWith('/library/collections/123/items/456');
    });
  });

  describe('reorderInCollection', () => {
    it('should reorder item in collection', async () => {
      vi.mocked(mockClient.put).mockResolvedValue(undefined);

      await manager.reorderInCollection('123', '456', '789');

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/collections/123/items/456/move',
        null,
        {
          params: { after: '789' },
        }
      );
    });
  });
});
