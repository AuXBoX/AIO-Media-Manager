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
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(plexClient: PlexClient, config: TVDBConfig) {
    super(plexClient);

    this.client = axios.create({
      baseURL: config.baseURL || 'https://api4.thetvdb.com/v4',
    });

    // Store API key for authentication
    this.client.defaults.headers.common['Authorization'] = `Bearer ${config.apiKey}`;
  }

  /**
   * Authenticate with TVDB API
   * TVDB v4 uses API key directly in Authorization header
   */
  private async ensureAuthenticated(): Promise<void> {
    // TVDB v4 uses API key directly, no need for token exchange
    // Just ensure the API key is set
    if (!this.client.defaults.headers.common['Authorization']) {
      throw new Error('TVDB API key not configured');
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

    // External ID format: "series-{tvdbId}"
    const tvdbId = externalId.replace('series-', '');

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
