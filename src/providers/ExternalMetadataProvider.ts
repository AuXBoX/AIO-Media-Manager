import { PlexClient } from '@/api/plexClient';
import {
  MediaType,
  SearchResult,
  ExternalMetadata,
  ExternalProvider,
} from '@/types';
import { MetadataUpdate } from '@/managers/MetadataManager';

/**
 * External Metadata Provider Interface
 * 
 * Defines the contract for external metadata providers (TMDB, IMDB, MusicBrainz)
 */
export interface IExternalMetadataProvider {
  /**
   * Provider identifier
   */
  readonly provider: ExternalProvider;

  /**
   * Search for media items
   * @param query - Search query string
   * @param type - Media type to search for
   * @param year - Optional year filter
   * @returns Array of search results
   */
  search(query: string, type: MediaType, year?: number): Promise<SearchResult[]>;

  /**
   * Get detailed metadata for a specific item
   * @param externalId - External provider ID
   * @returns Detailed metadata
   */
  getDetails(externalId: string): Promise<ExternalMetadata>;

  /**
   * Import metadata from external source to Plex
   * @param ratingKey - Plex item rating key
   * @param externalId - External provider ID
   * @returns Promise that resolves when import is complete
   */
  importMetadata(ratingKey: string, externalId: string): Promise<void>;
}

/**
 * Base External Metadata Provider
 * 
 * Provides common functionality for all external metadata providers
 */
export abstract class BaseExternalMetadataProvider implements IExternalMetadataProvider {
  abstract readonly provider: ExternalProvider;

  constructor(protected plexClient: PlexClient) {}

  abstract search(query: string, type: MediaType, year?: number): Promise<SearchResult[]>;
  abstract getDetails(externalId: string): Promise<ExternalMetadata>;

  /**
   * Import metadata from external source to Plex
   * Converts external metadata to Plex metadata update format
   */
  async importMetadata(ratingKey: string, externalId: string): Promise<void> {
    // Get detailed metadata from external source
    const externalMetadata = await this.getDetails(externalId);

    // Convert to Plex metadata update format
    const update = this.convertToPlexMetadata(externalMetadata);

    // Update Plex item
    await this.updatePlexMetadata(ratingKey, update);
  }

  /**
   * Convert external metadata to Plex metadata update format
   */
  protected convertToPlexMetadata(external: ExternalMetadata): MetadataUpdate {
    return {
      title: external.title,
      originalTitle: external.originalTitle,
      summary: external.summary,
      tagline: external.tagline,
      rating: external.rating,
      year: external.year,
      genres: external.genres,
      roles: external.cast?.map((cast) => ({
        tag: cast.name,
        role: cast.character,
        thumb: cast.profilePath,
      })),
      directors: external.crew
        ?.filter((crew) => crew.job === 'Director')
        .map((crew) => crew.name),
      writers: external.crew
        ?.filter((crew) => crew.job === 'Writer' || crew.job === 'Screenplay')
        .map((crew) => crew.name),
    };
  }

  /**
   * Update Plex metadata via API
   */
  protected async updatePlexMetadata(
    ratingKey: string,
    update: MetadataUpdate
  ): Promise<void> {
    const params: any = {
      type: 1, // Default to movie type
    };

    // Map updates to Plex API parameters
    if (update.title !== undefined) params.title = update.title;
    if (update.originalTitle !== undefined) params.originalTitle = update.originalTitle;
    if (update.summary !== undefined) params.summary = update.summary;
    if (update.tagline !== undefined) params.tagline = update.tagline;
    if (update.rating !== undefined) params.rating = update.rating;
    if (update.year !== undefined) params.year = update.year;

    // Handle array fields
    if (update.genres) {
      update.genres.forEach((genre, index) => {
        params[`genre[${index}].tag.tag`] = genre;
      });
    }

    if (update.directors) {
      update.directors.forEach((director, index) => {
        params[`director[${index}].tag.tag`] = director;
      });
    }

    if (update.writers) {
      update.writers.forEach((writer, index) => {
        params[`writer[${index}].tag.tag`] = writer;
      });
    }

    if (update.roles) {
      update.roles.forEach((role, index) => {
        params[`role[${index}].tag.tag`] = role.tag;
        if (role.role) params[`role[${index}].tag.role`] = role.role;
        if (role.thumb) params[`role[${index}].tag.thumb`] = role.thumb;
      });
    }

    await this.plexClient.put(`/library/metadata/${ratingKey}`, null, { params });
  }
}
