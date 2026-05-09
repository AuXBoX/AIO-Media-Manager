import { PlexClient } from '@/api/plexClient';

/**
 * Metadata item interface
 */
export interface MetadataItem {
  ratingKey: string;
  key: string;
  guid: string;
  type: string;
  title: string;
  originalTitle?: string;
  summary?: string;
  tagline?: string;
  rating?: number;
  year?: number;
  thumb?: string;
  art?: string;
  duration?: number;
  addedAt: number;
  updatedAt: number;

  // Type-specific fields
  studio?: string;
  contentRating?: string;
  genres?: Tag[];
  roles?: Role[];
  directors?: Tag[];
  writers?: Tag[];

  // TV-specific
  index?: number;
  parentIndex?: number;
  parentRatingKey?: string;
  grandparentRatingKey?: string;

  // Music-specific
  parentTitle?: string;
  grandparentTitle?: string;

  // Media info
  Media?: MediaInfo[];

  // User data
  viewCount?: number;
  lastViewedAt?: number;
  userRating?: number;

  [key: string]: any;
}

/**
 * Tag interface
 */
export interface Tag {
  tag: string;
  id?: string;
}

/**
 * Role interface (extends Tag with role and thumb)
 */
export interface Role extends Tag {
  role?: string;
  thumb?: string;
}

/**
 * Media info interface
 */
export interface MediaInfo {
  id: string;
  duration: number;
  bitrate: number;
  width: number;
  height: number;
  aspectRatio: number;
  audioChannels: number;
  audioCodec: string;
  videoCodec: string;
  container: string;
  videoResolution: string;
  Part?: MediaPart[];
}

/**
 * Media part interface
 */
export interface MediaPart {
  id: string;
  key: string;
  duration: number;
  file: string;
  size: number;
  container: string;
}

/**
 * Metadata update interface
 */
export interface MetadataUpdate {
  title?: string;
  originalTitle?: string;
  summary?: string;
  tagline?: string;
  rating?: number;
  year?: number;
  studio?: string;
  contentRating?: string;
  genres?: string[];
  roles?: RoleUpdate[];
  directors?: string[];
  writers?: string[];
}

/**
 * Role update interface
 */
export interface RoleUpdate {
  tag: string;
  role?: string;
  thumb?: string;
}

/**
 * Match candidate interface
 */
export interface MatchCandidate {
  guid: string;
  score: number;
  title: string;
  year?: number;
  thumb?: string;
  summary?: string;
}

/**
 * Bulk operation result interface
 */
export interface BulkOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ ratingKey: string; error: string }>;
}

/**
 * Artwork asset interface
 */
export interface ArtworkAsset {
  type: ArtworkType;
  url: string;
  ratingKey?: string;
  selected: boolean;
}

/**
 * Artwork type
 */
export type ArtworkType = 'poster' | 'background' | 'banner' | 'thumb';

/**
 * Metadata Manager Interface
 */
export interface IMetadataManager {
  // Metadata retrieval
  getMetadata(ratingKey: string): Promise<MetadataItem>;
  getChildren(ratingKey: string): Promise<MetadataItem[]>;
  getGrandchildren(ratingKey: string): Promise<MetadataItem[]>;

  // Metadata editing
  updateMetadata(ratingKey: string, updates: MetadataUpdate): Promise<void>;
  bulkUpdateMetadata(ratingKeys: string[], updates: MetadataUpdate): Promise<BulkOperationResult>;

  // Matching
  matchMetadata(ratingKey: string, guid: string): Promise<void>;
  unmatchMetadata(ratingKey: string): Promise<void>;
  getMatchCandidates(ratingKey: string): Promise<MatchCandidate[]>;
  bulkMatch(ratingKeys: string[]): Promise<BulkOperationResult>;

  // Artwork
  getArtwork(ratingKey: string): Promise<ArtworkAsset[]>;
  uploadArtwork(ratingKey: string, file: File, type: ArtworkType): Promise<void>;
  selectArtwork(ratingKey: string, url: string, type: ArtworkType): Promise<void>;
  deleteArtwork(ratingKey: string, type: ArtworkType): Promise<void>;

  // Refresh
  refreshMetadata(ratingKey: string): Promise<void>;
  bulkRefresh(ratingKeys: string[]): Promise<BulkOperationResult>;
}

/**
 * Metadata Manager Implementation
 * Handles metadata viewing, editing, matching, and artwork management
 */
export class MetadataManager implements IMetadataManager {
  constructor(private client: PlexClient) {}

  /**
   * Get metadata for a specific item
   */
  async getMetadata(ratingKey: string): Promise<MetadataItem> {
    const response = await this.client.get<any>(`/library/metadata/${ratingKey}`);

    if (!response?.MediaContainer?.Metadata?.[0]) {
      throw new Error(`Metadata not found for ratingKey: ${ratingKey}`);
    }

    return this.mapMetadataItem(response.MediaContainer.Metadata[0]);
  }

  /**
   * Get children of a metadata item (e.g., seasons of a show, tracks of an album)
   */
  async getChildren(ratingKey: string): Promise<MetadataItem[]> {
    const response = await this.client.get<any>(`/library/metadata/${ratingKey}/children`);

    const items = response.MediaContainer?.Metadata || [];
    return items.map((item: any) => this.mapMetadataItem(item));
  }

  /**
   * Get grandchildren of a metadata item (e.g., episodes of a show, tracks of an artist)
   */
  async getGrandchildren(ratingKey: string): Promise<MetadataItem[]> {
    const response = await this.client.get<any>(`/library/metadata/${ratingKey}/grandchildren`);

    const items = response.MediaContainer?.Metadata || [];
    return items.map((item: any) => this.mapMetadataItem(item));
  }

  /**
   * Update metadata for a single item
   */
  async updateMetadata(ratingKey: string, updates: MetadataUpdate): Promise<void> {
    const params: any = {
      type: 1, // Default to movie type, will be overridden by actual type
    };

    // Map updates to Plex API parameters
    if (updates.title !== undefined) params.title = updates.title;
    if (updates.originalTitle !== undefined) params.originalTitle = updates.originalTitle;
    if (updates.summary !== undefined) params.summary = updates.summary;
    if (updates.tagline !== undefined) params.tagline = updates.tagline;
    if (updates.rating !== undefined) params.rating = updates.rating;
    if (updates.year !== undefined) params.year = updates.year;
    if (updates.studio !== undefined) params.studio = updates.studio;
    if (updates.contentRating !== undefined) params.contentRating = updates.contentRating;

    // Handle array fields (genres, directors, writers)
    if (updates.genres) {
      updates.genres.forEach((genre, index) => {
        params[`genre[${index}].tag.tag`] = genre;
      });
    }

    if (updates.directors) {
      updates.directors.forEach((director, index) => {
        params[`director[${index}].tag.tag`] = director;
      });
    }

    if (updates.writers) {
      updates.writers.forEach((writer, index) => {
        params[`writer[${index}].tag.tag`] = writer;
      });
    }

    // Handle roles (cast)
    if (updates.roles) {
      updates.roles.forEach((role, index) => {
        params[`role[${index}].tag.tag`] = role.tag;
        if (role.role) params[`role[${index}].tag.role`] = role.role;
        if (role.thumb) params[`role[${index}].tag.thumb`] = role.thumb;
      });
    }

    await this.client.put(`/library/metadata/${ratingKey}`, null, { params });
  }

  /**
   * Update metadata for multiple items
   */
  async bulkUpdateMetadata(
    ratingKeys: string[],
    updates: MetadataUpdate
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      total: ratingKeys.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    for (const ratingKey of ratingKeys) {
      try {
        await this.updateMetadata(ratingKey, updates);
        result.succeeded++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          ratingKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Match metadata item to a specific GUID
   */
  async matchMetadata(ratingKey: string, guid: string): Promise<void> {
    await this.client.put(`/library/metadata/${ratingKey}/match`, null, {
      params: { guid },
    });
  }

  /**
   * Unmatch metadata item (reset to unmatched state)
   */
  async unmatchMetadata(ratingKey: string): Promise<void> {
    await this.client.delete(`/library/metadata/${ratingKey}/match`);
  }

  /**
   * Get match candidates for a metadata item
   */
  async getMatchCandidates(ratingKey: string): Promise<MatchCandidate[]> {
    const response = await this.client.get<any>(`/library/metadata/${ratingKey}/matches`);

    const matches = response.MediaContainer?.SearchResult || [];

    return matches.map((match: any) => ({
      guid: match.guid,
      score: match.score || 0,
      title: match.name || match.title,
      year: match.year,
      thumb: match.thumb,
      summary: match.summary,
    }));
  }

  /**
   * Match multiple items automatically
   */
  async bulkMatch(ratingKeys: string[]): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      total: ratingKeys.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    for (const ratingKey of ratingKeys) {
      try {
        // Get match candidates
        const candidates = await this.getMatchCandidates(ratingKey);

        // Match to the best candidate if available
        if (candidates.length > 0 && candidates[0]) {
          await this.matchMetadata(ratingKey, candidates[0].guid);
          result.succeeded++;
        } else {
          result.failed++;
          result.errors.push({
            ratingKey,
            error: 'No match candidates found',
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          ratingKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Get artwork for a metadata item
   */
  async getArtwork(ratingKey: string): Promise<ArtworkAsset[]> {
    const response = await this.client.get<any>(`/library/metadata/${ratingKey}`);

    const item = response.MediaContainer?.Metadata?.[0];
    if (!item) {
      return [];
    }

    const artwork: ArtworkAsset[] = [];

    // Add poster
    if (item.thumb) {
      artwork.push({
        type: 'poster',
        url: item.thumb,
        ratingKey: item.ratingKey,
        selected: true,
      });
    }

    // Add background art
    if (item.art) {
      artwork.push({
        type: 'background',
        url: item.art,
        ratingKey: item.ratingKey,
        selected: true,
      });
    }

    // Add banner if available
    if (item.banner) {
      artwork.push({
        type: 'banner',
        url: item.banner,
        ratingKey: item.ratingKey,
        selected: true,
      });
    }

    return artwork;
  }

  /**
   * Upload custom artwork
   */
  async uploadArtwork(ratingKey: string, file: File, type: ArtworkType): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    const typeMap: Record<ArtworkType, string> = {
      poster: 'poster',
      background: 'art',
      banner: 'banner',
      thumb: 'thumb',
    };

    await this.client.post(
      `/library/metadata/${ratingKey}/${typeMap[type]}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  /**
   * Select artwork from a URL
   */
  async selectArtwork(ratingKey: string, url: string, type: ArtworkType): Promise<void> {
    const typeMap: Record<ArtworkType, string> = {
      poster: 'poster',
      background: 'art',
      banner: 'banner',
      thumb: 'thumb',
    };

    await this.client.put(`/library/metadata/${ratingKey}/${typeMap[type]}`, null, {
      params: { url },
    });
  }

  /**
   * Delete custom artwork
   */
  async deleteArtwork(ratingKey: string, type: ArtworkType): Promise<void> {
    const typeMap: Record<ArtworkType, string> = {
      poster: 'poster',
      background: 'art',
      banner: 'banner',
      thumb: 'thumb',
    };

    await this.client.delete(`/library/metadata/${ratingKey}/${typeMap[type]}`);
  }

  /**
   * Refresh metadata for a single item
   */
  async refreshMetadata(ratingKey: string): Promise<void> {
    await this.client.put(`/library/metadata/${ratingKey}/refresh`);
  }

  /**
   * Refresh metadata for multiple items
   */
  async bulkRefresh(ratingKeys: string[]): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      total: ratingKeys.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    for (const ratingKey of ratingKeys) {
      try {
        await this.refreshMetadata(ratingKey);
        result.succeeded++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          ratingKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Map Plex metadata response to MetadataItem
   */
  private mapMetadataItem(item: any): MetadataItem {
    return {
      ratingKey: item.ratingKey,
      key: item.key,
      guid: item.guid,
      type: item.type,
      title: item.title,
      originalTitle: item.originalTitle,
      summary: item.summary,
      tagline: item.tagline,
      rating: item.rating,
      year: item.year,
      thumb: item.thumb,
      art: item.art,
      duration: item.duration,
      addedAt: item.addedAt,
      updatedAt: item.updatedAt,
      studio: item.studio,
      contentRating: item.contentRating,
      genres: item.Genre?.map((g: any) => ({ tag: g.tag, id: g.id })),
      roles: item.Role?.map((r: any) => ({ tag: r.tag, role: r.role, thumb: r.thumb, id: r.id })),
      directors: item.Director?.map((d: any) => ({ tag: d.tag, id: d.id })),
      writers: item.Writer?.map((w: any) => ({ tag: w.tag, id: w.id })),
      index: item.index,
      parentIndex: item.parentIndex,
      parentRatingKey: item.parentRatingKey,
      grandparentRatingKey: item.grandparentRatingKey,
      parentTitle: item.parentTitle,
      grandparentTitle: item.grandparentTitle,
      Media: item.Media?.map((m: any) => ({
        id: m.id,
        duration: m.duration,
        bitrate: m.bitrate,
        width: m.width,
        height: m.height,
        aspectRatio: m.aspectRatio,
        audioChannels: m.audioChannels,
        audioCodec: m.audioCodec,
        videoCodec: m.videoCodec,
        container: m.container,
        videoResolution: m.videoResolution,
        Part: m.Part?.map((p: any) => ({
          id: p.id,
          key: p.key,
          duration: p.duration,
          file: p.file,
          size: p.size,
          container: p.container,
        })),
      })),
      viewCount: item.viewCount,
      lastViewedAt: item.lastViewedAt,
      userRating: item.userRating,
      ...item,
    };
  }
}

/**
 * Create a Metadata Manager instance
 */
export function createMetadataManager(client: PlexClient): MetadataManager {
  return new MetadataManager(client);
}
