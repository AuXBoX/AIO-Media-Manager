import { PlexClient } from '../api/plexClient';
import { db } from '../db/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Media type enum
 */
export type MediaType = 'movie' | 'show' | 'season' | 'episode' | 'artist' | 'album' | 'track';

/**
 * Search hub interface
 */
export interface SearchHub {
  title: string;
  type: MediaType;
  items: SearchResultItem[];
  size: number;
}

/**
 * Search result item interface
 */
export interface SearchResultItem {
  ratingKey: string;
  key: string;
  guid: string;
  type: MediaType;
  title: string;
  thumb?: string;
  art?: string;
  year?: number;
  summary?: string;
  addedAt: number;
  updatedAt: number;
}

/**
 * Search results interface
 */
export interface SearchResults {
  hubs: SearchHub[];
  totalResults: number;
}

/**
 * Filter criteria interface
 */
export interface FilterCriteria {
  sectionId: string;
  type?: MediaType;
  filters: Record<string, any>;
  sort?: string;
}

/**
 * Filter preset interface
 */
export interface FilterPreset {
  id: string;
  name: string;
  criteria: FilterCriteria;
  createdAt: number;
}

/**
 * Search Manager Interface
 */
export interface ISearchManager {
  /**
   * Search across libraries using hub search
   */
  search(query: string, sectionId?: string): Promise<SearchResults>;

  /**
   * Search within a specific library
   */
  searchLibrary(sectionId: string, query: string, type?: MediaType): Promise<SearchResultItem[]>;

  /**
   * Apply filters to a library
   */
  applyFilters(sectionId: string, filters: FilterCriteria): Promise<SearchResultItem[]>;

  /**
   * Save a filter preset
   */
  saveFilterPreset(name: string, filters: FilterCriteria): Promise<void>;

  /**
   * Get all filter presets
   */
  getFilterPresets(): Promise<FilterPreset[]>;

  /**
   * Delete a filter preset
   */
  deleteFilterPreset(presetId: string): Promise<void>;
}

/**
 * Search Manager Implementation
 * 
 * Handles search and filtering operations for Plex libraries
 */
export class SearchManager implements ISearchManager {
  constructor(private client: PlexClient) {}

  /**
   * Search across libraries using hub search
   */
  async search(query: string, sectionId?: string): Promise<SearchResults> {
    try {
      const params: Record<string, any> = {
        query: query.trim(),
      };

      // If sectionId is provided, search within that section
      const endpoint = sectionId 
        ? `/library/sections/${sectionId}/all`
        : '/hubs/search';

      const response = await this.client.get<any>(endpoint, { params });

      if (sectionId) {
        // Library search returns items directly
        const items = this.mapSearchResults(response.MediaContainer?.Metadata || []);
        return {
          hubs: [{
            title: 'Results',
            type: this.inferTypeFromItems(items),
            items,
            size: items.length,
          }],
          totalResults: items.length,
        };
      }

      // Hub search returns organized hubs
      const hubs = (response.MediaContainer?.Hub || []).map((hub: any) => ({
        title: hub.title || 'Results',
        type: this.mapPlexTypeToMediaType(hub.type),
        items: this.mapSearchResults(hub.Metadata || []),
        size: hub.size || 0,
      }));

      const totalResults = hubs.reduce((sum: number, hub: any) => sum + hub.size, 0);

      return {
        hubs,
        totalResults,
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Search within a specific library
   */
  async searchLibrary(
    sectionId: string,
    query: string,
    type?: MediaType
  ): Promise<SearchResultItem[]> {
    try {
      const params: Record<string, any> = {
        'title.query': query.trim(),
      };

      if (type) {
        params.type = this.mapMediaTypeToPlexType(type);
      }

      const response = await this.client.get<any>(
        `/library/sections/${sectionId}/all`,
        { params }
      );

      return this.mapSearchResults(response.MediaContainer?.Metadata || []);
    } catch (error) {
      console.error('Library search failed:', error);
      throw error;
    }
  }

  /**
   * Apply filters to a library
   */
  async applyFilters(
    sectionId: string,
    filters: FilterCriteria
  ): Promise<SearchResultItem[]> {
    try {
      const params: Record<string, any> = {
        ...filters.filters,
      };

      if (filters.type) {
        params.type = this.mapMediaTypeToPlexType(filters.type);
      }

      if (filters.sort) {
        params.sort = filters.sort;
      }

      const response = await this.client.get<any>(
        `/library/sections/${sectionId}/all`,
        { params }
      );

      return this.mapSearchResults(response.MediaContainer?.Metadata || []);
    } catch (error) {
      console.error('Apply filters failed:', error);
      throw error;
    }
  }

  /**
   * Save a filter preset
   */
  async saveFilterPreset(name: string, filters: FilterCriteria): Promise<void> {
    try {
      const preset: FilterPreset = {
        id: uuidv4(),
        name,
        criteria: filters,
        createdAt: Date.now(),
      };

      await db.filterPresets.add({
        id: preset.id,
        name: preset.name,
        criteria: preset.criteria,
        createdAt: preset.createdAt,
        updatedAt: preset.createdAt,
      });
    } catch (error) {
      console.error('Save filter preset failed:', error);
      throw error;
    }
  }

  /**
   * Get all filter presets
   */
  async getFilterPresets(): Promise<FilterPreset[]> {
    try {
      const records = await db.filterPresets.toArray();
      
      return records.map((record) => ({
        id: record.id,
        name: record.name,
        criteria: record.criteria as FilterCriteria,
        createdAt: record.createdAt,
      }));
    } catch (error) {
      console.error('Get filter presets failed:', error);
      throw error;
    }
  }

  /**
   * Delete a filter preset
   */
  async deleteFilterPreset(presetId: string): Promise<void> {
    try {
      await db.filterPresets.delete(presetId);
    } catch (error) {
      console.error('Delete filter preset failed:', error);
      throw error;
    }
  }

  /**
   * Map Plex metadata items to search result items
   */
  private mapSearchResults(items: any[]): SearchResultItem[] {
    return items.map((item) => ({
      ratingKey: item.ratingKey || '',
      key: item.key || '',
      guid: item.guid || '',
      type: this.mapPlexTypeToMediaType(item.type),
      title: item.title || '',
      thumb: item.thumb,
      art: item.art,
      year: item.year,
      summary: item.summary,
      addedAt: item.addedAt || 0,
      updatedAt: item.updatedAt || 0,
    }));
  }

  /**
   * Map Plex type string to MediaType
   */
  private mapPlexTypeToMediaType(type: string): MediaType {
    const typeMap: Record<string, MediaType> = {
      movie: 'movie',
      show: 'show',
      season: 'season',
      episode: 'episode',
      artist: 'artist',
      album: 'album',
      track: 'track',
    };

    return typeMap[type] || 'movie';
  }

  /**
   * Map MediaType to Plex type number
   */
  private mapMediaTypeToPlexType(type: MediaType): number {
    const typeMap: Record<MediaType, number> = {
      movie: 1,
      show: 2,
      season: 3,
      episode: 4,
      artist: 8,
      album: 9,
      track: 10,
    };

    return typeMap[type] || 1;
  }

  /**
   * Infer media type from items
   */
  private inferTypeFromItems(items: SearchResultItem[]): MediaType {
    if (items.length === 0) return 'movie';
    return items[0]!.type;
  }
}

/**
 * Create a SearchManager instance
 */
export function createSearchManager(client: PlexClient): SearchManager {
  return new SearchManager(client);
}
