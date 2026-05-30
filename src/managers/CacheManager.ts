import { db, MetadataRecord, ArtworkRecord, OfflineChangeRecord } from '@/db/database';
import { PlexClient } from '@/api/plexClient';
import { MetadataItem } from './MetadataManager';

/**
 * Generate a simple UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Query options for cached library items
 */
export interface QueryOptions {
  type?: number;
  sort?: string;
  filters?: Record<string, any>;
  offset?: number;
  limit?: number;
  titlesOnly?: boolean;
  musicViewMode?: 'artists' | 'albums';
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  items: T[];
  offset: number;
  size: number;
  totalSize: number;
}

/**
 * Offline change interface
 */
export interface OfflineChange {
  id: string;
  timestamp: number;
  type: 'update' | 'match' | 'artwork';
  ratingKey: string;
  data: any;
  synced: boolean;
}

/**
 * Sync result interface
 */
export interface SyncResult {
  total: number;
  synced: number;
  failed: number;
  conflicts: ConflictResolution[];
}

/**
 * Sync conflict interface with detailed field information
 */
export interface SyncConflict {
  changeId: string;
  ratingKey: string;
  localVersion: Partial<MetadataItem>;
  serverVersion: Partial<MetadataItem>;
  conflictingFields: string[];
}

/**
 * Conflict resolution interface
 */
export interface ConflictResolution {
  ratingKey: string;
  localChange: any;
  serverValue: any;
  resolution: 'local' | 'server' | 'manual';
}

/**
 * Cache Manager Interface
 */
export interface ICacheManager {
  // Cache operations
  cacheLibrarySection(sectionId: string): Promise<void>;
  cacheMetadata(item: MetadataItem): Promise<void>;
  cacheArtwork(url: string, data: Blob): Promise<string>;

  // Retrieval
  getCachedMetadata(ratingKey: string): Promise<MetadataItem | null>;
  getCachedArtwork(url: string): Promise<Blob | null>;
  getCachedLibraryItems(
    sectionId: string,
    options: QueryOptions
  ): Promise<PaginatedResult<MetadataItem>>;

  // Offline changes
  queueOfflineChange(change: OfflineChange): Promise<void>;
  getOfflineChanges(): Promise<OfflineChange[]>;
  syncOfflineChanges(): Promise<SyncResult>;

  // Cache management
  getCacheSize(): Promise<number>;
  clearCache(olderThan?: Date): Promise<void>;
  isCacheAvailable(ratingKey: string): Promise<boolean>;
}

/**
 * Cache Manager Implementation
 * Handles offline caching, sync, and conflict resolution
 */
export class CacheManager implements ICacheManager {
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();

  constructor(private client: PlexClient) {}

  /**
   * Cache an entire library section with progress events
   */
  async cacheLibrarySection(sectionId: string): Promise<void> {
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      // Fetch items from server
      const response = await this.client.get<any>(`/library/sections/${sectionId}/all`, {
        params: {
          'X-Plex-Container-Start': offset,
          'X-Plex-Container-Size': limit,
        },
      });

      const container = response.MediaContainer;
      const items = container?.Metadata || [];
      const totalSize = container?.totalSize || 0;

      // Cache each item
      for (const item of items) {
        await this.cacheMetadata(this.mapToMetadataItem(item));

        // Cache artwork
        if (item.thumb) {
          await this.cacheArtworkUrl(item.thumb);
        }
        if (item.art) {
          await this.cacheArtworkUrl(item.art);
        }
      }

      offset += items.length;
      hasMore = offset < totalSize;

      // Emit progress event
      this.emit('cache-progress', {
        sectionId,
        cached: offset,
        total: totalSize,
        progress: totalSize > 0 ? (offset / totalSize) * 100 : 100,
      });
    }

    // Cache library section info
    await db.librarySections.put({
      key: sectionId,
      data: { sectionId },
      cachedAt: Date.now(),
      itemCount: offset,
    });
  }

  /**
   * Cache a single metadata item
   */
  async cacheMetadata(item: MetadataItem): Promise<void> {
    const record: MetadataRecord = {
      ratingKey: item.ratingKey,
      sectionId: (item as any).librarySectionID || '',
      type: item.type,
      data: item,
      cachedAt: Date.now(),
      lastModified: item.updatedAt || Date.now(),
      dirty: false,
    };

    await db.metadata.put(record);
  }

  /**
   * Cache artwork from a URL
   */
  async cacheArtwork(url: string, data: Blob): Promise<string> {
    const record: ArtworkRecord = {
      url,
      blob: data,
      mimeType: data.type,
      size: data.size,
      cachedAt: Date.now(),
    };

    await db.artwork.put(record);
    return url;
  }

  /**
   * Get cached metadata for a specific item
   */
  async getCachedMetadata(ratingKey: string): Promise<MetadataItem | null> {
    const record = await db.metadata.get(ratingKey);
    return record ? (record.data as MetadataItem) : null;
  }

  /**
   * Get cached artwork
   */
  async getCachedArtwork(url: string): Promise<Blob | null> {
    const record = await db.artwork.get(url);
    return record ? record.blob : null;
  }

  /**
   * Get cached library items with pagination and filtering
   */
  async getCachedLibraryItems(
    sectionId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<MetadataItem>> {
    const { offset = 0, limit = 50, type, sort } = options;

    // Query metadata by section
    let query = db.metadata.where('sectionId').equals(sectionId);

    // Filter by type if specified
    let items = await query.toArray();
    if (type) {
      items = items.filter((record) => record.type === String(type));
    }

    // Sort if specified
    if (sort) {
      items = this.sortItems(items, sort);
    }

    const totalSize = items.length;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      items: paginatedItems.map((record) => record.data as MetadataItem),
      offset,
      size: paginatedItems.length,
      totalSize,
    };
  }

  /**
   * Queue an offline change
   */
  async queueOfflineChange(change: OfflineChange): Promise<void> {
    const record: OfflineChangeRecord = {
      id: change.id || generateUUID(),
      timestamp: change.timestamp || Date.now(),
      type: change.type,
      ratingKey: change.ratingKey,
      data: change.data,
      synced: false,
    };

    await db.offlineChanges.add(record);

    // Mark metadata as dirty
    const metadata = await db.metadata.get(change.ratingKey);
    if (metadata) {
      metadata.dirty = true;
      await db.metadata.put(metadata);
    }
  }

  /**
   * Get all unsynced offline changes
   */
  async getOfflineChanges(): Promise<OfflineChange[]> {
    const records = await db.offlineChanges.where('synced').equals(0).toArray();

    return records.map((record) => ({
      id: record.id,
      timestamp: record.timestamp,
      type: record.type,
      ratingKey: record.ratingKey,
      data: record.data,
      synced: record.synced,
    }));
  }

  /**
   * Sync offline changes to the server
   */
  async syncOfflineChanges(): Promise<SyncResult> {
    const changes = await this.getOfflineChanges();
    const result: SyncResult = {
      total: changes.length,
      synced: 0,
      failed: 0,
      conflicts: [],
    };

    for (const change of changes) {
      try {
        // Fetch current server state
        const serverResponse = await this.client.get<any>(
          `/library/metadata/${change.ratingKey}`
        );
        const serverMetadata = serverResponse.MediaContainer?.Metadata?.[0];

        if (!serverMetadata) {
          throw new Error('Server metadata not found');
        }

        // Check for conflicts
        const conflict = this.detectConflict(change, serverMetadata);
        if (conflict) {
          result.conflicts.push({
            ratingKey: change.ratingKey,
            localChange: change.data,
            serverValue: serverMetadata,
            resolution: 'manual', // Requires user decision
          });
          continue;
        }

        // Apply change to server
        await this.applyChange(change);

        // Mark as synced
        await this.markChangeSynced(change.id);
        result.synced++;
      } catch (error) {
        result.failed++;
        await this.updateChangeError(
          change.id,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    return result;
  }

  /**
   * Get total cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    let totalSize = 0;

    // Calculate metadata size (approximate)
    const metadataRecords = await db.metadata.toArray();
    totalSize += metadataRecords.reduce((sum, record) => {
      return sum + JSON.stringify(record.data).length;
    }, 0);

    // Calculate artwork size
    const artworkRecords = await db.artwork.toArray();
    totalSize += artworkRecords.reduce((sum, record) => sum + record.size, 0);

    return totalSize;
  }

  /**
   * Clear cache, optionally only items older than a specific date
   */
  async clearCache(olderThan?: Date): Promise<void> {
    if (olderThan) {
      const timestamp = olderThan.getTime();

      // Clear old metadata
      await db.metadata.where('cachedAt').below(timestamp).delete();

      // Clear old artwork
      await db.artwork.where('cachedAt').below(timestamp).delete();
    } else {
      // Clear all cache
      await db.metadata.clear();
      await db.artwork.clear();
      await db.librarySections.clear();
    }
  }

  /**
   * Check if metadata is available in cache
   */
  async isCacheAvailable(ratingKey: string): Promise<boolean> {
    const record = await db.metadata.get(ratingKey);
    return record !== undefined;
  }

  /**
   * Private helper: Cache artwork from URL
   */
  private async cacheArtworkUrl(url: string): Promise<void> {
    try {
      // Check if already cached
      const existing = await db.artwork.get(url);
      if (existing) {
        return;
      }

      // Fetch artwork
      const fullUrl = url.startsWith('http') ? url : `${this.client['config'].baseURL}${url}`;
      const response = await fetch(fullUrl, {
        headers: {
          'X-Plex-Token': this.client['config'].token,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch artwork: ${response.statusText}`);
      }

      const blob = await response.blob();
      await this.cacheArtwork(url, blob);
    } catch (error) {
      console.warn(`Failed to cache artwork: ${url}`, error);
    }
  }

  /**
   * Private helper: Detect conflicts between local and server changes
   */
  private detectConflict(change: OfflineChange, serverMetadata: any): boolean {
    // Conflict if server was modified after local change
    return serverMetadata.updatedAt > change.timestamp;
  }

  /**
   * Private helper: Apply change to server
   */
  private async applyChange(change: OfflineChange): Promise<void> {
    switch (change.type) {
      case 'update':
        await this.client.put(`/library/metadata/${change.ratingKey}`, null, {
          params: change.data,
        });
        break;
      case 'match':
        await this.client.put(`/library/metadata/${change.ratingKey}/match`, null, {
          params: { guid: change.data.guid },
        });
        break;
      case 'artwork':
        // Artwork upload requires special handling
        const formData = new FormData();
        formData.append('file', change.data.file);
        await this.client.post(
          `/library/metadata/${change.ratingKey}/${change.data.type}`,
          formData
        );
        break;
    }
  }

  /**
   * Private helper: Mark change as synced
   */
  private async markChangeSynced(changeId: string): Promise<void> {
    const record = await db.offlineChanges.get(changeId);
    if (record) {
      record.synced = true;
      record.error = undefined;
      await db.offlineChanges.put(record);

      // Clear dirty flag on metadata
      const metadata = await db.metadata.get(record.ratingKey);
      if (metadata) {
        metadata.dirty = false;
        await db.metadata.put(metadata);
      }
    }
  }

  /**
   * Private helper: Update change error
   */
  private async updateChangeError(changeId: string, error: string): Promise<void> {
    const record = await db.offlineChanges.get(changeId);
    if (record) {
      record.error = error;
      await db.offlineChanges.put(record);
    }
  }

  /**
   * Private helper: Sort items
   */
  private sortItems(items: MetadataRecord[], sort: string): MetadataRecord[] {
    const parts = sort.split(':');
    const field = parts[0];
    const direction = parts[1];
    
    if (!field) {
      return items;
    }
    
    const dir = direction === 'desc' ? -1 : 1;

    return items.sort((a, b) => {
      const aData = a.data as any;
      const bData = b.data as any;
      const aVal = aData[field];
      const bVal = bData[field];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * dir;
      }

      return (aVal - bVal) * dir;
    });
  }

  /**
   * Private helper: Map Plex API response to MetadataItem
   */
  private mapToMetadataItem(item: any): MetadataItem {
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
      roles: item.Role?.map((r: any) => ({
        tag: r.tag,
        role: r.role,
        thumb: r.thumb,
        id: r.id,
      })),
      directors: item.Director?.map((d: any) => ({ tag: d.tag, id: d.id })),
      writers: item.Writer?.map((w: any) => ({ tag: w.tag, id: w.id })),
      index: item.index,
      parentIndex: item.parentIndex,
      parentRatingKey: item.parentRatingKey,
      grandparentRatingKey: item.grandparentRatingKey,
      parentTitle: item.parentTitle,
      grandparentTitle: item.grandparentTitle,
      Media: item.Media,
      viewCount: item.viewCount,
      lastViewedAt: item.lastViewedAt,
      userRating: item.userRating,
      librarySectionID: item.librarySectionID,
    };
  }

  /**
   * Event emitter helper
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(data));
    }
  }

  /**
   * Add event listener
   */
  on(event: string, listener: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
}

/**
 * Create a Cache Manager instance
 */
export function createCacheManager(client: PlexClient): CacheManager {
  return new CacheManager(client);
}
