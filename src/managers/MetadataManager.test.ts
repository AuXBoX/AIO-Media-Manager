import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetadataManager } from './MetadataManager';
import { PlexClient } from '@/api/plexClient';

// Mock PlexClient
vi.mock('@/api/plexClient');

describe('MetadataManager', () => {
  let manager: MetadataManager;
  let mockClient: PlexClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any;

    manager = new MetadataManager(mockClient);
  });

  describe('getMetadata', () => {
    it('should retrieve metadata for a single item', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              key: '/library/metadata/123',
              guid: 'plex://movie/123',
              type: 'movie',
              title: 'Test Movie',
              year: 2020,
              summary: 'A test movie',
              addedAt: 1609459200,
              updatedAt: 1609459200,
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await manager.getMetadata('123');

      expect(mockClient.get).toHaveBeenCalledWith('/library/metadata/123');
      expect(result.ratingKey).toBe('123');
      expect(result.title).toBe('Test Movie');
      expect(result.year).toBe(2020);
    });

    it('should throw error if metadata not found', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      await expect(manager.getMetadata('999')).rejects.toThrow(
        'Metadata not found for ratingKey: 999'
      );
    });

    it('should map all metadata fields correctly', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              key: '/library/metadata/123',
              guid: 'plex://movie/123',
              type: 'movie',
              title: 'Test Movie',
              originalTitle: 'Original Title',
              summary: 'A test movie',
              tagline: 'A great tagline',
              rating: 8.5,
              year: 2020,
              thumb: '/library/metadata/123/thumb',
              art: '/library/metadata/123/art',
              duration: 7200000,
              addedAt: 1609459200,
              updatedAt: 1609459200,
              studio: 'Test Studio',
              contentRating: 'PG-13',
              Genre: [{ tag: 'Action', id: '1' }, { tag: 'Drama', id: '2' }],
              Role: [
                { tag: 'Actor 1', role: 'Character 1', thumb: '/thumb1', id: '1' },
                { tag: 'Actor 2', role: 'Character 2', thumb: '/thumb2', id: '2' },
              ],
              Director: [{ tag: 'Director 1', id: '1' }],
              Writer: [{ tag: 'Writer 1', id: '1' }],
              viewCount: 5,
              lastViewedAt: 1609459200,
              userRating: 9,
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await manager.getMetadata('123');

      expect(result.originalTitle).toBe('Original Title');
      expect(result.tagline).toBe('A great tagline');
      expect(result.rating).toBe(8.5);
      expect(result.studio).toBe('Test Studio');
      expect(result.contentRating).toBe('PG-13');
      expect(result.genres).toHaveLength(2);
      expect(result.roles).toHaveLength(2);
      expect(result.directors).toHaveLength(1);
      expect(result.writers).toHaveLength(1);
      expect(result.viewCount).toBe(5);
      expect(result.userRating).toBe(9);
    });
  });

  describe('getChildren', () => {
    it('should retrieve children of a metadata item', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '124',
              key: '/library/metadata/124',
              guid: 'plex://season/124',
              type: 'season',
              title: 'Season 1',
              index: 1,
              parentRatingKey: '123',
              addedAt: 1609459200,
              updatedAt: 1609459200,
            },
            {
              ratingKey: '125',
              key: '/library/metadata/125',
              guid: 'plex://season/125',
              type: 'season',
              title: 'Season 2',
              index: 2,
              parentRatingKey: '123',
              addedAt: 1609459200,
              updatedAt: 1609459200,
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await manager.getChildren('123');

      expect(mockClient.get).toHaveBeenCalledWith('/library/metadata/123/children');
      expect(result).toHaveLength(2);
      expect(result[0]?.title).toBe('Season 1');
      expect(result[1]?.title).toBe('Season 2');
    });

    it('should return empty array if no children', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await manager.getChildren('123');

      expect(result).toEqual([]);
    });
  });

  describe('getGrandchildren', () => {
    it('should retrieve grandchildren of a metadata item', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '126',
              key: '/library/metadata/126',
              guid: 'plex://episode/126',
              type: 'episode',
              title: 'Episode 1',
              index: 1,
              parentIndex: 1,
              parentRatingKey: '124',
              grandparentRatingKey: '123',
              addedAt: 1609459200,
              updatedAt: 1609459200,
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await manager.getGrandchildren('123');

      expect(mockClient.get).toHaveBeenCalledWith('/library/metadata/123/grandchildren');
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Episode 1');
    });
  });

  describe('updateMetadata', () => {
    it('should update basic metadata fields', async () => {
      vi.mocked(mockClient.put).mockResolvedValue({});

      await manager.updateMetadata('123', {
        title: 'Updated Title',
        year: 2021,
        summary: 'Updated summary',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/metadata/123',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            title: 'Updated Title',
            year: 2021,
            summary: 'Updated summary',
          }),
        })
      );
    });

    it('should update genres', async () => {
      vi.mocked(mockClient.put).mockResolvedValue({});

      await manager.updateMetadata('123', {
        genres: ['Action', 'Drama', 'Thriller'],
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/metadata/123',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            'genre[0].tag.tag': 'Action',
            'genre[1].tag.tag': 'Drama',
            'genre[2].tag.tag': 'Thriller',
          }),
        })
      );
    });

    it('should update roles with character names', async () => {
      vi.mocked(mockClient.put).mockResolvedValue({});

      await manager.updateMetadata('123', {
        roles: [
          { tag: 'Actor 1', role: 'Character 1' },
          { tag: 'Actor 2', role: 'Character 2', thumb: '/thumb' },
        ],
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/metadata/123',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            'role[0].tag.tag': 'Actor 1',
            'role[0].tag.role': 'Character 1',
            'role[1].tag.tag': 'Actor 2',
            'role[1].tag.role': 'Character 2',
            'role[1].tag.thumb': '/thumb',
          }),
        })
      );
    });

    it('should update directors and writers', async () => {
      vi.mocked(mockClient.put).mockResolvedValue({});

      await manager.updateMetadata('123', {
        directors: ['Director 1', 'Director 2'],
        writers: ['Writer 1'],
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/metadata/123',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            'director[0].tag.tag': 'Director 1',
            'director[1].tag.tag': 'Director 2',
            'writer[0].tag.tag': 'Writer 1',
          }),
        })
      );
    });
  });

  describe('bulkUpdateMetadata', () => {
    it('should update multiple items successfully', async () => {
      vi.mocked(mockClient.put).mockResolvedValue({});

      const result = await manager.bulkUpdateMetadata(['123', '124', '125'], {
        studio: 'New Studio',
        contentRating: 'PG',
      });

      expect(mockClient.put).toHaveBeenCalledTimes(3);
      expect(result.total).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
      vi.mocked(mockClient.put)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce({});

      const result = await manager.bulkUpdateMetadata(['123', '124', '125'], {
        title: 'Updated',
      });

      expect(result.total).toBe(3);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.ratingKey).toBe('124');
    });
  });

  describe('matchMetadata', () => {
    it('should match metadata to a GUID', async () => {
      vi.mocked(mockClient.put).mockResolvedValue({});

      await manager.matchMetadata('123', 'tmdb://movie/12345');

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/metadata/123/match',
        null,
        expect.objectContaining({
          params: { guid: 'tmdb://movie/12345' },
        })
      );
    });
  });

  describe('unmatchMetadata', () => {
    it('should unmatch metadata', async () => {
      vi.mocked(mockClient.delete).mockResolvedValue({});

      await manager.unmatchMetadata('123');

      expect(mockClient.delete).toHaveBeenCalledWith('/library/metadata/123/match');
    });
  });

  describe('getMatchCandidates', () => {
    it('should retrieve match candidates', async () => {
      const mockResponse = {
        MediaContainer: {
          SearchResult: [
            {
              guid: 'tmdb://movie/12345',
              score: 95,
              name: 'Test Movie',
              year: 2020,
              thumb: '/thumb',
              summary: 'A test movie',
            },
            {
              guid: 'tmdb://movie/67890',
              score: 85,
              title: 'Another Movie',
              year: 2020,
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await manager.getMatchCandidates('123');

      expect(mockClient.get).toHaveBeenCalledWith('/library/metadata/123/matches');
      expect(result).toHaveLength(2);
      expect(result[0]?.guid).toBe('tmdb://movie/12345');
      expect(result[0]?.score).toBe(95);
      expect(result[0]?.title).toBe('Test Movie');
      expect(result[1]?.title).toBe('Another Movie');
    });

    it('should return empty array if no candidates', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await manager.getMatchCandidates('123');

      expect(result).toEqual([]);
    });
  });

  describe('bulkMatch', () => {
    it('should match multiple items to best candidates', async () => {
      const mockCandidates = {
        MediaContainer: {
          SearchResult: [
            {
              guid: 'tmdb://movie/12345',
              score: 95,
              name: 'Test Movie',
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockCandidates);
      vi.mocked(mockClient.put).mockResolvedValue({});

      const result = await manager.bulkMatch(['123', '124']);

      expect(mockClient.get).toHaveBeenCalledTimes(2);
      expect(mockClient.put).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle items with no candidates', async () => {
      const mockCandidates = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockCandidates);

      const result = await manager.bulkMatch(['123']);

      expect(result.total).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]?.error).toBe('No match candidates found');
    });
  });

  describe('getArtwork', () => {
    it('should retrieve artwork for an item', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              thumb: '/library/metadata/123/thumb',
              art: '/library/metadata/123/art',
              banner: '/library/metadata/123/banner',
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await manager.getArtwork('123');

      expect(result).toHaveLength(3);
      expect(result[0]?.type).toBe('poster');
      expect(result[1]?.type).toBe('background');
      expect(result[2]?.type).toBe('banner');
    });

    it('should return empty array if no artwork', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [{ ratingKey: '123' }],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await manager.getArtwork('123');

      expect(result).toEqual([]);
    });
  });

  describe('uploadArtwork', () => {
    it('should upload poster artwork', async () => {
      const mockFile = new File(['test'], 'poster.jpg', { type: 'image/jpeg' });
      vi.mocked(mockClient.post).mockResolvedValue({});

      await manager.uploadArtwork('123', mockFile, 'poster');

      expect(mockClient.post).toHaveBeenCalledWith(
        '/library/metadata/123/poster',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      );
    });

    it('should upload background artwork', async () => {
      const mockFile = new File(['test'], 'background.jpg', { type: 'image/jpeg' });
      vi.mocked(mockClient.post).mockResolvedValue({});

      await manager.uploadArtwork('123', mockFile, 'background');

      expect(mockClient.post).toHaveBeenCalledWith(
        '/library/metadata/123/art',
        expect.any(FormData),
        expect.any(Object)
      );
    });
  });

  describe('selectArtwork', () => {
    it('should select artwork from URL', async () => {
      vi.mocked(mockClient.put).mockResolvedValue({});

      await manager.selectArtwork('123', 'https://example.com/poster.jpg', 'poster');

      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/metadata/123/poster',
        null,
        expect.objectContaining({
          params: { url: 'https://example.com/poster.jpg' },
        })
      );
    });
  });

  describe('deleteArtwork', () => {
    it('should delete artwork', async () => {
      vi.mocked(mockClient.delete).mockResolvedValue({});

      await manager.deleteArtwork('123', 'poster');

      expect(mockClient.delete).toHaveBeenCalledWith('/library/metadata/123/poster');
    });
  });

  describe('refreshMetadata', () => {
    it('should refresh metadata for an item', async () => {
      vi.mocked(mockClient.put).mockResolvedValue({});

      await manager.refreshMetadata('123');

      expect(mockClient.put).toHaveBeenCalledWith('/library/metadata/123/refresh');
    });
  });

  describe('bulkRefresh', () => {
    it('should refresh multiple items', async () => {
      vi.mocked(mockClient.put).mockResolvedValue({});

      const result = await manager.bulkRefresh(['123', '124', '125']);

      expect(mockClient.put).toHaveBeenCalledTimes(3);
      expect(result.total).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should handle refresh failures', async () => {
      vi.mocked(mockClient.put)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Refresh failed'))
        .mockResolvedValueOnce({});

      const result = await manager.bulkRefresh(['123', '124', '125']);

      expect(result.total).toBe(3);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors[0]?.ratingKey).toBe('124');
    });
  });
});
