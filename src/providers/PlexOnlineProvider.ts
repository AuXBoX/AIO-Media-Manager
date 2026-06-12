import axios, { AxiosInstance } from 'axios';
import { PlexClient } from '@/api/plexClient';
import { MediaType, SearchResult, ExternalMetadata } from '@/types';
import { BaseExternalMetadataProvider } from './ExternalMetadataProvider';

/**
 * Plex Online Database URLs
 */
const PLEX_DISCOVER_URL = 'https://discover.provider.plex.tv';
const PLEX_METADATA_URL = 'https://metadata.provider.plex.tv';

/**
 * Plex Discover search response types
 */
interface PlexDiscoverResponse {
  MediaContainer: {
    SearchResults?: Array<{
      id: string;
      title?: string;
      size?: number;
      SearchResult?: Array<PlexSearchResultItem>;
    }>;
  };
}

interface PlexSearchResultItem {
  Metadata: {
    ratingKey: string;
    key: string;
    guid?: string;
    type: string;
    title: string;
    originalTitle?: string;
    year?: number;
    thumb?: string;
    art?: string;
    summary?: string;
    originallyAvailableAt?: string;
    studio?: string;
    Genre?: Array<{ tag: string }>;
    collection?: Array<{ tag: string; id?: number; key?: string }>;
  };
}

/**
 * Plex metadata detail response
 */
interface PlexMetadataDetailResponse {
  MediaContainer: {
    Metadata?: Array<{
      ratingKey: string;
      key: string;
      guid: string;
      type: string;
      title: string;
      originalTitle?: string;
      year?: number;
      thumb?: string;
      art?: string;
      summary?: string;
      tagline?: string;
      rating?: number;
      originallyAvailableAt?: string;
      runtime?: number;
      Genre?: Array<{ tag: string }>;
      Role?: Array<{ tag: string; role?: string; thumb?: string }>;
      Director?: Array<{ tag: string }>;
      Writer?: Array<{ tag: string }>;
      Poster?: Array<{ id: string; key: string; link?: string }>;
      Art?: Array<{ id: string; key: string; link?: string }>;
    }>;
  };
}

/**
 * Plex Online Provider
 *
 * Searches Plex's own online metadata database (Discover/Metadata Provider).
 * This is the same database Plex uses internally for metadata matching and
 * the Discover feature. It provides posters, backdrops, and metadata for
 * movies and TV shows directly from Plex's servers.
 */
export class PlexOnlineProvider extends BaseExternalMetadataProvider {
  readonly provider = 'plex' as const;

  private client: AxiosInstance;
  private token: string;

  constructor(plexClient: PlexClient, token: string) {
    super(plexClient);
    this.token = token;
    this.client = axios.create({
      timeout: 15000,
      headers: {
        'X-Plex-Token': token,
        'X-Plex-Product': 'AIO Media Manager',
        'X-Plex-Client-Identifier': 'aio-media-manager',
        'X-Plex-Platform': 'Web',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Search Plex's online Discover database for movies or TV shows
   */
  async search(query: string, type: MediaType, _year?: number): Promise<SearchResult[]> {
    try {
      console.log(`[PlexOnline] Searching Discover for "${query}" (type: ${type})`);

      const searchTypes = type === 'show' ? 'tv' : 'movies';

      const response = await this.client.get<PlexDiscoverResponse>(
        `${PLEX_DISCOVER_URL}/library/search`,
        {
          params: {
            query: query.trim(),
            limit: 30,
            searchTypes,
            searchProviders: 'discover',
            includeMetadata: 1,
          },
        }
      );

      const searchResults = response.data?.MediaContainer?.SearchResults || [];
      const externalResults = searchResults.find((s) => s.id === 'external');
      const items = externalResults?.SearchResult || [];

      console.log(`[PlexOnline] Found ${items.length} results`);

      return items.map((item) => {
        const meta = item.Metadata;
        const thumbUrl = meta.thumb
          ? this.resolveImageUrl(meta.thumb)
          : undefined;

        return {
          externalId: `plex-${meta.ratingKey}`,
          title: meta.title || '',
          originalTitle: meta.originalTitle,
          year: meta.year,
          thumb: thumbUrl,
          summary: meta.summary,
          provider: 'plex' as const,
        };
      });
    } catch (error) {
      console.error('[PlexOnline] Search failed:', error);
      return [];
    }
  }

  /**
   * Search Plex's online database specifically for collections
   * Uses the same Discover endpoint but filters results for collection-like matches
   */
  async searchCollection(query: string): Promise<SearchResult[]> {
    try {
      console.log(`[PlexOnline] Searching Discover for collection "${query}"`);

      // Search for movies (collections often contain movies)
      const movieResults = await this.search(query, 'movie');

      // Also search for shows in case it's a TV collection
      const showResults = await this.search(query, 'show');

      // Combine and deduplicate
      const allResults = [...movieResults, ...showResults];
      const seen = new Set<string>();
      const unique = allResults.filter((r) => {
        if (seen.has(r.externalId)) return false;
        seen.add(r.externalId);
        return true;
      });

      console.log(`[PlexOnline] Collection search found ${unique.length} results`);
      return unique;
    } catch (error) {
      console.error('[PlexOnline] Collection search failed:', error);
      return [];
    }
  }

  /**
   * Get detailed metadata for a specific Plex item
   */
  async getDetails(externalId: string): Promise<ExternalMetadata> {
    const plexId = externalId.replace(/^plex-/, '');

    console.log(`[PlexOnline] Fetching details for ID: ${plexId}`);

    const response = await this.client.get<PlexMetadataDetailResponse>(
      `${PLEX_METADATA_URL}/library/metadata/${plexId}`,
      {
        params: {
          includeConcerts: 1,
          includeExtras: 1,
          includeOnDeck: 1,
          includePopularLeaves: 1,
          includeReviews: 1,
          includeChapters: 1,
        },
      }
    );

    const meta = response.data?.MediaContainer?.Metadata?.[0];
    if (!meta) {
      throw new Error(`Plex item not found: ${plexId}`);
    }

    return {
      externalId,
      title: meta.title || '',
      originalTitle: meta.originalTitle,
      summary: meta.summary,
      tagline: meta.tagline,
      rating: meta.rating,
      year: meta.year,
      releaseDate: meta.originallyAvailableAt,
      runtime: meta.runtime,
      genres: meta.Genre?.map((g) => g.tag),
      cast: meta.Role?.map((r) => ({
        name: r.tag,
        character: r.role || '',
        profilePath: r.thumb,
        order: 0,
      })),
      crew: [
        ...(meta.Director?.map((d) => ({ name: d.tag, job: 'Director', department: 'Directing' })) || []),
        ...(meta.Writer?.map((w) => ({ name: w.tag, job: 'Writer', department: 'Writing' })) || []),
      ],
      provider: 'plex',
    };
  }

  /**
   * Resolve a Plex image URL to a full absolute URL.
   * Plex may return relative paths (/library/metadata/...) or already-absolute
   * URLs (https://image.tmdb.org/...). Only relative paths need the base URL.
   */
  private resolveImageUrl(url: string): string {
    if (!url) return url;
    // Already a full absolute URL (http://, https://, or protocol-relative //)
    if (/^https?:\/\//i.test(url) || url.startsWith('//')) {
      return url;
    }
    // Relative path — prepend the metadata provider base
    return `${PLEX_METADATA_URL}${url.startsWith('/') ? '' : '/'}${url}?X-Plex-Token=${this.token}`;
  }

  /**
   * Get poster and backdrop images for a Plex item
   * Returns full image URLs from Plex's metadata provider
   */
  async getImages(
    plexId: string
  ): Promise<{ posters: string[]; backdrops: string[] }> {
    console.log(`[PlexOnline] Fetching images for ID: ${plexId}`);

    try {
      // Fetch the main metadata which includes thumb and art
      const metaResponse = await this.client.get<PlexMetadataDetailResponse>(
        `${PLEX_METADATA_URL}/library/metadata/${plexId}`
      );

      const meta = metaResponse.data?.MediaContainer?.Metadata?.[0];
      const posters: string[] = [];
      const backdrops: string[] = [];

      if (meta?.thumb) {
        posters.push(this.resolveImageUrl(meta.thumb));
      }
      if (meta?.art) {
        backdrops.push(this.resolveImageUrl(meta.art));
      }

      // Also fetch available poster and art variants
      try {
        const [posterResponse, artResponse] = await Promise.all([
          this.client.get<any>(`${PLEX_METADATA_URL}/library/metadata/${plexId}/posters`),
          this.client.get<any>(`${PLEX_METADATA_URL}/library/metadata/${plexId}/arts`),
        ]);

        const posterItems = posterResponse.data?.MediaContainer?.Metadata || [];
        for (const p of posterItems) {
          if (p.key) {
            const url = this.resolveImageUrl(p.key);
            if (!posters.includes(url)) {
              posters.push(url);
            }
          }
        }

        const artItems = artResponse.data?.MediaContainer?.Metadata || [];
        for (const a of artItems) {
          if (a.key) {
            const url = this.resolveImageUrl(a.key);
            if (!backdrops.includes(url)) {
              backdrops.push(url);
            }
          }
        }
      } catch (variantError) {
        console.warn('[PlexOnline] Could not fetch image variants:', variantError);
      }

      console.log(`[PlexOnline] Found ${posters.length} posters, ${backdrops.length} backdrops`);
      return { posters, backdrops };
    } catch (error) {
      console.error('[PlexOnline] Failed to fetch images:', error);
      return { posters: [], backdrops: [] };
    }
  }
}

/**
 * Create a PlexOnlineProvider instance
 */
export function createPlexOnlineProvider(plexClient: PlexClient, token: string): PlexOnlineProvider {
  return new PlexOnlineProvider(plexClient, token);
}
