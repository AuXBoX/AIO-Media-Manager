import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchManager } from './SearchManager';
import { PlexClient } from '../api/plexClient';
import { db } from '../db/database';
import type { MediaType, FilterCriteria } from './SearchManager';

// Mock the database
vi.mock('../db/database', () => ({
  db: {
    filterPresets: {
      add: vi.fn(),
      toArray: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

describe('SearchManager', () => {
  let searchManager: SearchManager;
  let mockPlexClient: PlexClient;

  beforeEach(() => {
    // Create mock Plex client
    mockPlexClient = {
      get: vi.fn(),
    } as any;

    searchManager = new SearchManager(mockPlexClient);

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should perform hub search without section ID', async () => {
      const mockResponse = {
        MediaContainer: {
          Hub: [
            {
              title: 'Movies',
              type: 'movie',
              size: 2,
              Metadata: [
                {
                  ratingKey: '1',
                  key: '/library/metadata/1',
                  guid: 'plex://movie/1',
                  type: 'movie',
                  title: 'The Matrix',
                  year: 1999,
                  thumb: '/library/metadata/1/thumb',
                  addedAt: 1234567890,
                  updatedAt: 1234567890,
                },
                {
                  ratingKey: '2',
                  key: '/library/metadata/2',
                  guid: 'plex://movie/2',
                  type: 'movie',
                  title: 'The Matrix Reloaded',
                  year: 2003,
                  addedAt: 1234567891,
                  updatedAt: 1234567891,
                },
              ],
            },
          ],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const results = await searchManager.search('Matrix');

      expect(mockPlexClient.get).toHaveBeenCalledWith('/hubs/search', {
        params: { query: 'Matrix' },
      });

      expect(results.hubs).toHaveLength(1);
      expect(results.hubs[0]).toMatchObject({
        title: 'Movies',
        type: 'movie',
        size: 2,
      });
      expect(results.hubs[0]!.items).toHaveLength(2);
      expect(results.totalResults).toBe(2);
    });

    it('should perform library search with section ID', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '1',
              key: '/library/metadata/1',
              guid: 'plex://movie/1',
              type: 'movie',
              title: 'Inception',
              year: 2010,
              addedAt: 1234567890,
              updatedAt: 1234567890,
            },
          ],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const results = await searchManager.search('Inception', '1');

      expect(mockPlexClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: { query: 'Inception' },
      });

      expect(results.hubs).toHaveLength(1);
      expect(results.hubs[0]!.items).toHaveLength(1);
      expect(results.totalResults).toBe(1);
    });

    it('should trim search query', async () => {
      const mockResponse = {
        MediaContainer: {
          Hub: [],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      await searchManager.search('  Matrix  ');

      expect(mockPlexClient.get).toHaveBeenCalledWith('/hubs/search', {
        params: { query: 'Matrix' },
      });
    });

    it('should handle empty hub results', async () => {
      const mockResponse = {
        MediaContainer: {
          Hub: [],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const results = await searchManager.search('NonExistent');

      expect(results.hubs).toHaveLength(0);
      expect(results.totalResults).toBe(0);
    });

    it('should handle missing MediaContainer', async () => {
      vi.mocked(mockPlexClient.get).mockResolvedValue({});

      const results = await searchManager.search('Test');

      expect(results.hubs).toHaveLength(0);
      expect(results.totalResults).toBe(0);
    });

    it('should handle multiple hubs', async () => {
      const mockResponse = {
        MediaContainer: {
          Hub: [
            {
              title: 'Movies',
              type: 'movie',
              size: 1,
              Metadata: [
                {
                  ratingKey: '1',
                  key: '/library/metadata/1',
                  guid: 'plex://movie/1',
                  type: 'movie',
                  title: 'Star Wars',
                  addedAt: 1234567890,
                  updatedAt: 1234567890,
                },
              ],
            },
            {
              title: 'TV Shows',
              type: 'show',
              size: 1,
              Metadata: [
                {
                  ratingKey: '2',
                  key: '/library/metadata/2',
                  guid: 'plex://show/2',
                  type: 'show',
                  title: 'Star Trek',
                  addedAt: 1234567891,
                  updatedAt: 1234567891,
                },
              ],
            },
          ],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const results = await searchManager.search('Star');

      expect(results.hubs).toHaveLength(2);
      expect(results.totalResults).toBe(2);
    });

    it('should throw error on API failure', async () => {
      vi.mocked(mockPlexClient.get).mockRejectedValue(new Error('API Error'));

      await expect(searchManager.search('Test')).rejects.toThrow('API Error');
    });
  });

  describe('searchLibrary', () => {
    it('should search library with query', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '1',
              key: '/library/metadata/1',
              guid: 'plex://album/1',
              type: 'album',
              title: 'Abbey Road',
              year: 1969,
              addedAt: 1234567890,
              updatedAt: 1234567890,
            },
          ],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const results = await searchManager.searchLibrary('1', 'Abbey Road');

      expect(mockPlexClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: { 'title.query': 'Abbey Road' },
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        ratingKey: '1',
        title: 'Abbey Road',
        type: 'album',
      });
    });

    it('should search library with type filter', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      await searchManager.searchLibrary('1', 'Test', 'album');

      expect(mockPlexClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: {
          'title.query': 'Test',
          type: 9, // album type
        },
      });
    });

    it('should trim search query', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      await searchManager.searchLibrary('1', '  Test Query  ');

      expect(mockPlexClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: { 'title.query': 'Test Query' },
      });
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const results = await searchManager.searchLibrary('1', 'NonExistent');

      expect(results).toEqual([]);
    });

    it('should handle missing Metadata array', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const results = await searchManager.searchLibrary('1', 'Test');

      expect(results).toEqual([]);
    });

    it('should map all media types correctly', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const typeMap: Record<MediaType, number> = {
        movie: 1,
        show: 2,
        season: 3,
        episode: 4,
        artist: 8,
        album: 9,
        track: 10,
      };

      for (const [mediaType, plexType] of Object.entries(typeMap)) {
        await searchManager.searchLibrary('1', 'Test', mediaType as MediaType);

        expect(mockPlexClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
          params: {
            'title.query': 'Test',
            type: plexType,
          },
        });
      }
    });

    it('should throw error on API failure', async () => {
      vi.mocked(mockPlexClient.get).mockRejectedValue(new Error('API Error'));

      await expect(searchManager.searchLibrary('1', 'Test')).rejects.toThrow('API Error');
    });
  });

  describe('applyFilters', () => {
    it('should apply filters to library', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '1',
              key: '/library/metadata/1',
              guid: 'plex://movie/1',
              type: 'movie',
              title: 'Action Movie',
              year: 2020,
              addedAt: 1234567890,
              updatedAt: 1234567890,
            },
          ],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const filters: FilterCriteria = {
        sectionId: '1',
        filters: {
          'genre': 'Action',
          'year>=': 2020,
        },
      };

      const results = await searchManager.applyFilters('1', filters);

      expect(mockPlexClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: {
          'genre': 'Action',
          'year>=': 2020,
        },
      });

      expect(results).toHaveLength(1);
      expect(results[0]!.title).toBe('Action Movie');
    });

    it('should apply filters with type', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const filters: FilterCriteria = {
        sectionId: '1',
        type: 'movie',
        filters: {
          'year': 2020,
        },
      };

      await searchManager.applyFilters('1', filters);

      expect(mockPlexClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: {
          type: 1, // movie type
          'year': 2020,
        },
      });
    });

    it('should apply filters with sort', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const filters: FilterCriteria = {
        sectionId: '1',
        filters: {},
        sort: 'titleSort:asc',
      };

      await searchManager.applyFilters('1', filters);

      expect(mockPlexClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: {
          sort: 'titleSort:asc',
        },
      });
    });

    it('should apply filters with type and sort', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const filters: FilterCriteria = {
        sectionId: '1',
        type: 'album',
        filters: {
          'year>=': 2000,
        },
        sort: 'year:desc',
      };

      await searchManager.applyFilters('1', filters);

      expect(mockPlexClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: {
          type: 9, // album type
          'year>=': 2000,
          sort: 'year:desc',
        },
      });
    });

    it('should handle empty filter criteria', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const filters: FilterCriteria = {
        sectionId: '1',
        filters: {},
      };

      await searchManager.applyFilters('1', filters);

      expect(mockPlexClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: {},
      });
    });

    it('should throw error on API failure', async () => {
      vi.mocked(mockPlexClient.get).mockRejectedValue(new Error('API Error'));

      const filters: FilterCriteria = {
        sectionId: '1',
        filters: {},
      };

      await expect(searchManager.applyFilters('1', filters)).rejects.toThrow('API Error');
    });
  });

  describe('saveFilterPreset', () => {
    it('should save filter preset to database', async () => {
      vi.mocked(db.filterPresets.add).mockResolvedValue('test-uuid-1234');

      const filters: FilterCriteria = {
        sectionId: '1',
        type: 'movie',
        filters: {
          'genre': 'Action',
          'year>=': 2020,
        },
        sort: 'year:desc',
      };

      await searchManager.saveFilterPreset('Action Movies 2020+', filters);

      expect(db.filterPresets.add).toHaveBeenCalledWith({
        id: 'test-uuid-1234',
        name: 'Action Movies 2020+',
        criteria: filters,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it('should generate unique ID for preset', async () => {
      vi.mocked(db.filterPresets.add).mockResolvedValue('test-uuid-1234');

      const filters: FilterCriteria = {
        sectionId: '1',
        filters: {},
      };

      await searchManager.saveFilterPreset('Test Preset', filters);

      const call = vi.mocked(db.filterPresets.add).mock.calls[0]![0];
      expect(call.id).toBe('test-uuid-1234');
    });

    it('should set createdAt timestamp', async () => {
      vi.mocked(db.filterPresets.add).mockResolvedValue('test-uuid-1234');

      const beforeTime = Date.now();

      const filters: FilterCriteria = {
        sectionId: '1',
        filters: {},
      };

      await searchManager.saveFilterPreset('Test Preset', filters);

      const afterTime = Date.now();
      const call = vi.mocked(db.filterPresets.add).mock.calls[0]![0];
      
      expect(call.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(call.createdAt).toBeLessThanOrEqual(afterTime);
    });

    it('should throw error on database failure', async () => {
      vi.mocked(db.filterPresets.add).mockRejectedValue(new Error('Database Error'));

      const filters: FilterCriteria = {
        sectionId: '1',
        filters: {},
      };

      await expect(
        searchManager.saveFilterPreset('Test Preset', filters)
      ).rejects.toThrow('Database Error');
    });
  });

  describe('getFilterPresets', () => {
    it('should retrieve all filter presets', async () => {
      const mockPresets = [
        {
          id: 'preset-1',
          name: 'Action Movies',
          criteria: {
            sectionId: '1',
            type: 'movie',
            filters: { genre: 'Action' },
          },
          createdAt: 1234567890,
          updatedAt: 1234567890,
        },
        {
          id: 'preset-2',
          name: 'Recent Albums',
          criteria: {
            sectionId: '2',
            type: 'album',
            filters: { 'addedAt>=': '-30d' },
            sort: 'addedAt:desc',
          },
          createdAt: 1234567891,
          updatedAt: 1234567891,
        },
      ];

      vi.mocked(db.filterPresets.toArray).mockResolvedValue(mockPresets);

      const results = await searchManager.getFilterPresets();

      expect(db.filterPresets.toArray).toHaveBeenCalled();
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        id: 'preset-1',
        name: 'Action Movies',
        createdAt: 1234567890,
      });
      expect(results[1]).toMatchObject({
        id: 'preset-2',
        name: 'Recent Albums',
        createdAt: 1234567891,
      });
    });

    it('should return empty array when no presets exist', async () => {
      vi.mocked(db.filterPresets.toArray).mockResolvedValue([]);

      const results = await searchManager.getFilterPresets();

      expect(results).toEqual([]);
    });

    it('should map criteria correctly', async () => {
      const mockPresets = [
        {
          id: 'preset-1',
          name: 'Test',
          criteria: {
            sectionId: '1',
            type: 'movie',
            filters: { year: 2020 },
            sort: 'title:asc',
          },
          createdAt: 1234567890,
          updatedAt: 1234567890,
        },
      ];

      vi.mocked(db.filterPresets.toArray).mockResolvedValue(mockPresets);

      const results = await searchManager.getFilterPresets();

      expect(results[0]!.criteria).toEqual({
        sectionId: '1',
        type: 'movie',
        filters: { year: 2020 },
        sort: 'title:asc',
      });
    });

    it('should throw error on database failure', async () => {
      vi.mocked(db.filterPresets.toArray).mockRejectedValue(new Error('Database Error'));

      await expect(searchManager.getFilterPresets()).rejects.toThrow('Database Error');
    });
  });

  describe('deleteFilterPreset', () => {
    it('should delete filter preset from database', async () => {
      vi.mocked(db.filterPresets.delete).mockResolvedValue(undefined);

      await searchManager.deleteFilterPreset('preset-1');

      expect(db.filterPresets.delete).toHaveBeenCalledWith('preset-1');
    });

    it('should handle deletion of non-existent preset', async () => {
      vi.mocked(db.filterPresets.delete).mockResolvedValue(undefined);

      await expect(
        searchManager.deleteFilterPreset('non-existent')
      ).resolves.not.toThrow();
    });

    it('should throw error on database failure', async () => {
      vi.mocked(db.filterPresets.delete).mockRejectedValue(new Error('Database Error'));

      await expect(
        searchManager.deleteFilterPreset('preset-1')
      ).rejects.toThrow('Database Error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle items with missing optional fields', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '1',
              key: '/library/metadata/1',
              guid: 'plex://movie/1',
              type: 'movie',
              title: 'Minimal Movie',
              addedAt: 1234567890,
              updatedAt: 1234567890,
              // Missing: thumb, art, year, summary
            },
          ],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const results = await searchManager.searchLibrary('1', 'Minimal');

      expect(results[0]).toMatchObject({
        ratingKey: '1',
        title: 'Minimal Movie',
        type: 'movie',
      });
      expect(results[0]!.thumb).toBeUndefined();
      expect(results[0]!.art).toBeUndefined();
      expect(results[0]!.year).toBeUndefined();
      expect(results[0]!.summary).toBeUndefined();
    });

    it('should handle items with empty strings', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '',
              key: '',
              guid: '',
              type: 'movie',
              title: '',
              addedAt: 0,
              updatedAt: 0,
            },
          ],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const results = await searchManager.searchLibrary('1', 'Test');

      expect(results[0]).toMatchObject({
        ratingKey: '',
        key: '',
        guid: '',
        title: '',
      });
    });

    it('should handle unknown media types', async () => {
      const mockResponse = {
        MediaContainer: {
          Hub: [
            {
              title: 'Unknown',
              type: 'unknown-type',
              size: 1,
              Metadata: [
                {
                  ratingKey: '1',
                  key: '/library/metadata/1',
                  guid: 'plex://unknown/1',
                  type: 'unknown-type',
                  title: 'Unknown Item',
                  addedAt: 1234567890,
                  updatedAt: 1234567890,
                },
              ],
            },
          ],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const results = await searchManager.search('Unknown');

      // Should default to 'movie' for unknown types
      expect(results.hubs[0]!.type).toBe('movie');
      expect(results.hubs[0]!.items[0]!.type).toBe('movie');
    });

    it('should handle complex filter criteria', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(mockResponse);

      const filters: FilterCriteria = {
        sectionId: '1',
        type: 'movie',
        filters: {
          'genre': 'Action',
          'year>=': 2020,
          'year<=': 2023,
          'rating>=': 7.0,
          'contentRating': 'PG-13',
          'studio': 'Warner Bros',
        },
        sort: 'rating:desc,year:desc',
      };

      await searchManager.applyFilters('1', filters);

      expect(mockPlexClient.get).toHaveBeenCalledWith('/library/sections/1/all', {
        params: {
          type: 1,
          'genre': 'Action',
          'year>=': 2020,
          'year<=': 2023,
          'rating>=': 7.0,
          'contentRating': 'PG-13',
          'studio': 'Warner Bros',
          sort: 'rating:desc,year:desc',
        },
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle search, filter, and save preset workflow', async () => {
      // Step 1: Search
      const searchResponse = {
        MediaContainer: {
          Hub: [
            {
              title: 'Movies',
              type: 'movie',
              size: 1,
              Metadata: [
                {
                  ratingKey: '1',
                  key: '/library/metadata/1',
                  guid: 'plex://movie/1',
                  type: 'movie',
                  title: 'Test Movie',
                  addedAt: 1234567890,
                  updatedAt: 1234567890,
                },
              ],
            },
          ],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(searchResponse);
      await searchManager.search('Test');

      // Step 2: Apply filters
      const filterResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '1',
              key: '/library/metadata/1',
              guid: 'plex://movie/1',
              type: 'movie',
              title: 'Test Movie',
              addedAt: 1234567890,
              updatedAt: 1234567890,
            },
          ],
        },
      };

      vi.mocked(mockPlexClient.get).mockResolvedValue(filterResponse);

      const filters: FilterCriteria = {
        sectionId: '1',
        type: 'movie',
        filters: { year: 2020 },
      };

      await searchManager.applyFilters('1', filters);

      // Step 3: Save preset
      vi.mocked(db.filterPresets.add).mockResolvedValue('preset-1');
      await searchManager.saveFilterPreset('My Preset', filters);

      // Step 4: Retrieve presets
      vi.mocked(db.filterPresets.toArray).mockResolvedValue([
        {
          id: 'preset-1',
          name: 'My Preset',
          criteria: filters,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      const presets = await searchManager.getFilterPresets();

      expect(presets).toHaveLength(1);
      expect(presets[0]!.name).toBe('My Preset');
    });
  });
});
