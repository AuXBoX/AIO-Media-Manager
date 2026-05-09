import axios, { AxiosInstance } from 'axios';
import { PlexClient } from '@/api/plexClient';
import { MediaType, SearchResult, ExternalMetadata } from '@/types';
import { BaseExternalMetadataProvider } from './ExternalMetadataProvider';

/**
 * Discogs API Configuration
 */
interface DiscogsConfig {
  apiKey: string;
  apiSecret?: string;
  baseURL?: string;
  userAgent?: string;
}

/**
 * Discogs API Response Types
 */
interface DiscogsSearchResult {
  id: number;
  type: 'release' | 'master' | 'artist' | 'label';
  title: string;
  thumb?: string;
  cover_image?: string;
  resource_url: string;
  year?: string;
  format?: string[];
  label?: string[];
  genre?: string[];
  style?: string[];
  country?: string;
  barcode?: string[];
  catno?: string;
}

interface DiscogsArtist {
  id: number;
  name: string;
  realname?: string;
  profile?: string;
  images?: Array<{
    type: string;
    uri: string;
    uri150: string;
    width: number;
    height: number;
  }>;
  members?: Array<{
    id: number;
    name: string;
    active: boolean;
  }>;
  groups?: Array<{
    id: number;
    name: string;
    active: boolean;
  }>;
  urls?: string[];
  namevariations?: string[];
  aliases?: Array<{
    id: number;
    name: string;
  }>;
}

interface DiscogsRelease {
  id: number;
  title: string;
  artists?: Array<{
    id: number;
    name: string;
    anv?: string;
    join?: string;
    role?: string;
    tracks?: string;
  }>;
  labels?: Array<{
    id: number;
    name: string;
    catno: string;
  }>;
  formats?: Array<{
    name: string;
    qty: string;
    descriptions?: string[];
  }>;
  genres?: string[];
  styles?: string[];
  year?: number;
  released?: string;
  country?: string;
  notes?: string;
  tracklist?: Array<{
    position: string;
    type_: string;
    title: string;
    duration: string;
    artists?: Array<{
      id: number;
      name: string;
    }>;
  }>;
  images?: Array<{
    type: string;
    uri: string;
    uri150: string;
    width: number;
    height: number;
  }>;
  videos?: Array<{
    uri: string;
    title: string;
    description: string;
    duration: number;
  }>;
  community?: {
    rating?: {
      average: number;
      count: number;
    };
  };
}

/**
 * Discogs Provider
 * 
 * Provides metadata from Discogs
 * Supports artists, albums, and releases
 */
export class DiscogsProvider extends BaseExternalMetadataProvider {
  readonly provider = 'discogs' as const;
  private client: AxiosInstance;

  constructor(plexClient: PlexClient, config: DiscogsConfig) {
    super(plexClient);

    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.discogs.com',
      headers: {
        'User-Agent': config.userAgent || 'AIO-Media-Manager/1.0.0',
        'Authorization': `Discogs key=${config.apiKey}${config.apiSecret ? `, secret=${config.apiSecret}` : ''}`,
      },
    });
  }

  /**
   * Search for artists, albums, or releases
   */
  async search(query: string, type: MediaType, year?: number): Promise<SearchResult[]> {
    let searchType: string;

    switch (type) {
      case 'artist':
        searchType = 'artist';
        break;
      case 'album':
      case 'track':
        searchType = 'release';
        break;
      default:
        throw new Error(`Discogs does not support media type: ${type}`);
    }

    try {
      const params: any = {
        q: query,
        type: searchType,
        per_page: 25,
      };

      if (year) {
        params.year = year;
      }

      const response = await this.client.get<{
        results: DiscogsSearchResult[];
      }>('/database/search', { params });

      return (response.data.results || []).map((item) => this.mapSearchResult(item, type));
    } catch (error) {
      console.error('Discogs search error:', error);
      return [];
    }
  }

  /**
   * Get detailed metadata
   */
  async getDetails(externalId: string): Promise<ExternalMetadata> {
    // External ID format: "artist-{id}", "release-{id}", or "master-{id}"
    const separatorIndex = externalId.indexOf('-');
    if (separatorIndex === -1) {
      throw new Error(`Invalid Discogs external ID format: ${externalId}`);
    }

    const entityType = externalId.substring(0, separatorIndex);
    const id = externalId.substring(separatorIndex + 1);

    switch (entityType) {
      case 'artist':
        return this.getArtistDetails(id);
      case 'release':
      case 'master':
        return this.getReleaseDetails(id);
      default:
        throw new Error(`Invalid Discogs external ID format: ${externalId}`);
    }
  }

  /**
   * Map Discogs search result to SearchResult
   */
  private mapSearchResult(item: DiscogsSearchResult, type: MediaType): SearchResult {
    const year = item.year ? parseInt(item.year, 10) : undefined;

    return {
      externalId: `${item.type}-${item.id}`,
      title: item.title,
      year,
      thumb: item.thumb || item.cover_image,
      summary: item.format?.join(', '),
      provider: 'discogs',
    };
  }

  /**
   * Get artist details
   */
  private async getArtistDetails(id: string): Promise<ExternalMetadata> {
    const response = await this.client.get<DiscogsArtist>(`/artists/${id}`);
    const artist = response.data;

    // Get primary image
    const primaryImage = artist.images?.find((img) => img.type === 'primary');
    const posters = artist.images?.map((img) => img.uri);

    return {
      externalId: `artist-${artist.id}`,
      title: artist.name,
      originalTitle: artist.realname,
      summary: artist.profile,
      posters: posters && posters.length > 0 ? posters : undefined,
      provider: 'discogs',
    };
  }

  /**
   * Get release details
   */
  private async getReleaseDetails(id: string): Promise<ExternalMetadata> {
    const response = await this.client.get<DiscogsRelease>(`/releases/${id}`);
    const release = response.data;

    // Extract artist names
    const artistNames = release.artists?.map((a) => a.name).join(', ');

    // Extract images
    const posters = release.images?.map((img) => img.uri);

    // Calculate average track duration
    let totalDuration = 0;
    let trackCount = 0;

    release.tracklist?.forEach((track) => {
      if (track.duration) {
        const parts = track.duration.split(':');
        const seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        totalDuration += seconds;
        trackCount++;
      }
    });

    const averageRuntime = trackCount > 0 ? Math.floor(totalDuration / trackCount) : undefined;

    return {
      externalId: `release-${release.id}`,
      title: release.title,
      summary: `${artistNames}${release.notes ? ` - ${release.notes}` : ''}`,
      year: release.year,
      releaseDate: release.released,
      runtime: averageRuntime,
      genres: release.genres && release.genres.length > 0 
        ? [...release.genres, ...(release.styles || [])] 
        : release.styles,
      rating: release.community?.rating?.average,
      posters: posters && posters.length > 0 ? posters : undefined,
      provider: 'discogs',
    };
  }
}

/**
 * Create a Discogs provider instance
 */
export function createDiscogsProvider(
  plexClient: PlexClient,
  apiKey: string,
  apiSecret?: string
): DiscogsProvider {
  return new DiscogsProvider(plexClient, { apiKey, apiSecret });
}
