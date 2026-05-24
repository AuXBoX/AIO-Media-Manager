import axios, { AxiosInstance } from 'axios';
import { PlexClient } from '@/api/plexClient';
import { MediaType, SearchResult, ExternalMetadata } from '@/types';
import { BaseExternalMetadataProvider } from './ExternalMetadataProvider';

/**
 * Fanart.tv API Configuration
 */
interface FanartConfig {
  apiKey: string;
  baseURL?: string;
}

/**
 * Fanart.tv API Response Types
 */
interface FanartMovieImages {
  name: string;
  tmdb_id: string;
  imdb_id: string;
  hdmovielogo?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  moviedisc?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
    disc: string;
    disc_type: string;
  }>;
  movielogo?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  movieposter?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  hdmovieclearart?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  movieart?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  moviebackground?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  moviebanner?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  moviethumb?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
}

interface FanartTVImages {
  name: string;
  thetvdb_id: string;
  clearlogo?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  hdtvlogo?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  clearart?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  showbackground?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  tvthumb?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  seasonposter?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
    season: string;
  }>;
  seasonthumb?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
    season: string;
  }>;
  hdclearart?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  tvbanner?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  characterart?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  tvposter?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
  }>;
  seasonbanner?: Array<{
    id: string;
    url: string;
    lang: string;
    likes: string;
    season: string;
  }>;
}

interface FanartMusicImages {
  name: string;
  mbid_id: string;
  artistbackground?: Array<{
    id: string;
    url: string;
    likes: string;
  }>;
  artistthumb?: Array<{
    id: string;
    url: string;
    likes: string;
  }>;
  musiclogo?: Array<{
    id: string;
    url: string;
    likes: string;
  }>;
  hdmusiclogo?: Array<{
    id: string;
    url: string;
    likes: string;
  }>;
  musicbanner?: Array<{
    id: string;
    url: string;
    likes: string;
  }>;
  albums?: {
    [albumId: string]: {
      albumcover?: Array<{
        id: string;
        url: string;
        likes: string;
      }>;
      cdart?: Array<{
        id: string;
        url: string;
        likes: string;
        disc: string;
        size: string;
      }>;
    };
  };
}

/**
 * Fanart.tv Provider
 * 
 * Provides high-quality artwork from Fanart.tv
 * Supports movies, TV shows, and music
 * 
 * Note: This provider is for artwork only, not metadata
 */
export class FanartProvider extends BaseExternalMetadataProvider {
  readonly provider = 'fanart' as const;
  private client: AxiosInstance;

  constructor(plexClient: PlexClient, config: FanartConfig) {
    super(plexClient);

    this.client = axios.create({
      baseURL: config.baseURL || 'https://webservice.fanart.tv/v3',
      params: {
        api_key: config.apiKey,
      },
    });
  }

  /**
   * Search is not supported by Fanart.tv
   * Use TMDB/TVDB/MusicBrainz IDs to fetch artwork
   */
  async search(query: string, type: MediaType, year?: number): Promise<SearchResult[]> {
    throw new Error('Fanart.tv does not support search. Use TMDB/TVDB/MusicBrainz IDs to fetch artwork.');
  }

  /**
   * Get artwork for a movie, TV show, or music artist
   */
  async getDetails(externalId: string): Promise<ExternalMetadata> {
    // External ID format: "movie-{tmdbId}", "tv-{tvdbId}", or "music-{mbid}"
    const separatorIndex = externalId.indexOf('-');
    if (separatorIndex === -1) {
      throw new Error(`Invalid Fanart external ID format: ${externalId}. Expected format: "movie-123", "tv-456", or "music-abc"`);
    }

    const entityType = externalId.substring(0, separatorIndex);
    const id = externalId.substring(separatorIndex + 1);
    
    // Validate ID is not empty
    if (!id || id.trim() === '') {
      throw new Error(`Invalid Fanart external ID: ID part is empty in "${externalId}"`);
    }

    switch (entityType) {
      case 'movie':
        return this.getMovieArtwork(id);
      case 'tv':
        return this.getTVArtwork(id);
      case 'music':
        return this.getMusicArtwork(id);
      default:
        throw new Error(`Invalid Fanart external ID format: ${externalId}. Unknown entity type: "${entityType}"`);
    }
  }

  /**
   * Get movie artwork
   */
  private async getMovieArtwork(tmdbId: string): Promise<ExternalMetadata> {
    try {
      const response = await this.client.get<FanartMovieImages>(`/movies/${tmdbId}`);
      const images = response.data;

      // Sort by likes and extract URLs
      const sortByLikes = (arr: Array<{ url: string; likes: string }> | undefined) =>
        arr?.sort((a, b) => parseInt(b.likes, 10) - parseInt(a.likes, 10)).map((img) => img.url);

      return {
        externalId: `movie-${tmdbId}`,
        title: images.name,
        posters: sortByLikes(images.movieposter),
        backdrops: sortByLikes(images.moviebackground),
        // Additional artwork types specific to Fanart.tv
        logos: sortByLikes(images.hdmovielogo || images.movielogo),
        clearart: sortByLikes(images.hdmovieclearart || images.movieart),
        banners: sortByLikes(images.moviebanner),
        thumbs: sortByLikes(images.moviethumb),
        provider: 'fanart',
      };
    } catch (error: any) {
      // Handle CORS and authentication errors gracefully
      if (error.response?.status === 401) {
        throw new Error('Fanart.tv API key is invalid or expired. Please check your API key in settings.');
      }
      if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
        throw new Error('Fanart.tv API is unreachable. This may be due to CORS issues or an invalid API key.');
      }
      throw error;
    }
  }

  /**
   * Get TV show artwork
   */
  private async getTVArtwork(tvdbId: string): Promise<ExternalMetadata> {
    try {
      const response = await this.client.get<FanartTVImages>(`/tv/${tvdbId}`);
      const images = response.data;

      // Sort by likes and extract URLs
      const sortByLikes = (arr: Array<{ url: string; likes: string }> | undefined) =>
        arr?.sort((a, b) => parseInt(b.likes, 10) - parseInt(a.likes, 10)).map((img) => img.url);

      return {
        externalId: `tv-${tvdbId}`,
        title: images.name,
        posters: sortByLikes(images.tvposter),
        backdrops: sortByLikes(images.showbackground),
        // Additional artwork types specific to Fanart.tv
        logos: sortByLikes(images.hdtvlogo || images.clearlogo),
        clearart: sortByLikes(images.hdclearart || images.clearart),
        banners: sortByLikes(images.tvbanner),
        thumbs: sortByLikes(images.tvthumb),
        characterart: sortByLikes(images.characterart),
        provider: 'fanart',
      };
    } catch (error: any) {
      // Handle CORS and authentication errors gracefully
      if (error.response?.status === 401) {
        throw new Error('Fanart.tv API key is invalid or expired. Please check your API key in settings.');
      }
      if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
        throw new Error('Fanart.tv API is unreachable. This may be due to CORS issues or an invalid API key.');
      }
      throw error;
    }
  }

  /**
   * Get music artist artwork
   */
  private async getMusicArtwork(mbid: string): Promise<ExternalMetadata> {
    try {
      const response = await this.client.get<FanartMusicImages>(`/music/${mbid}`);
      const images = response.data;

      // Sort by likes and extract URLs
      const sortByLikes = (arr: Array<{ url: string; likes: string }> | undefined) =>
        arr?.sort((a, b) => parseInt(b.likes, 10) - parseInt(a.likes, 10)).map((img) => img.url);

      return {
        externalId: `music-${mbid}`,
        title: images.name,
        backdrops: sortByLikes(images.artistbackground),
        thumbs: sortByLikes(images.artistthumb),
        // Additional artwork types specific to Fanart.tv
        logos: sortByLikes(images.hdmusiclogo || images.musiclogo),
        banners: sortByLikes(images.musicbanner),
        provider: 'fanart',
      };
    } catch (error: any) {
      // Handle CORS and authentication errors gracefully
      if (error.response?.status === 401) {
        throw new Error('Fanart.tv API key is invalid or expired. Please check your API key in settings.');
      }
      if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
        throw new Error('Fanart.tv API is unreachable. This may be due to CORS issues or an invalid API key.');
      }
      throw error;
    }
  }

  /**
   * Get album artwork
   * Requires both artist MBID and album MBID
   */
  async getAlbumArtwork(artistMbid: string, albumMbid: string): Promise<string[]> {
    const response = await this.client.get<FanartMusicImages>(`/music/albums/${artistMbid}`);
    const images = response.data;

    const albumImages = images.albums?.[albumMbid];
    if (!albumImages) {
      return [];
    }

    const sortByLikes = (arr: Array<{ url: string; likes: string }> | undefined) =>
      arr?.sort((a, b) => parseInt(b.likes, 10) - parseInt(a.likes, 10)).map((img) => img.url) || [];

    return sortByLikes(albumImages.albumcover);
  }
}

/**
 * Create a Fanart.tv provider instance
 */
export function createFanartProvider(
  plexClient: PlexClient,
  apiKey: string
): FanartProvider {
  return new FanartProvider(plexClient, { apiKey });
}

// Extend ExternalMetadata type to include Fanart-specific fields
declare module '@/types' {
  interface ExternalMetadata {
    logos?: string[];
    clearart?: string[];
    banners?: string[];
    thumbs?: string[];
    characterart?: string[];
  }
}
