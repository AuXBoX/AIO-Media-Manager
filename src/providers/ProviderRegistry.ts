import { PlexClient } from '@/api/plexClient';
import { ExternalProvider, MediaType, SearchResult, ExternalMetadata } from '@/types';
import { IExternalMetadataProvider } from './ExternalMetadataProvider';
import { createTMDBProvider } from './TMDBProvider';
import { createIMDBProvider } from './IMDBProvider';
import { createMusicBrainzProvider } from './MusicBrainzProvider';
import { createTVDBProvider } from './TVDBProvider';
import { createDiscogsProvider } from './DiscogsProvider';
import { createFanartProvider } from './FanartProvider';
import { createYouTubeTrailerProvider, YouTubeTrailerProvider } from './YouTubeTrailerProvider';

/**
 * Provider Configuration
 */
export interface ProviderConfig {
  tmdb?: {
    apiKey: string;
  };
  imdb?: {
    apiKey: string;
  };
  tvdb?: {
    apiKey: string;
  };
  discogs?: {
    apiKey: string;
    apiSecret?: string;
  };
  fanart?: {
    apiKey: string;
  };
  musicbrainz?: {
    enabled: boolean;
  };
  youtube?: {
    enabled: boolean;
  };
}

/**
 * Fallback public API keys
 * 
 * These are shared public keys used by open-source media management applications.
 * They have rate limits, so users can optionally provide their own keys for better performance.
 * 
 * Get your own free API keys from:
 * - TMDB: https://www.themoviedb.org/settings/api (Free, 40 requests per 10 seconds)
 * - TVDB: https://thetvdb.com/api-information (Free, 100,000 requests per month)
 * - OMDb: http://www.omdbapi.com/apikey.aspx (Free tier: 1,000 requests per day)
 * - Fanart.tv: https://fanart.tv/get-an-api-key/ (Free, 2,000 requests per day)
 * 
 * Add your own keys to .env file:
 * VITE_TMDB_API_KEY=your_key_here
 * VITE_TVDB_API_KEY=your_key_here
 * VITE_IMDB_API_KEY=your_key_here
 * VITE_FANART_API_KEY=your_key_here
 */
// Simple base64 decode helper (keys are obfuscated to reduce casual exposure)
const decode = (str: string) => atob(str);

const FALLBACK_API_KEYS = {
  // TMDB public key used by open-source media managers
  // Shared key with rate limits - get your own for better performance
  tmdb: '4219e299c89411838049ab0dab19ebd5',
  
  // TVDB v4 API key (obfuscated)
  // Get your own key from: https://thetvdb.com/api-information
  tvdb: decode('ODg4YzMyOTEtNjMzMS00MmUzLWE2MGUtNTg0MzhmYmJjNWUz'),
  
  // OMDb - requires user key (free tier: 1,000 requests/day)
  imdb: null,
  
  // Fanart.tv - requires user key (free tier: 2,000 requests/day)
  // Get your own key from: https://fanart.tv/get-an-api-key/
  // Note: Fanart.tv is optional and disabled by default due to API key requirements
  fanart: null,
  
  // Discogs - requires user key
  discogs: null,
};

/**
 * Provider Registry
 * 
 * Manages external metadata providers and provides a unified interface
 * for searching and importing metadata from multiple sources
 */
export class ProviderRegistry {
  private providers: Map<ExternalProvider, IExternalMetadataProvider> = new Map();
  private youtubeProvider: YouTubeTrailerProvider | null = null;

  constructor(private plexClient: PlexClient, config: ProviderConfig = {}) {
    this.initializeProviders(config);
  }

  /**
   * Initialize providers based on configuration
   */
  private initializeProviders(config: ProviderConfig): void {
    // Initialize TMDB provider (with fallback public key)
    const tmdbApiKey = config.tmdb?.apiKey || FALLBACK_API_KEYS.tmdb;
    if (tmdbApiKey) {
      const tmdbProvider = createTMDBProvider(this.plexClient, tmdbApiKey);
      this.providers.set('tmdb', tmdbProvider);
    }

    // Initialize IMDB provider (with fallback public key)
    const imdbApiKey = config.imdb?.apiKey || FALLBACK_API_KEYS.imdb;
    if (imdbApiKey) {
      const imdbProvider = createIMDBProvider(this.plexClient, imdbApiKey);
      this.providers.set('imdb', imdbProvider);
    }

    // Initialize TVDB provider (with fallback public key)
    const tvdbApiKey = config.tvdb?.apiKey || FALLBACK_API_KEYS.tvdb;
    if (tvdbApiKey) {
      const tvdbProvider = createTVDBProvider(this.plexClient, tvdbApiKey);
      this.providers.set('tvdb', tvdbProvider);
    }

    // Initialize Discogs provider (no fallback - requires user key)
    if (config.discogs?.apiKey) {
      const discogsProvider = createDiscogsProvider(
        this.plexClient,
        config.discogs.apiKey,
        config.discogs.apiSecret
      );
      this.providers.set('discogs', discogsProvider);
    }

    // Initialize Fanart.tv provider (with fallback public key)
    const fanartApiKey = config.fanart?.apiKey || FALLBACK_API_KEYS.fanart;
    if (fanartApiKey) {
      const fanartProvider = createFanartProvider(this.plexClient, fanartApiKey);
      this.providers.set('fanart', fanartProvider);
    }

    // Initialize MusicBrainz provider (no API key required)
    if (config.musicbrainz?.enabled !== false) {
      const musicbrainzProvider = createMusicBrainzProvider(this.plexClient);
      this.providers.set('musicbrainz', musicbrainzProvider);
    }

    // Initialize YouTube trailer provider (no API key required)
    if (config.youtube?.enabled !== false) {
      this.youtubeProvider = createYouTubeTrailerProvider(this.plexClient);
    }
  }

  /**
   * Get a specific provider
   */
  getProvider(provider: ExternalProvider): IExternalMetadataProvider | undefined {
    return this.providers.get(provider);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): ExternalProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is available
   */
  hasProvider(provider: ExternalProvider): boolean {
    return this.providers.has(provider);
  }

  /**
   * Register a custom provider
   */
  registerProvider(provider: ExternalProvider, instance: IExternalMetadataProvider): void {
    this.providers.set(provider, instance);
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(provider: ExternalProvider): void {
    this.providers.delete(provider);
  }

  /**
   * Search across all available providers
   */
  async searchAll(
    query: string,
    type: MediaType,
    year?: number
  ): Promise<Map<ExternalProvider, SearchResult[]>> {
    const results = new Map<ExternalProvider, SearchResult[]>();

    const searchPromises = Array.from(this.providers.entries()).map(
      async ([providerName, provider]) => {
        try {
          // Check if provider supports this media type
          if (!this.providerSupportsType(providerName, type)) {
            return;
          }

          const providerResults = await provider.search(query, type, year);
          results.set(providerName, providerResults);
        } catch (error) {
          console.error(`Error searching ${providerName}:`, error);
          results.set(providerName, []);
        }
      }
    );

    await Promise.all(searchPromises);

    return results;
  }

  /**
   * Search a specific provider
   */
  async search(
    provider: ExternalProvider,
    query: string,
    type: MediaType,
    year?: number
  ): Promise<SearchResult[]> {
    const providerInstance = this.providers.get(provider);

    if (!providerInstance) {
      throw new Error(`Provider not available: ${provider}`);
    }

    return providerInstance.search(query, type, year);
  }

  /**
   * Get details from a specific provider
   */
  async getDetails(provider: ExternalProvider, externalId: string): Promise<ExternalMetadata> {
    const providerInstance = this.providers.get(provider);

    if (!providerInstance) {
      throw new Error(`Provider not available: ${provider}`);
    }

    return providerInstance.getDetails(externalId);
  }

  /**
   * Import metadata from a specific provider
   */
  async importMetadata(
    provider: ExternalProvider,
    ratingKey: string,
    externalId: string
  ): Promise<void> {
    const providerInstance = this.providers.get(provider);

    if (!providerInstance) {
      throw new Error(`Provider not available: ${provider}`);
    }

    return providerInstance.importMetadata(ratingKey, externalId);
  }

  /**
   * Check if a provider supports a specific media type
   */
  private providerSupportsType(provider: ExternalProvider, type: MediaType): boolean {
    switch (provider) {
      case 'tmdb':
        return type === 'movie' || type === 'show';
      case 'imdb':
        return type === 'movie' || type === 'show';
      case 'tvdb':
        return type === 'show';
      case 'musicbrainz':
        return type === 'artist' || type === 'album' || type === 'track';
      case 'discogs':
        return type === 'artist' || type === 'album' || type === 'track';
      case 'fanart':
        return type === 'movie' || type === 'show' || type === 'artist' || type === 'album';
      default:
        return false;
    }
  }

  /**
   * Get recommended provider for a media type
   */
  getRecommendedProvider(type: MediaType): ExternalProvider | undefined {
    switch (type) {
      case 'movie':
        // Prefer TMDB for movies
        if (this.hasProvider('tmdb')) return 'tmdb';
        if (this.hasProvider('imdb')) return 'imdb';
        return undefined;
      case 'show':
        // Prefer TVDB for TV shows
        if (this.hasProvider('tvdb')) return 'tvdb';
        if (this.hasProvider('tmdb')) return 'tmdb';
        if (this.hasProvider('imdb')) return 'imdb';
        return undefined;
      case 'artist':
      case 'album':
      case 'track':
        // Prefer MusicBrainz for music, fallback to Discogs
        if (this.hasProvider('musicbrainz')) return 'musicbrainz';
        if (this.hasProvider('discogs')) return 'discogs';
        return undefined;
      default:
        return undefined;
    }
  }

  /**
   * Get YouTube trailer provider
   */
  getYouTubeProvider(): YouTubeTrailerProvider | null {
    return this.youtubeProvider;
  }

  /**
   * Check if YouTube trailer provider is available
   */
  hasYouTubeProvider(): boolean {
    return this.youtubeProvider !== null;
  }
}

/**
 * Create a provider registry instance
 */
export function createProviderRegistry(
  plexClient: PlexClient,
  config: ProviderConfig = {}
): ProviderRegistry {
  return new ProviderRegistry(plexClient, config);
}
