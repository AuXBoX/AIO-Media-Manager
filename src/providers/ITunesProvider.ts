import axios, { AxiosInstance } from 'axios';
import { PlexClient } from '@/api/plexClient';
import { MediaType, SearchResult, ExternalMetadata } from '@/types';
import { BaseExternalMetadataProvider } from './ExternalMetadataProvider';

/**
 * iTunes Search API Response Types
 */
interface ITunesSearchResponse {
  resultCount: number;
  results: ITunesResult[];
}

interface ITunesResult {
  wrapperType: string;
  kind?: string;
  artistId?: number;
  collectionId?: number;
  trackId?: number;
  artistName?: string;
  collectionName?: string;
  trackName?: string;
  collectionCensoredName?: string;
  trackCensoredName?: string;
  artistViewUrl?: string;
  collectionViewUrl?: string;
  trackViewUrl?: string;
  previewUrl?: string;
  artworkUrl30?: string;
  artworkUrl60?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  contentAdvisoryRating?: string;
  longDescription?: string;
  shortDescription?: string;
}

/**
 * iTunes Search Provider
 * 
 * Provides album artwork and metadata from Apple's iTunes Search API
 * Free, no API key required
 * Docs: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */
export class ITunesProvider extends BaseExternalMetadataProvider {
  readonly provider = 'itunes' as const;
  private client: AxiosInstance;

  constructor(plexClient: PlexClient) {
    super(plexClient);

    this.client = axios.create({
      baseURL: 'https://itunes.apple.com',
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Search for music content via iTunes Search API
   */
  async search(query: string, type: MediaType, _year?: number): Promise<SearchResult[]> {
    // iTunes only supports music-related types
    if (type !== 'artist' && type !== 'album' && type !== 'track') {
      return [];
    }

    try {
      const entityMap: Record<string, string> = {
        artist: 'musicArtist',
        album: 'album',
        track: 'song',
      };

      const response = await this.client.get<ITunesSearchResponse>('/search', {
        params: {
          term: query,
          media: 'music',
          entity: entityMap[type],
          limit: 10,
        },
        timeout: 10000,
      });

      if (!response.data?.results?.length) {
        return [];
      }

      return response.data.results
        .filter(result => this.isValidResult(result, type))
        .slice(0, 5)
        .map(result => this.toSearchResult(result, type));
    } catch (error) {
      console.error('[iTunes] Search failed:', error);
      return [];
    }
  }

  /**
   * Get detailed metadata including high-res artwork
   * For artists, also fetch their albums to get artwork
   */
  async getDetails(externalId: string): Promise<ExternalMetadata> {
    // External ID format: "artist-{id}", "album-{id}", "track-{id}"
    const separatorIndex = externalId.indexOf('-');
    if (separatorIndex === -1) {
      throw new Error(`Invalid iTunes external ID format: ${externalId}`);
    }

    const entityType = externalId.substring(0, separatorIndex);
    const idStr = externalId.substring(separatorIndex + 1);
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      throw new Error(`Invalid iTunes ID: ${idStr}`);
    }

    try {
      const lookupEntity = entityType === 'artist' ? 'musicArtist'
        : entityType === 'album' ? 'album'
        : 'song';

      const response = await this.client.get<ITunesSearchResponse>('/lookup', {
        params: {
          id: id,
          entity: lookupEntity,
        },
        timeout: 10000,
      });

      const result = response.data?.results?.[0];
      if (!result) {
        throw new Error(`iTunes lookup failed for ID: ${id}`);
      }

      const metadata = this.toExternalMetadata(result, entityType as MediaType);

      // For artists, also fetch albums to get artwork
      if (entityType === 'artist') {
        try {
          const albumResponse = await this.client.get<ITunesSearchResponse>('/lookup', {
            params: {
              id: id,
              entity: 'album',
            },
            timeout: 10000,
          });

          if (albumResponse.data?.results?.length) {
            // Collect artwork from all albums
            const albumArtwork: string[] = [];
            for (const album of albumResponse.data.results.slice(0, 10)) {
              const artwork = this.getHighResArtwork(album);
              if (artwork && !albumArtwork.includes(artwork)) {
                albumArtwork.push(artwork);
              }
            }

            // Add album artwork to artist metadata
            if (albumArtwork.length > 0) {
              metadata.posters = albumArtwork;
            }
          }
        } catch (albumError) {
          console.warn('[iTunes] Failed to fetch artist albums:', albumError);
        }
      }

      return metadata;
    } catch (error) {
      console.error('[iTunes] Get details failed:', error);
      throw error;
    }
  }

  /**
   * Check if a result is valid for the given type
   */
  private isValidResult(result: ITunesResult, type: MediaType): boolean {
    switch (type) {
      case 'artist':
        return !!result.artistId && !!result.artistName;
      case 'album':
        return !!result.collectionId && !!result.collectionName;
      case 'track':
        return !!result.trackId && !!result.trackName;
      default:
        return false;
    }
  }

  /**
   * Convert iTunes result to SearchResult
   */
  private toSearchResult(result: ITunesResult, type: MediaType): SearchResult {
    const title = type === 'artist' ? (result.artistName || '')
      : type === 'album' ? (result.collectionName || '')
      : (result.trackName || '');

    const thumb = this.getHighResArtwork(result);

    // Extract year from releaseDate (format: "2003-09-23T07:00:00Z")
    const year = result.releaseDate
      ? new Date(result.releaseDate).getFullYear()
      : undefined;

    return {
      externalId: `${type}-${type === 'artist' ? result.artistId : type === 'album' ? result.collectionId : result.trackId}`,
      title: title,
      originalTitle: title,
      year: year,
      summary: result.longDescription || result.shortDescription,
      provider: 'itunes',
      thumb: thumb,
    };
  }

  /**
   * Convert iTunes result to ExternalMetadata
   */
  private toExternalMetadata(result: ITunesResult, type: MediaType): ExternalMetadata {
    const title = type === 'artist' ? (result.artistName || '')
      : type === 'album' ? (result.collectionName || '')
      : (result.trackName || '');

    const artwork = this.getHighResArtwork(result);
    const year = result.releaseDate
      ? new Date(result.releaseDate).getFullYear()
      : undefined;

    return {
      externalId: `${type}-${type === 'artist' ? result.artistId : type === 'album' ? result.collectionId : result.trackId}`,
      title: title,
      year: year,
      summary: result.longDescription || result.shortDescription,
      genres: result.primaryGenreName ? [result.primaryGenreName] : [],
      posters: artwork ? [artwork] : undefined,
      provider: 'itunes',
    };
  }

  /**
   * Get the highest resolution artwork URL available
   * iTunes artwork URLs can be upscaled by replacing the size parameter
   */
  private getHighResArtwork(result: ITunesResult): string | undefined {
    const artworkUrl = result.artworkUrl100 || result.artworkUrl60 || result.artworkUrl30;
    if (!artworkUrl) return undefined;

    // Upscale to 600x600 by replacing size in URL
    // iTunes URLs look like: https://is1-ssl.mzstatic.com/image/thumb/.../100x100bb.jpg
    return artworkUrl
      .replace('100x100', '600x600')
      .replace('60x60', '600x600')
      .replace('30x30', '600x600');
  }
}

/**
 * Create an iTunes provider instance
 */
export function createITunesProvider(plexClient: PlexClient): ITunesProvider {
  return new ITunesProvider(plexClient);
}
