import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderRegistry } from './ProviderRegistry';
import { PlexClient } from '@/api/plexClient';
import { IExternalMetadataProvider } from './ExternalMetadataProvider';

// Mock the provider modules
vi.mock('./TMDBProvider', () => ({
  createTMDBProvider: vi.fn((client, apiKey) => ({
    provider: 'tmdb',
    search: vi.fn(),
    getDetails: vi.fn(),
    importMetadata: vi.fn(),
  })),
}));

vi.mock('./IMDBProvider', () => ({
  createIMDBProvider: vi.fn((client, apiKey) => ({
    provider: 'imdb',
    search: vi.fn(),
    getDetails: vi.fn(),
    importMetadata: vi.fn(),
  })),
}));

vi.mock('./MusicBrainzProvider', () => ({
  createMusicBrainzProvider: vi.fn((client) => ({
    provider: 'musicbrainz',
    search: vi.fn(),
    getDetails: vi.fn(),
    importMetadata: vi.fn(),
  })),
}));

describe('ProviderRegistry', () => {
  let mockPlexClient: PlexClient;
  let registry: ProviderRegistry;

  beforeEach(() => {
    mockPlexClient = {} as PlexClient;
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with TMDB provider when API key provided', () => {
      registry = new ProviderRegistry(mockPlexClient, {
        tmdb: { apiKey: 'test-key' },
      });

      expect(registry.hasProvider('tmdb')).toBe(true);
      expect(registry.getAvailableProviders()).toContain('tmdb');
    });

    it('should initialize with IMDB provider when API key provided', () => {
      registry = new ProviderRegistry(mockPlexClient, {
        imdb: { apiKey: 'test-key' },
      });

      expect(registry.hasProvider('imdb')).toBe(true);
      expect(registry.getAvailableProviders()).toContain('imdb');
    });

    it('should initialize with MusicBrainz provider by default', () => {
      registry = new ProviderRegistry(mockPlexClient, {});

      expect(registry.hasProvider('musicbrainz')).toBe(true);
      expect(registry.getAvailableProviders()).toContain('musicbrainz');
    });

    it('should not initialize MusicBrainz when explicitly disabled', () => {
      registry = new ProviderRegistry(mockPlexClient, {
        musicbrainz: { enabled: false },
      });

      expect(registry.hasProvider('musicbrainz')).toBe(false);
    });

    it('should initialize multiple providers', () => {
      registry = new ProviderRegistry(mockPlexClient, {
        tmdb: { apiKey: 'tmdb-key' },
        imdb: { apiKey: 'imdb-key' },
        musicbrainz: { enabled: true },
      });

      expect(registry.getAvailableProviders()).toHaveLength(3);
      expect(registry.hasProvider('tmdb')).toBe(true);
      expect(registry.hasProvider('imdb')).toBe(true);
      expect(registry.hasProvider('musicbrainz')).toBe(true);
    });
  });

  describe('getProvider', () => {
    beforeEach(() => {
      registry = new ProviderRegistry(mockPlexClient, {
        tmdb: { apiKey: 'test-key' },
      });
    });

    it('should return provider instance when available', () => {
      const provider = registry.getProvider('tmdb');
      expect(provider).toBeDefined();
      expect(provider?.provider).toBe('tmdb');
    });

    it('should return undefined for unavailable provider', () => {
      const provider = registry.getProvider('imdb');
      expect(provider).toBeUndefined();
    });
  });

  describe('registerProvider', () => {
    beforeEach(() => {
      registry = new ProviderRegistry(mockPlexClient, {});
    });

    it('should register a custom provider', () => {
      const customProvider: IExternalMetadataProvider = {
        provider: 'tmdb',
        search: vi.fn(),
        getDetails: vi.fn(),
        importMetadata: vi.fn(),
      };

      registry.registerProvider('tmdb', customProvider);

      expect(registry.hasProvider('tmdb')).toBe(true);
      expect(registry.getProvider('tmdb')).toBe(customProvider);
    });
  });

  describe('unregisterProvider', () => {
    beforeEach(() => {
      registry = new ProviderRegistry(mockPlexClient, {
        tmdb: { apiKey: 'test-key' },
      });
    });

    it('should unregister a provider', () => {
      expect(registry.hasProvider('tmdb')).toBe(true);

      registry.unregisterProvider('tmdb');

      expect(registry.hasProvider('tmdb')).toBe(false);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      registry = new ProviderRegistry(mockPlexClient, {
        tmdb: { apiKey: 'test-key' },
      });
    });

    it('should search using specific provider', async () => {
      const mockResults = [
        {
          externalId: 'movie-123',
          title: 'Test Movie',
          provider: 'tmdb' as const,
        },
      ];

      const provider = registry.getProvider('tmdb')!;
      (provider.search as any).mockResolvedValue(mockResults);

      const results = await registry.search('tmdb', 'Test', 'movie');

      expect(provider.search).toHaveBeenCalledWith('Test', 'movie', undefined);
      expect(results).toEqual(mockResults);
    });

    it('should throw error for unavailable provider', async () => {
      await expect(registry.search('imdb', 'Test', 'movie')).rejects.toThrow(
        'Provider not available: imdb'
      );
    });
  });

  describe('searchAll', () => {
    beforeEach(() => {
      registry = new ProviderRegistry(mockPlexClient, {
        tmdb: { apiKey: 'tmdb-key' },
        imdb: { apiKey: 'imdb-key' },
      });
    });

    it('should search across all providers', async () => {
      const tmdbResults = [
        { externalId: 'movie-123', title: 'Movie 1', provider: 'tmdb' as const },
      ];
      const imdbResults = [
        { externalId: 'tt123', title: 'Movie 2', provider: 'imdb' as const },
      ];

      const tmdbProvider = registry.getProvider('tmdb')!;
      const imdbProvider = registry.getProvider('imdb')!;

      (tmdbProvider.search as any).mockResolvedValue(tmdbResults);
      (imdbProvider.search as any).mockResolvedValue(imdbResults);

      const results = await registry.searchAll('Test', 'movie');

      expect(results.size).toBe(2);
      expect(results.get('tmdb')).toEqual(tmdbResults);
      expect(results.get('imdb')).toEqual(imdbResults);
    });

    it('should handle provider errors gracefully', async () => {
      const tmdbProvider = registry.getProvider('tmdb')!;
      const imdbProvider = registry.getProvider('imdb')!;

      (tmdbProvider.search as any).mockRejectedValue(new Error('API Error'));
      (imdbProvider.search as any).mockResolvedValue([]);

      const results = await registry.searchAll('Test', 'movie');

      expect(results.size).toBe(2);
      expect(results.get('tmdb')).toEqual([]);
      expect(results.get('imdb')).toEqual([]);
    });

    it('should skip providers that do not support media type', async () => {
      registry = new ProviderRegistry(mockPlexClient, {
        tmdb: { apiKey: 'tmdb-key' },
        musicbrainz: { enabled: true },
      });

      const tmdbProvider = registry.getProvider('tmdb')!;
      (tmdbProvider.search as any).mockResolvedValue([]);

      const results = await registry.searchAll('Test', 'movie');

      // TMDB should be called, MusicBrainz should not
      expect(tmdbProvider.search).toHaveBeenCalled();
      expect(results.has('tmdb')).toBe(true);
      expect(results.has('musicbrainz')).toBe(false);
    });
  });

  describe('getDetails', () => {
    beforeEach(() => {
      registry = new ProviderRegistry(mockPlexClient, {
        tmdb: { apiKey: 'test-key' },
      });
    });

    it('should get details from specific provider', async () => {
      const mockDetails = {
        externalId: 'movie-123',
        title: 'Test Movie',
        provider: 'tmdb' as const,
      };

      const provider = registry.getProvider('tmdb')!;
      (provider.getDetails as any).mockResolvedValue(mockDetails);

      const details = await registry.getDetails('tmdb', 'movie-123');

      expect(provider.getDetails).toHaveBeenCalledWith('movie-123');
      expect(details).toEqual(mockDetails);
    });

    it('should throw error for unavailable provider', async () => {
      await expect(registry.getDetails('imdb', 'tt123')).rejects.toThrow(
        'Provider not available: imdb'
      );
    });
  });

  describe('importMetadata', () => {
    beforeEach(() => {
      registry = new ProviderRegistry(mockPlexClient, {
        tmdb: { apiKey: 'test-key' },
      });
    });

    it('should import metadata from specific provider', async () => {
      const provider = registry.getProvider('tmdb')!;
      (provider.importMetadata as any).mockResolvedValue(undefined);

      await registry.importMetadata('tmdb', '12345', 'movie-123');

      expect(provider.importMetadata).toHaveBeenCalledWith('12345', 'movie-123');
    });

    it('should throw error for unavailable provider', async () => {
      await expect(
        registry.importMetadata('imdb', '12345', 'tt123')
      ).rejects.toThrow('Provider not available: imdb');
    });
  });

  describe('getRecommendedProvider', () => {
    beforeEach(() => {
      registry = new ProviderRegistry(mockPlexClient, {
        tmdb: { apiKey: 'tmdb-key' },
        imdb: { apiKey: 'imdb-key' },
        musicbrainz: { enabled: true },
      });
    });

    it('should recommend TMDB for movies', () => {
      expect(registry.getRecommendedProvider('movie')).toBe('tmdb');
    });

    it('should recommend TMDB for TV shows', () => {
      expect(registry.getRecommendedProvider('show')).toBe('tmdb');
    });

    it('should recommend MusicBrainz for artists', () => {
      expect(registry.getRecommendedProvider('artist')).toBe('musicbrainz');
    });

    it('should recommend MusicBrainz for albums', () => {
      expect(registry.getRecommendedProvider('album')).toBe('musicbrainz');
    });

    it('should recommend MusicBrainz for tracks', () => {
      expect(registry.getRecommendedProvider('track')).toBe('musicbrainz');
    });

    it('should fallback to IMDB when TMDB not available', () => {
      registry = new ProviderRegistry(mockPlexClient, {
        imdb: { apiKey: 'imdb-key' },
      });

      expect(registry.getRecommendedProvider('movie')).toBe('imdb');
    });

    it('should return undefined for unsupported types', () => {
      expect(registry.getRecommendedProvider('season' as any)).toBeUndefined();
    });
  });
});
