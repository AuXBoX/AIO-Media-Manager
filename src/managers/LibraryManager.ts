import { PlexClient } from '@/api/plexClient';

/**
 * Library section type
 */
export interface LibrarySection {
  key: string;
  title: string;
  type: string;
  agent: string;
  scanner: string;
  language: string;
  uuid: string;
  updatedAt: number;
  createdAt: number;
  scannedAt: number;
  content: boolean;
  directory: boolean;
  contentChangedAt: number;
  hidden: number;
  Location?: Array<{ id: number; path: string }>;
}

/**
 * Library item (generic metadata)
 */
export interface LibraryItem {
  ratingKey: string;
  key: string;
  guid: string;
  type: string;
  title: string;
  summary?: string;
  index?: number;
  parentIndex?: number;
  thumb?: string;
  art?: string;
  parentThumb?: string;
  grandparentThumb?: string;
  parentTitle?: string;
  grandparentTitle?: string;
  parentRatingKey?: string;
  grandparentRatingKey?: string;
  year?: number;
  addedAt?: number;
  updatedAt?: number;
  lastViewedAt?: number;
  viewCount?: number;
  duration?: number;
  rating?: number;
  childCount?: number;  // Number of albums (for artists) or seasons (for shows)
  leafCount?: number;   // Number of tracks (for albums/artists) or episodes (for shows)
  [key: string]: any;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalSize: number;
  size: number;
  offset: number;
}

/**
 * Library statistics
 */
export interface LibraryStats {
  totalItems: number;
  artistCount?: number;
  albumCount?: number;
  trackCount?: number;
  movieCount?: number;
  showCount?: number;
  seasonCount?: number;
  episodeCount?: number;
}

/**
 * Library filter
 */
export interface LibraryFilter {
  key: string;
  type: string;
  title: string;
  values?: Array<{ key: string; title: string; count?: number }>;
}

/**
 * Library Manager Interface
 */
export interface ILibraryManager {
  // Library sections
  getLibrarySections(): Promise<LibrarySection[]>;
  getLibrarySection(sectionId: string): Promise<LibrarySection>;
  
  // Library items
  getLibraryItems(
    sectionId: string,
    options?: {
      type?: number;
      offset?: number;
      limit?: number;
      sort?: string;
      filters?: Record<string, any>;
    }
  ): Promise<PaginatedResponse<LibraryItem>>;
  
  // Recently added/played
  getRecentlyAdded(sectionId: string, type?: number, limit?: number): Promise<LibraryItem[]>;
  getRecentlyPlayed(sectionId: string, type?: number, limit?: number): Promise<LibraryItem[]>;
  
  // Statistics
  getLibraryStats(sectionId: string): Promise<LibraryStats>;
  
  // Filters
  getLibraryFilters(sectionId: string): Promise<LibraryFilter[]>;
  
  // Refresh
  refreshLibrary(sectionId: string): Promise<void>;
  
  // Artist album counts
  getArtistAlbumCounts(sectionId: string): Promise<Map<string, number>>;
}

/**
 * Library Manager Implementation
 * Handles library discovery, navigation, and statistics
 */
export class LibraryManager implements ILibraryManager {
  constructor(private client: PlexClient) {}

  /**
   * Get all library sections
   */
  async getLibrarySections(): Promise<LibrarySection[]> {
    const response = await this.client.get<any>('/library/sections');
    
    if (!response?.MediaContainer?.Directory) {
      return [];
    }

    return response.MediaContainer.Directory.map((section: any) => ({
      key: section.key,
      title: section.title,
      type: section.type,
      agent: section.agent,
      scanner: section.scanner,
      language: section.language,
      uuid: section.uuid,
      updatedAt: section.updatedAt,
      createdAt: section.createdAt,
      scannedAt: section.scannedAt,
      content: section.content === 1,
      directory: section.directory === 1,
      contentChangedAt: section.contentChangedAt,
      hidden: section.hidden,
      Location: section.Location,
    }));
  }

  /**
   * Get a specific library section
   */
  async getLibrarySection(sectionId: string): Promise<LibrarySection> {
    const response = await this.client.get<any>(`/library/sections/${sectionId}`, {
      params: { includeDetails: 1 },
    });

    const section = response.MediaContainer;

    return {
      key: section.key || sectionId,
      title: section.title,
      type: section.type,
      agent: section.agent,
      scanner: section.scanner,
      language: section.language,
      uuid: section.uuid,
      updatedAt: section.updatedAt,
      createdAt: section.createdAt,
      scannedAt: section.scannedAt,
      content: section.content === 1,
      directory: section.directory === 1,
      contentChangedAt: section.contentChangedAt,
      hidden: section.hidden,
      Location: section.Location,
    };
  }

  /**
   * Get library items with pagination and filtering
   */
  async getLibraryItems(
    sectionId: string,
    options: {
      type?: number;
      offset?: number;
      limit?: number;
      sort?: string;
      filters?: Record<string, any>;
    } = {}
  ): Promise<PaginatedResponse<LibraryItem>> {
    const params: any = {
      'X-Plex-Container-Start': options.offset || 0,
      'X-Plex-Container-Size': options.limit || 50,
    };

    if (options.type) {
      params.type = options.type;
    }

    if (options.sort) {
      params.sort = options.sort;
    }

    if (options.filters) {
      Object.assign(params, options.filters);
    }

    const response = await this.client.get<any>(`/library/sections/${sectionId}/all`, {
      params,
    });

    const container = response.MediaContainer;
    const items = container.Metadata || [];

    return {
      items: items.map((item: any) => this.mapMetadataItem(item)),
      totalSize: container.totalSize || 0,
      size: container.size || items.length,
      offset: container.offset || 0,
    };
  }

  /**
   * Get recently added items
   */
  async getRecentlyAdded(
    sectionId: string,
    type?: number,
    limit: number = 10
  ): Promise<LibraryItem[]> {
    const params: any = {
      'X-Plex-Container-Size': limit,
    };

    if (type) {
      params.type = type;
    }

    const response = await this.client.get<any>(
      `/library/sections/${sectionId}/recentlyAdded`,
      { params }
    );

    const items = response.MediaContainer?.Metadata || [];
    return items.map((item: any) => this.mapMetadataItem(item));
  }

  /**
   * Get recently played items
   */
  async getRecentlyPlayed(
    sectionId: string,
    type?: number,
    limit: number = 10
  ): Promise<LibraryItem[]> {
    const params: any = {
      'X-Plex-Container-Size': limit,
      sort: 'lastViewedAt:desc',
      'lastViewedAt>>=': 0, // Only items that have been viewed
    };

    if (type) {
      params.type = type;
    }

    const response = await this.client.get<any>(
      `/library/sections/${sectionId}/all`,
      { params }
    );

    const items = response.MediaContainer?.Metadata || [];
    return items.map((item: any) => this.mapMetadataItem(item));
  }

  /**
   * Get library statistics
   */
  async getLibraryStats(sectionId: string): Promise<LibraryStats> {
    const section = await this.getLibrarySection(sectionId);
    const stats: LibraryStats = { totalItems: 0 };

    // Get counts for different types based on library type
    if (section.type === 'artist') {
      // Music library
      const [artists, albums, tracks] = await Promise.all([
        this.getItemCount(sectionId, 8), // Artist
        this.getItemCount(sectionId, 9), // Album
        this.getItemCount(sectionId, 10), // Track
      ]);

      stats.artistCount = artists;
      stats.albumCount = albums;
      stats.trackCount = tracks;
      stats.totalItems = tracks;
    } else if (section.type === 'movie') {
      // Movie library
      const movies = await this.getItemCount(sectionId, 1);
      stats.movieCount = movies;
      stats.totalItems = movies;
    } else if (section.type === 'show') {
      // TV library
      const [shows, seasons, episodes] = await Promise.all([
        this.getItemCount(sectionId, 2), // Show
        this.getItemCount(sectionId, 3), // Season
        this.getItemCount(sectionId, 4), // Episode
      ]);

      stats.showCount = shows;
      stats.seasonCount = seasons;
      stats.episodeCount = episodes;
      stats.totalItems = episodes;
    }

    return stats;
  }

  /**
   * Get count of items of a specific type
   */
  private async getItemCount(sectionId: string, type: number): Promise<number> {
    const response = await this.client.get<any>(
      `/library/sections/${sectionId}/all`,
      {
        params: {
          type,
          'X-Plex-Container-Size': 0, // Don't fetch items, just get count
        },
      }
    );

    return response.MediaContainer?.totalSize || 0;
  }

  /**
   * Get available filters for a library
   */
  async getLibraryFilters(sectionId: string): Promise<LibraryFilter[]> {
    const response = await this.client.get<any>(`/library/sections/${sectionId}/filters`);

    const filters = response.MediaContainer?.Filter || [];

    return filters.map((filter: any) => ({
      key: filter.key,
      type: filter.type,
      title: filter.title,
      values: filter.Filter?.map((value: any) => ({
        key: value.key,
        title: value.title,
        count: value.count,
      })),
    }));
  }

  /**
   * Refresh a library section
   */
  async refreshLibrary(sectionId: string): Promise<void> {
    await this.client.get(`/library/sections/${sectionId}/refresh`);
  }

  /**
   * Get album counts for all artists in a music library
   * Fetches all albums (with pagination) and groups by parentRatingKey (artist)
   */
  async getArtistAlbumCounts(sectionId: string): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const pageSize = 5000;
    let offset = 0;
    let totalSize = Infinity;
    
    try {
      while (offset < totalSize) {
        const response = await this.client.get<any>(`/library/sections/${sectionId}/all`, {
          params: {
            type: 9, // Album type
            'X-Plex-Container-Start': offset,
            'X-Plex-Container-Size': pageSize,
          },
        });

        const container = response.MediaContainer || {};
        totalSize = container.totalSize || 0;
        const albums = container.Metadata || [];
        
        for (const album of albums) {
          const artistKey = String(album.parentRatingKey);
          if (artistKey && artistKey !== 'undefined') {
            counts.set(artistKey, (counts.get(artistKey) || 0) + 1);
          }
        }
        
        offset += albums.length;
        
        // Safety check - if no albums returned, break
        if (albums.length === 0) break;
      }
    } catch (error) {
      console.error('[LibraryManager] Failed to fetch artist album counts:', error);
    }
    
    return counts;
  }

  /**
   * Map Plex metadata item to LibraryItem
   */
  private mapMetadataItem(item: any): LibraryItem {
    return {
      ratingKey: item.ratingKey,
      key: item.key,
      guid: item.guid,
      type: item.type,
      title: item.title,
      summary: item.summary,
      index: item.index,
      parentIndex: item.parentIndex,
      thumb: item.thumb,
      art: item.art,
      parentThumb: item.parentThumb,
      grandparentThumb: item.grandparentThumb,
      parentTitle: item.parentTitle,
      grandparentTitle: item.grandparentTitle,
      parentRatingKey: item.parentRatingKey,
      grandparentRatingKey: item.grandparentRatingKey,
      year: item.year,
      addedAt: item.addedAt,
      updatedAt: item.updatedAt,
      lastViewedAt: item.lastViewedAt,
      viewCount: item.viewCount,
      duration: item.duration,
      rating: item.rating,
      // Music/TV count fields
      childCount: item.childCount,
      leafCount: item.leafCount,
      // Include any additional fields
      ...item,
    };
  }
}

/**
 * Create a Library Manager instance
 */
export function createLibraryManager(client: PlexClient): LibraryManager {
  return new LibraryManager(client);
}
