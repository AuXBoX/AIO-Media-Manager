import axios, { AxiosInstance } from 'axios';
import { PlexClient } from '@/api/plexClient';
import { MediaType, SearchResult, ExternalMetadata } from '@/types';
import { BaseExternalMetadataProvider } from './ExternalMetadataProvider';

/**
 * Discogs API Configuration
 */
interface DiscogsConfig {
  apiKey?: string;
  apiSecret?: string;
  baseURL?: string;
}

/**
 * Discogs API Response Types
 */
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
  }>;
  urls?: string[];
}

interface DiscogsMaster {
  id: number;
  title: string;
  year?: number;
  genres?: string[];
  styles?: string[];
  artists?: Array<{
    id: number;
    name: string;
  }>;
  images?: Array<{
    type: string;
    uri: string;
    uri150: string;
    width: number;
    height: number;
  }>;
  tracklist?: Array<{
    position: string;
    title: string;
    duration: string;
  }>;
}

interface DiscogsRelease {
  id: number;
  title: string;
  year?: number;
  genres?: string[];
  styles?: string[];
  artists?: Array<{
    id: number;
    name: string;
  }>;
  images?: Array<{
    type: string;
    uri: string;
    uri150: string;
    width: number;
    height: number;
  }>;
  tracklist?: Array<{
    position: string;
    title: string;
    duration: string;
  }>;
  labels?: Array<{
    name: string;
    catno: string;
  }>;
  formats?: Array<{
    name: string;
    qty: string;
    descriptions?: string[];
  }>;
}

interface DiscogsSearchResult {
  id: number;
  type: string;
  title: string;
  year?: string;
  thumb?: string;
  cover_image?: string;
  genre?: string[];
  style?: string[];
}

/**
 * Discogs Provider
 * 
 * Provides metadata from Discogs
 * Supports artists, albums (masters/releases), and tracks
 */
export class DiscogsProvider extends BaseExternalMetadataProvider {
  readonly provider = 'discogs' as const;
  private client: AxiosInstance;
  private apiKey?: string;
  private apiSecret?: string;

  constructor(plexClient: PlexClient, config: DiscogsConfig = {}) {
    super(plexClient);

    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;

    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.discogs.com',
      headers: {
        'User-Agent': 'AIO-Media-Manager/1.0.0',
      },
    });
  }

  /**
   * Get authentication params for requests
   */
  private getAuthParams(): Record<string, string> {
    if (this.apiKey && this.apiSecret) {
      return {
        key: this.apiKey,
        secret: this.apiSecret,
      };
    }
    return {};
  }

  /**
   * Search for artists, albums, or tracks
   */
  async search(query: string, type: MediaType, year?: number): Promise<SearchResult[]> {
    const searchType = type === 'artist' ? 'artist' : type === 'album' ? 'release' : 'release';
    
    const params: any = {
      q: query,
      type: searchType,
      ...this.getAuthParams(),
    };

    if (year) {
      params.year = year;
    }

    const response = await this.client.get<{ results: DiscogsSearchResult[] }>('/database/search', {
      params,
    });

    return (response.data.results || []).slice(0, 25).map((result) => ({
      externalId: `${result.type}-${result.id}`,
      title: result.title,
      year: result.year ? parseInt(result.year, 10) : undefined,
      thumb: result.thumb || result.cover_image,
      summary: result.genre?.join(', '),
      provider: 'discogs' as const,
    }));
  }

  /**
   * Get detailed metadata
   */
  async getDetails(externalId: string): Promise<ExternalMetadata> {
    // External ID format: "artist-{id}", "master-{id}", or "release-{id}"
    const separatorIndex = externalId.indexOf('-');
    if (separatorIndex === -1) {
      throw new Error(`Invalid Discogs external ID format: ${externalId}`);
    }

    const entityType = externalId.substring(0, separatorIndex);
    const id = externalId.substring(separatorIndex + 1);

    switch (entityType) {
      case 'artist':
        return this.getArtistDetails(id);
      case 'master':
        return this.getMasterDetails(id);
      case 'release':
        return this.getReleaseDetails(id);
      default:
        throw new Error(`Invalid Discogs external ID format: ${externalId}`);
    }
  }

  /**
   * Get artist details
   */
  private async getArtistDetails(id: string): Promise<ExternalMetadata> {
    const response = await this.client.get<DiscogsArtist>(`/artists/${id}`, {
      params: this.getAuthParams(),
    });

    const artist = response.data;

    // Extract images
    const posters = artist.images
      ?.filter((img) => img.type === 'primary')
      .map((img) => img.uri);

    const backdrops = artist.images
      ?.filter((img) => img.type === 'secondary')
      .map((img) => img.uri);

    return {
      externalId: `artist-${artist.id}`,
      title: artist.name,
      originalTitle: artist.realname,
      summary: artist.profile,
      posters: posters && posters.length > 0 ? posters : undefined,
      backdrops: backdrops && backdrops.length > 0 ? backdrops : undefined,
      provider: 'discogs',
    };
  }

  /**
   * Get master release details
   */
  private async getMasterDetails(id: string): Promise<ExternalMetadata> {
    const response = await this.client.get<DiscogsMaster>(`/masters/${id}`, {
      params: this.getAuthParams(),
    });

    const master = response.data;

    // Extract images
    const posters = master.images
      ?.filter((img) => img.type === 'primary')
      .map((img) => img.uri);

    const backdrops = master.images
      ?.filter((img) => img.type === 'secondary')
      .map((img) => img.uri);

    return {
      externalId: `master-${master.id}`,
      title: master.title,
      year: master.year,
      genres: [...(master.genres || []), ...(master.styles || [])],
      posters: posters && posters.length > 0 ? posters : undefined,
      backdrops: backdrops && backdrops.length > 0 ? backdrops : undefined,
      provider: 'discogs',
    };
  }

  /**
   * Get release details
   */
  private async getReleaseDetails(id: string): Promise<ExternalMetadata> {
    const response = await this.client.get<DiscogsRelease>(`/releases/${id}`, {
      params: this.getAuthParams(),
    });

    const release = response.data;

    // Extract images
    const posters = release.images
      ?.filter((img) => img.type === 'primary')
      .map((img) => img.uri);

    const backdrops = release.images
      ?.filter((img) => img.type === 'secondary')
      .map((img) => img.uri);

    return {
      externalId: `release-${release.id}`,
      title: release.title,
      year: release.year,
      genres: [...(release.genres || []), ...(release.styles || [])],
      posters: posters && posters.length > 0 ? posters : undefined,
      backdrops: backdrops && backdrops.length > 0 ? backdrops : undefined,
      provider: 'discogs',
    };
  }
}

/**
 * Create a Discogs provider instance
 */
export function createDiscogsProvider(
  plexClient: PlexClient,
  apiKey?: string,
  apiSecret?: string
): DiscogsProvider {
  return new DiscogsProvider(plexClient, { apiKey, apiSecret });
}
