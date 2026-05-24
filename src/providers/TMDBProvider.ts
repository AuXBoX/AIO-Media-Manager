import axios, { AxiosInstance } from 'axios';
import { PlexClient } from '@/api/plexClient';
import { MediaType, SearchResult, ExternalMetadata } from '@/types';
import { BaseExternalMetadataProvider } from './ExternalMetadataProvider';

/**
 * TMDB API Configuration
 */
interface TMDBConfig {
  apiKey: string;
  baseURL?: string;
  imageBaseURL?: string;
}

/**
 * TMDB API Response Types
 */
interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
}

interface TMDBMovieDetails {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  tagline?: string;
  vote_average?: number;
  release_date?: string;
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  poster_path?: string;
  backdrop_path?: string;
  credits?: {
    cast?: Array<{
      name: string;
      character: string;
      profile_path?: string;
      order: number;
    }>;
    crew?: Array<{
      name: string;
      job: string;
      department: string;
      profile_path?: string;
    }>;
  };
  images?: {
    posters?: Array<{ file_path: string }>;
    backdrops?: Array<{ file_path: string }>;
  };
}

interface TMDBTVDetails {
  id: number;
  name: string;
  original_name?: string;
  overview?: string;
  tagline?: string;
  vote_average?: number;
  first_air_date?: string;
  episode_run_time?: number[];
  genres?: Array<{ id: number; name: string }>;
  poster_path?: string;
  backdrop_path?: string;
  credits?: {
    cast?: Array<{
      name: string;
      character: string;
      profile_path?: string;
      order: number;
    }>;
    crew?: Array<{
      name: string;
      job: string;
      department: string;
      profile_path?: string;
    }>;
  };
  images?: {
    posters?: Array<{ file_path: string }>;
    backdrops?: Array<{ file_path: string }>;
  };
}

/**
 * TMDB Provider
 * 
 * Provides metadata from The Movie Database (TMDB)
 * Supports movies and TV shows
 */
export class TMDBProvider extends BaseExternalMetadataProvider {
  readonly provider = 'tmdb' as const;
  private client: AxiosInstance;
  private imageBaseURL: string;

  constructor(plexClient: PlexClient, config: TMDBConfig) {
    super(plexClient);

    this.imageBaseURL = config.imageBaseURL || 'https://image.tmdb.org/t/p/w500';

    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.themoviedb.org/3',
      params: {
        api_key: config.apiKey,
      },
    });
  }

  /**
   * Search for movies or TV shows
   */
  async search(query: string, type: MediaType, year?: number): Promise<SearchResult[]> {
    let endpoint: string;
    
    switch (type) {
      case 'movie':
        endpoint = '/search/movie';
        break;
      case 'show':
        endpoint = '/search/tv';
        break;
      default:
        throw new Error(`TMDB does not support media type: ${type}`);
    }

    const params: any = {
      query,
      include_adult: false,
    };

    if (year) {
      params[type === 'movie' ? 'year' : 'first_air_date_year'] = year;
    }

    const response = await this.client.get<{ results: TMDBSearchResult[] }>(endpoint, {
      params,
    });

    return response.data.results.map((item) => this.mapSearchResult(item, type));
  }

  /**
   * Get detailed metadata for a movie or TV show
   */
  async getDetails(externalId: string): Promise<ExternalMetadata> {
    // External ID format: "movie-123", "tv-456", "tv-456-season-2", or "tv-456-season-2-episode-5"
    const parts = externalId.split('-');
    if (parts.length < 2) {
      throw new Error(`Invalid TMDB external ID format: ${externalId}`);
    }

    const mediaType = parts[0];
    
    if (mediaType === 'movie') {
      const id = parts.slice(1).join('-');
      return this.getMovieDetails(id);
    } else if (mediaType === 'tv') {
      // Check if this is an episode request: tv-123-season-2-episode-5
      const seasonIndex = parts.indexOf('season');
      const episodeIndex = parts.indexOf('episode');
      
      if (episodeIndex !== -1 && parts[episodeIndex + 1]) {
        const seriesId = parts.slice(1, seasonIndex).join('-');
        const seasonNumber = parseInt(parts[seasonIndex + 1]);
        const episodeNumber = parseInt(parts[episodeIndex + 1]);
        return this.getEpisodeDetails(seriesId, seasonNumber, episodeNumber);
      } else if (seasonIndex !== -1 && parts[seasonIndex + 1]) {
        // Season request: tv-123-season-2
        const seriesId = parts.slice(1, seasonIndex).join('-');
        const seasonNumber = parseInt(parts[seasonIndex + 1]);
        return this.getSeasonDetails(seriesId, seasonNumber);
      } else {
        // Show request: tv-123
        const id = parts.slice(1).join('-');
        return this.getTVDetails(id);
      }
    } else {
      throw new Error(`Invalid TMDB external ID format: ${externalId}`);
    }
  }

  /**
   * Get movie details
   */
  private async getMovieDetails(id: string): Promise<ExternalMetadata> {
    const response = await this.client.get<TMDBMovieDetails>(`/movie/${id}`, {
      params: {
        append_to_response: 'credits,images',
      },
    });

    const movie = response.data;

    return {
      externalId: `movie-${movie.id}`,
      title: movie.title,
      originalTitle: movie.original_title,
      summary: movie.overview,
      tagline: movie.tagline,
      rating: movie.vote_average,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
      releaseDate: movie.release_date,
      runtime: movie.runtime,
      genres: movie.genres?.map((g) => g.name),
      cast: movie.credits?.cast?.map((c) => ({
        name: c.name,
        character: c.character,
        profilePath: c.profile_path ? `${this.imageBaseURL}${c.profile_path}` : undefined,
        order: c.order,
      })),
      crew: movie.credits?.crew?.map((c) => ({
        name: c.name,
        job: c.job,
        department: c.department,
        profilePath: c.profile_path ? `${this.imageBaseURL}${c.profile_path}` : undefined,
      })),
      posters: movie.images?.posters?.map((p) => `${this.imageBaseURL}${p.file_path}`),
      backdrops: movie.images?.backdrops?.map((b) => `${this.imageBaseURL}${b.file_path}`),
      provider: 'tmdb',
    };
  }

  /**
   * Get TV show details
   */
  private async getTVDetails(id: string): Promise<ExternalMetadata> {
    const response = await this.client.get<TMDBTVDetails>(`/tv/${id}`, {
      params: {
        append_to_response: 'credits,images',
      },
    });

    const show = response.data;

    return {
      externalId: `tv-${show.id}`,
      title: show.name,
      originalTitle: show.original_name,
      summary: show.overview,
      tagline: show.tagline,
      rating: show.vote_average,
      year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : undefined,
      releaseDate: show.first_air_date,
      runtime: show.episode_run_time?.[0],
      genres: show.genres?.map((g) => g.name),
      cast: show.credits?.cast?.map((c) => ({
        name: c.name,
        character: c.character,
        profilePath: c.profile_path ? `${this.imageBaseURL}${c.profile_path}` : undefined,
        order: c.order,
      })),
      crew: show.credits?.crew?.map((c) => ({
        name: c.name,
        job: c.job,
        department: c.department,
        profilePath: c.profile_path ? `${this.imageBaseURL}${c.profile_path}` : undefined,
      })),
      posters: show.images?.posters?.map((p) => `${this.imageBaseURL}${p.file_path}`),
      backdrops: show.images?.backdrops?.map((b) => `${this.imageBaseURL}${b.file_path}`),
      provider: 'tmdb',
    };
  }

  /**
   * Get season-specific details and images
   */
  private async getSeasonDetails(seriesId: string, seasonNumber: number): Promise<ExternalMetadata> {
    try {
      // Fetch season images
      const response = await this.client.get(`/tv/${seriesId}/season/${seasonNumber}/images`);
      
      const posters = response.data.posters?.map((p: any) => `${this.imageBaseURL}${p.file_path}`) || [];
      
      // Also fetch series info for metadata
      const seriesResponse = await this.client.get<TMDBTVDetails>(`/tv/${seriesId}`);
      const show = seriesResponse.data;

      return {
        externalId: `tv-${seriesId}-season-${seasonNumber}`,
        title: `${show.name} - Season ${seasonNumber}`,
        summary: show.overview,
        rating: show.vote_average,
        year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : undefined,
        posters: posters.length > 0 ? posters : undefined,
        // Seasons typically use show backdrops
        backdrops: undefined,
        provider: 'tmdb',
      };
    } catch (error) {
      console.error('[TMDB] Error fetching season details:', error);
      throw error;
    }
  }

  /**
   * Get episode-specific details and images
   */
  private async getEpisodeDetails(seriesId: string, seasonNumber: number, episodeNumber: number): Promise<ExternalMetadata> {
    try {
      // Fetch episode images
      const response = await this.client.get(`/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}/images`);
      
      const stills = response.data.stills?.map((s: any) => `${this.imageBaseURL}${s.file_path}`) || [];
      
      // Also fetch episode info for metadata
      const episodeResponse = await this.client.get(`/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`);
      const episode = episodeResponse.data;

      return {
        externalId: `tv-${seriesId}-season-${seasonNumber}-episode-${episodeNumber}`,
        title: episode.name || `Episode ${episodeNumber}`,
        summary: episode.overview,
        rating: episode.vote_average,
        year: episode.air_date ? new Date(episode.air_date).getFullYear() : undefined,
        releaseDate: episode.air_date,
        runtime: episode.runtime,
        posters: stills.length > 0 ? stills : undefined,
        // Episodes typically don't have separate backdrops
        backdrops: undefined,
        provider: 'tmdb',
      };
    } catch (error) {
      console.error('[TMDB] Error fetching episode details:', error);
      throw error;
    }
  }

  /**
   * Map TMDB search result to SearchResult
   */
  private mapSearchResult(item: TMDBSearchResult, type: MediaType): SearchResult {
    const title = item.title || item.name || '';
    const originalTitle = item.original_title || item.original_name;
    const releaseDate = item.release_date || item.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : undefined;

    return {
      externalId: `${type === 'movie' ? 'movie' : 'tv'}-${item.id}`,
      title,
      originalTitle,
      year,
      thumb: item.poster_path ? `${this.imageBaseURL}${item.poster_path}` : undefined,
      summary: item.overview,
      provider: 'tmdb',
    };
  }
}

/**
 * Create a TMDB provider instance
 */
export function createTMDBProvider(
  plexClient: PlexClient,
  apiKey: string
): TMDBProvider {
  return new TMDBProvider(plexClient, { apiKey });
}
