import axios, { AxiosInstance } from 'axios';
import { PlexClient } from '@/api/plexClient';
import { MediaType, SearchResult, ExternalMetadata } from '@/types';
import { BaseExternalMetadataProvider } from './ExternalMetadataProvider';

/**
 * OMDb API Configuration
 * 
 * Note: IMDB doesn't have an official API, so we use OMDb API
 * which provides IMDB data
 */
interface OMDbConfig {
  apiKey: string;
  baseURL?: string;
}

/**
 * OMDb API Response Types
 */
interface OMDbSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type: 'movie' | 'series' | 'episode';
  Poster: string;
}

interface OMDbDetails {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: Array<{ Source: string; Value: string }>;
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: 'movie' | 'series' | 'episode';
  DVD?: string;
  BoxOffice?: string;
  Production?: string;
  Website?: string;
  Response: 'True' | 'False';
  Error?: string;
}

/**
 * IMDB Provider (via OMDb API)
 * 
 * Provides metadata from IMDB via the OMDb API
 * Supports movies and TV shows
 */
export class IMDBProvider extends BaseExternalMetadataProvider {
  readonly provider = 'imdb' as const;
  private client: AxiosInstance;

  constructor(plexClient: PlexClient, config: OMDbConfig) {
    super(plexClient);

    this.client = axios.create({
      baseURL: config.baseURL || 'https://www.omdbapi.com',
      params: {
        apikey: config.apiKey,
      },
    });
  }

  /**
   * Search for movies or TV shows
   */
  async search(query: string, type: MediaType, year?: number): Promise<SearchResult[]> {
    if (type !== 'movie' && type !== 'show') {
      throw new Error(`IMDB provider does not support media type: ${type}`);
    }

    const params: any = {
      s: query,
      type: type === 'movie' ? 'movie' : 'series',
    };

    if (year) {
      params.y = year;
    }

    const response = await this.client.get<{
      Search?: OMDbSearchResult[];
      Response: 'True' | 'False';
      Error?: string;
    }>('/', { params });

    if (response.data.Response === 'False') {
      return [];
    }

    return (response.data.Search || []).map((item) => this.mapSearchResult(item));
  }

  /**
   * Get detailed metadata for a movie or TV show
   */
  async getDetails(externalId: string): Promise<ExternalMetadata> {
    // External ID is the IMDB ID (e.g., "tt0111161")
    const response = await this.client.get<OMDbDetails>('/', {
      params: {
        i: externalId,
        plot: 'full',
      },
    });

    if (response.data.Response === 'False') {
      throw new Error(response.data.Error || 'Failed to fetch IMDB details');
    }

    return this.mapDetails(response.data);
  }

  /**
   * Map OMDb search result to SearchResult
   */
  private mapSearchResult(item: OMDbSearchResult): SearchResult {
    return {
      externalId: item.imdbID,
      title: item.Title,
      year: parseInt(item.Year, 10) || undefined,
      thumb: item.Poster !== 'N/A' ? item.Poster : undefined,
      provider: 'imdb',
    };
  }

  /**
   * Map OMDb details to ExternalMetadata
   */
  private mapDetails(details: OMDbDetails): ExternalMetadata {
    // Parse runtime (e.g., "142 min" -> 142)
    const runtime = details.Runtime !== 'N/A' 
      ? parseInt(details.Runtime.replace(/\D/g, ''), 10) 
      : undefined;

    // Parse rating (0-10 scale)
    const rating = details.imdbRating !== 'N/A' 
      ? parseFloat(details.imdbRating) 
      : undefined;

    // Parse genres
    const genres = details.Genre !== 'N/A' 
      ? details.Genre.split(', ') 
      : undefined;

    // Parse cast (actors)
    const cast = details.Actors !== 'N/A'
      ? details.Actors.split(', ').map((name, index) => ({
          name,
          character: '', // OMDb doesn't provide character names
          order: index,
        }))
      : undefined;

    // Parse crew (directors and writers)
    const directors = details.Director !== 'N/A' 
      ? details.Director.split(', ') 
      : undefined;

    const writers = details.Writer !== 'N/A' 
      ? details.Writer.split(', ') 
      : undefined;

    const crew = [
      ...(directors?.map((name) => ({
        name,
        job: 'Director',
        department: 'Directing',
      })) || []),
      ...(writers?.map((name) => ({
        name,
        job: 'Writer',
        department: 'Writing',
      })) || []),
    ];

    // Parse year
    const year = parseInt(details.Year, 10) || undefined;

    return {
      externalId: details.imdbID,
      title: details.Title,
      summary: details.Plot !== 'N/A' ? details.Plot : undefined,
      rating,
      year,
      releaseDate: details.Released !== 'N/A' ? details.Released : undefined,
      runtime,
      genres,
      cast,
      crew: crew.length > 0 ? crew : undefined,
      posters: details.Poster !== 'N/A' ? [details.Poster] : undefined,
      provider: 'imdb',
    };
  }
}

/**
 * Create an IMDB provider instance
 */
export function createIMDBProvider(
  plexClient: PlexClient,
  apiKey: string
): IMDBProvider {
  return new IMDBProvider(plexClient, { apiKey });
}
