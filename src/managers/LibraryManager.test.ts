import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryManager } from './LibraryManager';
import { PlexClient } from '@/api/plexClient';

// Mock PlexClient
vi.mock('@/api/plexClient');

describe('LibraryManager', () => {
  let libraryManager: LibraryManager;
  let mockClient: PlexClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any;

    libraryManager = new LibraryManager(mockClient);
  });

  describe('getLibrarySections', () => {
    it('should return all library sections', async () => {
      const mockResponse = {
        MediaContainer: {
          Directory: [
            {
              key: '1',
              title: 'Music',
              type: 'artist',
              agent: 'tv.plex.agents.music',
              scanner: 'Plex Music',
              language: 'en',
              uuid: 'uuid-1',
              updatedAt: 1234567890,
              createdAt: 1234567890,
              scannedAt: 1234567890,
              content: 1,
              directory: 1,
              contentChangedAt: 1234567890,
              hidden: 0,
              Location: [{ id: 1, path: '/music' }],
            },
            {
              key: '2',
              title: 'Movies',
              type: 'movie',
              agent: 'tv.plex.agents.movie',
              scanner: 'Plex Movie',
              language: 'en',
              uuid: 'uuid-2',
              updatedAt: 1234567890,
              createdAt: 1234567890,
              scannedAt: 1234567890,
              content: 1,
              directory: 1,
              contentChangedAt: 1234567890,
              hidden: 0,
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const sections = await libraryManager.getLibrarySections();

      expect(mockClient.get).toHaveBeenCalledWith('/library/sections');
      expect(sections).toHaveLength(2);
      expect(sections[0]).toEqual({
        key: '1',
        title: 'Music',
        type: 'artist',
        agent: 'tv.plex.agents.music',
        scanner: 'Plex Music',
        language: 'en',
        uuid: 'uuid-1',
        updatedAt: 1234567890,
        createdAt: 1234567890,
        scannedAt: 1234567890,
        content: true,
        directory: true,
        contentChangedAt: 1234567890,
        hidden: 0,
        Location: [{ id: 1, path: '/music' }],
      });
    });

    it('should return empty array when no sections exist', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const sections = await libraryManager.getLibrarySections();

      expect(sections).toEqual([]);
    });

    it('should handle API errors', async () => {
      vi.mocked(mockClient.get).mockRejectedValue(new Error('API Error'));

      await expect(libraryManager.getLibrarySections()).rejects.toThrow('API Error');
    });
  });

  describe('getLibrarySection', () => {
    it('should return a specific library section', async () => {
      const mockResponse = {
        MediaContainer: {
          key: '1',
          title: 'Music',
          type: 'artist',
          agent: 'tv.plex.agents.music',
          scanner: 'Plex Music',
          language: 'en',
          uuid: 'uuid-1',
          updatedAt: 1234567890,
          createdAt: 1234567890,
          scannedAt: 1234567890,
          content: 1,
          directory: 1,
          contentChangedAt: 1234567890,
          hidden: 0,
          Location: [{ id: 1, path: '/music' }],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const section = await libraryManager.getLibrarySection('1');

      expect(mockClient.get).toHaveBeenCalledWith('/library/sections/1', {
        params: { includeDetails: 1 },
      });
      expect(section).toEqual({
        key: '1',
        title: 'Music',
        type: 'artist',
        agent: 'tv.plex.agents.music',
        scanner: 'Plex Music',
        language: 'en',
        uuid: 'uuid-1',
        updatedAt: 1234567890,
        createdAt: 1234567890,
        scannedAt: 1234567890,
        content: true,
        directory: true,
        contentChangedAt: 1234567890,
        hidden: 0,
        Location: [{ id: 1, path: '/music' }],
      });
    });

    it('should use sectionId as key if key is missing', async () => {
      const mockResponse = {
        MediaContainer: {
          title: 'Music',
          type: 'artist',
          agent: 'tv.plex.agents.music',
          scanner: 'Plex Music',
          language: 'en',
          uuid: 'uuid-1',
          updatedAt: 1234567890,
          createdAt: 1234567890,
          scannedAt: 1234567890,
          content: 1,
          directory: 1,
          contentChangedAt: 1234567890,
          hidden: 0,
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const section = await libraryManager.getLibrarySection('1');

      expect(section.key).toBe('1');
    });
  });

  describe('getLibraryItems', () => {
    it('should return paginated library items', async () => {
      const mockResponse = {
        MediaContainer: {
          totalSize: 100,
          size: 2,
          offset: 0,
          Metadata: [
            {
              ratingKey: '123',
              key: '/library/metadata/123',
              guid: 'plex://track/123',
              type: 'track',
              title: 'Song 1',
              summary: 'A great song',
              duration: 180000,
            },
            {
              ratingKey: '124',
              key: '/library/metadata/124',
              guid: 'plex://track/124',
              type: 'track',
              title: 'Song 2',
              duration: 200000,
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await libraryManager.getLibraryItems('1', {
        type: 10,
        offset: 0,
        limit: 50,
      });

      expect(mockClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: {
          'X-Plex-Container-Start': 0,
          'X-Plex-Container-Size': 50,
          type: 10,
        },
      });
      expect(result.totalSize).toBe(100);
      expect(result.size).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toBe('Song 1');
    });

    it('should apply filters and sorting', async () => {
      const mockResponse = {
        MediaContainer: {
          totalSize: 50,
          size: 10,
          offset: 0,
          Metadata: [],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      await libraryManager.getLibraryItems('1', {
        type: 9,
        offset: 10,
        limit: 10,
        sort: 'titleSort:asc',
        filters: { year: 2020, 'rating>=': 8 },
      });

      expect(mockClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: {
          'X-Plex-Container-Start': 10,
          'X-Plex-Container-Size': 10,
          type: 9,
          sort: 'titleSort:asc',
          year: 2020,
          'rating>=': 8,
        },
      });
    });

    it('should use default pagination values', async () => {
      const mockResponse = {
        MediaContainer: {
          totalSize: 0,
          size: 0,
          offset: 0,
          Metadata: [],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      await libraryManager.getLibraryItems('1');

      expect(mockClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: {
          'X-Plex-Container-Start': 0,
          'X-Plex-Container-Size': 50,
        },
      });
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        MediaContainer: {
          totalSize: 0,
          size: 0,
          offset: 0,
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const result = await libraryManager.getLibraryItems('1');

      expect(result.items).toEqual([]);
      expect(result.totalSize).toBe(0);
    });
  });

  describe('getRecentlyAdded', () => {
    it('should return recently added items', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              key: '/library/metadata/123',
              guid: 'plex://album/123',
              type: 'album',
              title: 'New Album',
              addedAt: 1234567890,
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const items = await libraryManager.getRecentlyAdded('1', 9, 10);

      expect(mockClient.get).toHaveBeenCalledWith('/library/sections/1/recentlyAdded', {
        params: {
          'X-Plex-Container-Size': 10,
          type: 9,
        },
      });
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('New Album');
    });

    it('should use default limit', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      await libraryManager.getRecentlyAdded('1');

      expect(mockClient.get).toHaveBeenCalledWith('/library/sections/1/recentlyAdded', {
        params: {
          'X-Plex-Container-Size': 10,
        },
      });
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const items = await libraryManager.getRecentlyAdded('1');

      expect(items).toEqual([]);
    });
  });

  describe('getRecentlyPlayed', () => {
    it('should return recently played items', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              key: '/library/metadata/123',
              guid: 'plex://album/123',
              type: 'album',
              title: 'Played Album',
              lastViewedAt: 1234567890,
              viewCount: 5,
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const items = await libraryManager.getRecentlyPlayed('1', 9, 10);

      expect(mockClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: {
          'X-Plex-Container-Size': 10,
          sort: 'lastViewedAt:desc',
          'lastViewedAt>>=': 0,
          type: 9,
        },
      });
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Played Album');
    });

    it('should use default limit', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      await libraryManager.getRecentlyPlayed('1');

      expect(mockClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: {
          'X-Plex-Container-Size': 10,
          sort: 'lastViewedAt:desc',
          'lastViewedAt>>=': 0,
        },
      });
    });
  });

  describe('getLibraryStats', () => {
    it('should return stats for music library', async () => {
      const sectionResponse = {
        MediaContainer: {
          key: '1',
          title: 'Music',
          type: 'artist',
          agent: 'tv.plex.agents.music',
          scanner: 'Plex Music',
          language: 'en',
          uuid: 'uuid-1',
          updatedAt: 1234567890,
          createdAt: 1234567890,
          scannedAt: 1234567890,
          content: 1,
          directory: 1,
          contentChangedAt: 1234567890,
          hidden: 0,
        },
      };

      const artistCountResponse = { MediaContainer: { totalSize: 50 } };
      const albumCountResponse = { MediaContainer: { totalSize: 200 } };
      const trackCountResponse = { MediaContainer: { totalSize: 2000 } };

      vi.mocked(mockClient.get)
        .mockResolvedValueOnce(sectionResponse)
        .mockResolvedValueOnce(artistCountResponse)
        .mockResolvedValueOnce(albumCountResponse)
        .mockResolvedValueOnce(trackCountResponse);

      const stats = await libraryManager.getLibraryStats('1');

      expect(stats).toEqual({
        totalItems: 2000,
        artistCount: 50,
        albumCount: 200,
        trackCount: 2000,
      });
    });

    it('should return stats for movie library', async () => {
      const sectionResponse = {
        MediaContainer: {
          key: '2',
          title: 'Movies',
          type: 'movie',
          agent: 'tv.plex.agents.movie',
          scanner: 'Plex Movie',
          language: 'en',
          uuid: 'uuid-2',
          updatedAt: 1234567890,
          createdAt: 1234567890,
          scannedAt: 1234567890,
          content: 1,
          directory: 1,
          contentChangedAt: 1234567890,
          hidden: 0,
        },
      };

      const movieCountResponse = { MediaContainer: { totalSize: 500 } };

      vi.mocked(mockClient.get)
        .mockResolvedValueOnce(sectionResponse)
        .mockResolvedValueOnce(movieCountResponse);

      const stats = await libraryManager.getLibraryStats('2');

      expect(stats).toEqual({
        totalItems: 500,
        movieCount: 500,
      });
    });

    it('should return stats for TV library', async () => {
      const sectionResponse = {
        MediaContainer: {
          key: '3',
          title: 'TV Shows',
          type: 'show',
          agent: 'tv.plex.agents.series',
          scanner: 'Plex Series',
          language: 'en',
          uuid: 'uuid-3',
          updatedAt: 1234567890,
          createdAt: 1234567890,
          scannedAt: 1234567890,
          content: 1,
          directory: 1,
          contentChangedAt: 1234567890,
          hidden: 0,
        },
      };

      const showCountResponse = { MediaContainer: { totalSize: 50 } };
      const seasonCountResponse = { MediaContainer: { totalSize: 200 } };
      const episodeCountResponse = { MediaContainer: { totalSize: 2000 } };

      vi.mocked(mockClient.get)
        .mockResolvedValueOnce(sectionResponse)
        .mockResolvedValueOnce(showCountResponse)
        .mockResolvedValueOnce(seasonCountResponse)
        .mockResolvedValueOnce(episodeCountResponse);

      const stats = await libraryManager.getLibraryStats('3');

      expect(stats).toEqual({
        totalItems: 2000,
        showCount: 50,
        seasonCount: 200,
        episodeCount: 2000,
      });
    });

    it('should handle missing counts', async () => {
      const sectionResponse = {
        MediaContainer: {
          key: '1',
          title: 'Music',
          type: 'artist',
          agent: 'tv.plex.agents.music',
          scanner: 'Plex Music',
          language: 'en',
          uuid: 'uuid-1',
          updatedAt: 1234567890,
          createdAt: 1234567890,
          scannedAt: 1234567890,
          content: 1,
          directory: 1,
          contentChangedAt: 1234567890,
          hidden: 0,
        },
      };

      vi.mocked(mockClient.get)
        .mockResolvedValueOnce(sectionResponse)
        .mockResolvedValueOnce({ MediaContainer: {} })
        .mockResolvedValueOnce({ MediaContainer: {} })
        .mockResolvedValueOnce({ MediaContainer: {} });

      const stats = await libraryManager.getLibraryStats('1');

      expect(stats).toEqual({
        totalItems: 0,
        artistCount: 0,
        albumCount: 0,
        trackCount: 0,
      });
    });
  });

  describe('getLibraryFilters', () => {
    it('should return available filters', async () => {
      const mockResponse = {
        MediaContainer: {
          Filter: [
            {
              key: 'genre',
              type: 'string',
              title: 'Genre',
              Filter: [
                { key: '1', title: 'Rock', count: 100 },
                { key: '2', title: 'Jazz', count: 50 },
              ],
            },
            {
              key: 'year',
              type: 'integer',
              title: 'Year',
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const filters = await libraryManager.getLibraryFilters('1');

      expect(mockClient.get).toHaveBeenCalledWith('/library/sections/1/filters');
      expect(filters).toHaveLength(2);
      expect(filters[0]).toEqual({
        key: 'genre',
        type: 'string',
        title: 'Genre',
        values: [
          { key: '1', title: 'Rock', count: 100 },
          { key: '2', title: 'Jazz', count: 50 },
        ],
      });
      expect(filters[1]).toEqual({
        key: 'year',
        type: 'integer',
        title: 'Year',
        values: undefined,
      });
    });

    it('should handle empty filters', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const filters = await libraryManager.getLibraryFilters('1');

      expect(filters).toEqual([]);
    });
  });

  describe('refreshLibrary', () => {
    it('should trigger library refresh', async () => {
      vi.mocked(mockClient.get).mockResolvedValue({});

      await libraryManager.refreshLibrary('1');

      expect(mockClient.get).toHaveBeenCalledWith('/library/sections/1/refresh');
    });

    it('should handle refresh errors', async () => {
      vi.mocked(mockClient.get).mockRejectedValue(new Error('Refresh failed'));

      await expect(libraryManager.refreshLibrary('1')).rejects.toThrow('Refresh failed');
    });
  });
});
