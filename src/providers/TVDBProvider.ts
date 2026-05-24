import axios, { AxiosInstance } from 'axios';
import { PlexClient } from '@/api/plexClient';
import { MediaType, SearchResult, ExternalMetadata } from '@/types';
import { BaseExternalMetadataProvider } from './ExternalMetadataProvider';

/**
 * TVDB API Configuration
 */
interface TVDBConfig {
  apiKey: string;
  baseURL?: string;
}

/**
 * TVDB API Response Types
 */
interface TVDBSearchResult {
  tvdb_id: string;
  name: string;
  first_air_time?: string;
  overview?: string;
  image_url?: string;
  primary_language?: string;
  status?: string;
  type?: string;
}

interface TVDBSeriesDetails {
  id: number;
  name: string;
  slug?: string;
  image?: string;
  nameTranslations?: string[];
  overviewTranslations?: string[];
  aliases?: Array<{ name: string }>;
  firstAired?: string;
  lastAired?: string;
  nextAired?: string;
  score?: number;
  status?: {
    id: number;
    name: string;
  };
  originalCountry?: string;
  originalLanguage?: string;
  defaultSeasonType?: number;
  isOrderRandomized?: boolean;
  lastUpdated?: string;
  averageRuntime?: number;
  episodes?: Array<{
    id: number;
    seriesId: number;
    name: string;
    aired: string;
    runtime: number;
    overview: string;
    image: string;
    imageType: number;
    isMovie: number;
    seasons: Array<{
      id: number;
      seriesId: number;
      type: {
        id: number;
        name: string;
        type: string;
      };
      number: number;
    }>;
    number: number;
    seasonNumber: number;
    lastUpdated: string;
    finaleType: string;
  }>;
  genres?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  artworks?: Array<{
    id: number;
    image: string;
    thumbnail: string;
    language: string;
    type: number;
    score: number;
    width: number;
    height: number;
  }>;
  characters?: Array<{
    id: number;
    name: string;
    peopleId: number;
    seriesId: number;
    series: string;
    movie: string;
    movieId: number;
    episodeId: number;
    type: number;
    image: string;
    sort: number;
    isFeatured: boolean;
    url: string;
    nameTranslations: string[];
    overviewTranslations: string[];
    aliases: Array<{ name: string }>;
    peopleType: string;
    personName: string;
    tagOptions: Array<{
      id: number;
      tag: number;
      tagId: number;
      tagName: string;
      name: string;
      helpText: string;
    }>;
    personImgURL: string;
  }>;
}

/**
 * TVDB Provider
 * 
 * Provides metadata from TheTVDB
 * Supports TV shows and episodes
 */
export class TVDBProvider extends BaseExternalMetadataProvider {
  readonly provider = 'tvdb' as const;
  private client: AxiosInstance;
  private apiKey: string;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(plexClient: PlexClient, config: TVDBConfig) {
    super(plexClient);

    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: config.baseURL || 'https://api4.thetvdb.com/v4',
    });
  }

  /**
   * Authenticate with TVDB API
   * TVDB v4 requires login to get a bearer token
   */
  private async ensureAuthenticated(): Promise<void> {
    // Check if we have a valid token
    if (this.token && Date.now() < this.tokenExpiry) {
      return;
    }

    try {
      // Login to get bearer token
      const response = await this.client.post('/login', {
        apikey: this.apiKey,
      });

      if (response.data?.data?.token) {
        this.token = response.data.data.token;
        // Token expires in 30 days, but we'll refresh after 29 days to be safe
        this.tokenExpiry = Date.now() + (29 * 24 * 60 * 60 * 1000);
        
        // Set the token in the default headers
        this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        
        console.log('[TVDB] Authentication successful');
      } else {
        throw new Error('Failed to get token from TVDB API');
      }
    } catch (error) {
      console.error('[TVDB] Authentication failed:', error);
      throw new Error(`TVDB authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for TV shows
   */
  async search(query: string, type: MediaType, year?: number): Promise<SearchResult[]> {
    if (type !== 'show') {
      throw new Error(`TVDB provider only supports TV shows, not: ${type}`);
    }

    await this.ensureAuthenticated();

    try {
      const response = await this.client.get<{
        status: string;
        data: TVDBSearchResult[];
      }>('/search', {
        params: {
          query,
          type: 'series',
          year,
        },
      });

      if (!response.data.data) {
        return [];
      }

      return response.data.data.map((item) => this.mapSearchResult(item));
    } catch (error) {
      console.error('TVDB search error:', error);
      return [];
    }
  }

  /**
   * Get detailed metadata for a TV show
   */
  async getDetails(externalId: string): Promise<ExternalMetadata> {
    await this.ensureAuthenticated();

    // External ID format: "series-{tvdbId}", "series-{tvdbId}-season-{seasonNum}", or "series-{tvdbId}-season-{seasonNum}-episode-{episodeNum}"
    const parts = externalId.split('-');
    const tvdbId = parts[1]; // series-123 -> 123
    const seasonIndex = parts.indexOf('season');
    const episodeIndex = parts.indexOf('episode');

    if (episodeIndex !== -1 && parts[episodeIndex + 1]) {
      // Episode request: series-123-season-2-episode-5
      const seasonNum = parseInt(parts[seasonIndex + 1]);
      const episodeNum = parseInt(parts[episodeIndex + 1]);
      return this.getEpisodeDetails(tvdbId, seasonNum, episodeNum);
    } else if (seasonIndex !== -1 && parts[seasonIndex + 1]) {
      // Season request: series-123-season-2
      const seasonNum = parseInt(parts[seasonIndex + 1]);
      return this.getSeasonDetails(tvdbId, seasonNum);
    }

    // Show request: series-123
    const response = await this.client.get<{
      status: string;
      data: TVDBSeriesDetails;
    }>(`/series/${tvdbId}/extended`, {
      params: {
        meta: 'episodes',
        short: false,
      },
    });

    return this.mapDetails(response.data.data);
  }

  /**
   * Get season-specific images
   */
  private async getSeasonDetails(seriesId: string, seasonNumber: number): Promise<ExternalMetadata> {
    await this.ensureAuthenticated();

    try {
      // Fetch series extended data for basic info
      const seriesResponse = await this.client.get<{
        status: string;
        data: TVDBSeriesDetails;
      }>(`/series/${seriesId}/extended`, {
        params: {
          short: false,
        },
      });

      const series = seriesResponse.data.data;

      // Fetch all artworks for the series
      // TVDB v4 API: /series/{id}/artworks returns all artworks
      // We need to filter by season in the response
      const seasonPosters: string[] = [];
      const seasonBackdrops: string[] = [];

      try {
        // Fetch artworks - TVDB returns artworks with season information
        const artworkResponse = await this.client.get<{
          status: string;
          data: {
            artworks: Array<{
              id: number;
              image: string;
              thumbnail: string;
              language: string;
              type: number;
              score: number;
              width: number;
              height: number;
              includesText: boolean;
              thumbnailWidth: number;
              thumbnailHeight: number;
              updatedAt: number;
              status: {
                id: number;
                name: string;
              };
              tagOptions: Array<{
                id: number;
                tag: number;
                tagId: number;
                tagName: string;
                name: string;
              }>;
            }>;
          };
        }>(`/series/${seriesId}/artworks`, {
          params: {
            lang: 'eng',
            type: 2, // 2 = poster
          },
        });

        // Filter artworks for the specific season
        // Check tagOptions for season information
        artworkResponse.data.data?.artworks?.forEach((artwork) => {
          // Check if this artwork has a season tag matching our season number
          const hasSeasonTag = artwork.tagOptions?.some(
            (tag) => tag.tagName === 'Season' && tag.name === String(seasonNumber)
          );
          
          if (hasSeasonTag) {
            seasonPosters.push(artwork.image);
          }
        });

        // Fetch background artworks
        const backdropResponse = await this.client.get<{
          status: string;
          data: {
            artworks: Array<{
              id: number;
              image: string;
              thumbnail: string;
              language: string;
              type: number;
              score: number;
              width: number;
              height: number;
              includesText: boolean;
              thumbnailWidth: number;
              thumbnailHeight: number;
              updatedAt: number;
              status: {
                id: number;
                name: string;
              };
              tagOptions: Array<{
                id: number;
                tag: number;
                tagId: number;
                tagName: string;
                name: string;
              }>;
            }>;
          };
        }>(`/series/${seriesId}/artworks`, {
          params: {
            lang: 'eng',
            type: 3, // 3 = background
          },
        });

        backdropResponse.data.data?.artworks?.forEach((artwork) => {
          const hasSeasonTag = artwork.tagOptions?.some(
            (tag) => tag.tagName === 'Season' && tag.name === String(seasonNumber)
          );
          
          if (hasSeasonTag) {
            seasonBackdrops.push(artwork.image);
          }
        });

        console.log(`[TVDB] Found ${seasonPosters.length} season ${seasonNumber} posters and ${seasonBackdrops.length} backgrounds`);
      } catch (error) {
        console.warn('[TVDB] Could not fetch season artworks:', error);
      }

      return {
        externalId: `series-${seriesId}-season-${seasonNumber}`,
        title: `${series.name} - Season ${seasonNumber}`,
        summary: series.overviewTranslations?.[0],
        rating: series.score,
        year: series.firstAired ? new Date(series.firstAired).getFullYear() : undefined,
        posters: seasonPosters.length > 0 ? seasonPosters : undefined,
        backdrops: seasonBackdrops.length > 0 ? seasonBackdrops : undefined,
        provider: 'tvdb',
      };
    } catch (error) {
      console.error('[TVDB] Error fetching season details:', error);
      throw error;
    }
  }

  /**
   * Get episode-specific images and details
   */
  private async getEpisodeDetails(seriesId: string, seasonNumber: number, episodeNumber: number): Promise<ExternalMetadata> {
    await this.ensureAuthenticated();

    try {
      // Fetch series extended data to get episodes
      const seriesResponse = await this.client.get<{
        status: string;
        data: TVDBSeriesDetails;
      }>(`/series/${seriesId}/extended`, {
        params: {
          meta: 'episodes',
          short: false,
        },
      });

      const series = seriesResponse.data.data;

      // Find the specific episode
      const episode = series.episodes?.find(
        (ep) => ep.seasonNumber === seasonNumber && ep.number === episodeNumber
      );

      if (!episode) {
        console.warn(`[TVDB] Episode S${seasonNumber}E${episodeNumber} not found`);
        return {
          externalId: `series-${seriesId}-season-${seasonNumber}-episode-${episodeNumber}`,
          title: `${series.name} - S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`,
          summary: undefined,
          provider: 'tvdb',
        };
      }

      // Episode image is the episode's own image
      const episodePosters: string[] = [];
      if (episode.image) {
        episodePosters.push(episode.image);
      }

      return {
        externalId: `series-${seriesId}-season-${seasonNumber}-episode-${episodeNumber}`,
        title: episode.name || `Episode ${episodeNumber}`,
        summary: episode.overview,
        rating: undefined,
        year: episode.aired ? new Date(episode.aired).getFullYear() : undefined,
        releaseDate: episode.aired,
        runtime: episode.runtime,
        posters: episodePosters.length > 0 ? episodePosters : undefined,
        // Episodes typically don't have separate backdrops
        backdrops: undefined,
        provider: 'tvdb',
      };
    } catch (error) {
      console.error('[TVDB] Error fetching episode details:', error);
      throw error;
    }
  }

  /**
   * Map TVDB search result to SearchResult
   */
  private mapSearchResult(item: TVDBSearchResult): SearchResult {
    const year = item.first_air_time
      ? new Date(item.first_air_time).getFullYear()
      : undefined;

    return {
      externalId: `series-${item.tvdb_id}`,
      title: item.name,
      year,
      thumb: item.image_url,
      summary: item.overview,
      provider: 'tvdb',
    };
  }

  /**
   * Map TVDB details to ExternalMetadata
   */
  private mapDetails(series: TVDBSeriesDetails): ExternalMetadata {
    const year = series.firstAired
      ? new Date(series.firstAired).getFullYear()
      : undefined;

    // Extract cast from characters
    const cast = series.characters?.map((char, index) => ({
      name: char.personName || char.name,
      character: char.name,
      profilePath: char.personImgURL || char.image,
      order: char.sort || index,
    }));

    // Extract posters and backdrops from artworks
    const posters: string[] = [];
    const backdrops: string[] = [];

    series.artworks?.forEach((artwork) => {
      // Type 2 = poster, Type 3 = background
      if (artwork.type === 2) {
        posters.push(artwork.image);
      } else if (artwork.type === 3) {
        backdrops.push(artwork.image);
      }
    });

    return {
      externalId: `series-${series.id}`,
      title: series.name,
      summary: series.overviewTranslations?.[0],
      rating: series.score,
      year,
      releaseDate: series.firstAired,
      runtime: series.averageRuntime,
      genres: series.genres?.map((g) => g.name),
      cast,
      posters: posters.length > 0 ? posters : series.image ? [series.image] : undefined,
      backdrops: backdrops.length > 0 ? backdrops : undefined,
      provider: 'tvdb',
    };
  }
}

/**
 * Create a TVDB provider instance
 */
export function createTVDBProvider(
  plexClient: PlexClient,
  apiKey: string
): TVDBProvider {
  return new TVDBProvider(plexClient, { apiKey });
}
