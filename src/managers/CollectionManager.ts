import { PlexClient } from '@/api/plexClient';

/**
 * Collection interface
 */
export interface Collection {
  ratingKey: string;
  key: string;
  title: string;
  summary?: string;
  thumb?: string;
  art?: string;
  childCount: number;
  addedAt: number;
  updatedAt: number;
  subtype?: string;
  type: string;
  guid?: string;
  index?: number;
  [key: string]: any;
}

/**
 * Collection update interface
 */
export interface CollectionUpdate {
  title?: string;
  summary?: string;
}

/**
 * Collection Manager Interface
 */
export interface ICollectionManager {
  // Collections
  getCollections(sectionId: string): Promise<Collection[]>;
  getCollection(collectionId: string): Promise<Collection>;
  createCollection(sectionId: string, title: string): Promise<Collection>;
  deleteCollection(collectionId: string): Promise<void>;
  updateCollection(collectionId: string, updates: CollectionUpdate): Promise<void>;

  // Items
  addToCollection(collectionId: string, ratingKeys: string[]): Promise<void>;
  removeFromCollection(collectionId: string, itemId: string): Promise<void>;
  reorderInCollection(collectionId: string, itemId: string, afterItemId: string): Promise<void>;
}

/**
 * Collection Manager Implementation
 * Handles collection management operations
 */
export class CollectionManager implements ICollectionManager {
  constructor(private client: PlexClient) {}

  /**
   * Get all collections in a library section
   */
  async getCollections(sectionId: string): Promise<Collection[]> {
    const response = await this.client.get<any>(`/library/sections/${sectionId}/collections`);

    const collections = response.MediaContainer?.Metadata || [];
    return collections.map((collection: any) => this.mapCollection(collection));
  }

  /**
   * Get a specific collection by ID
   */
  async getCollection(collectionId: string): Promise<Collection> {
    const response = await this.client.get<any>(`/library/collections/${collectionId}`);

    if (!response?.MediaContainer?.Metadata?.[0]) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    return this.mapCollection(response.MediaContainer.Metadata[0]);
  }

  /**
   * Create a new collection
   */
  async createCollection(sectionId: string, title: string): Promise<Collection> {
    const response = await this.client.post<any>(
      `/library/collections`,
      null,
      {
        params: {
          type: 1, // Collection type
          title,
          sectionId,
          smart: 0,
        },
      }
    );

    if (!response?.MediaContainer?.Metadata?.[0]) {
      throw new Error('Failed to create collection');
    }

    return this.mapCollection(response.MediaContainer.Metadata[0]);
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionId: string): Promise<void> {
    await this.client.delete(`/library/collections/${collectionId}`);
  }

  /**
   * Update collection metadata
   */
  async updateCollection(collectionId: string, updates: CollectionUpdate): Promise<void> {
    const params: any = {};

    if (updates.title !== undefined) {
      params.title = updates.title;
    }

    if (updates.summary !== undefined) {
      params.summary = updates.summary;
    }

    await this.client.put(`/library/metadata/${collectionId}`, null, { params });
  }

  /**
   * Add items to a collection
   */
  async addToCollection(collectionId: string, ratingKeys: string[]): Promise<void> {
    // Build URI for items to add
    const uris = ratingKeys.map((key) => `server://library/metadata/${key}`).join(',');

    await this.client.put(`/library/collections/${collectionId}/items`, null, {
      params: { uri: uris },
    });
  }

  /**
   * Remove an item from a collection
   */
  async removeFromCollection(collectionId: string, itemId: string): Promise<void> {
    await this.client.delete(`/library/collections/${collectionId}/items/${itemId}`);
  }

  /**
   * Reorder an item within a collection
   */
  async reorderInCollection(
    collectionId: string,
    itemId: string,
    afterItemId: string
  ): Promise<void> {
    await this.client.put(
      `/library/collections/${collectionId}/items/${itemId}/move`,
      null,
      {
        params: { after: afterItemId },
      }
    );
  }

  /**
   * Map Plex collection response to Collection interface
   */
  private mapCollection(collection: any): Collection {
    return {
      ratingKey: collection.ratingKey,
      key: collection.key,
      title: collection.title,
      summary: collection.summary,
      thumb: collection.thumb,
      art: collection.art,
      childCount: collection.childCount || 0,
      addedAt: collection.addedAt,
      updatedAt: collection.updatedAt,
      subtype: collection.subtype,
      type: collection.type,
      guid: collection.guid,
      index: collection.index,
      ...collection,
    };
  }
}

/**
 * Create a Collection Manager instance
 */
export function createCollectionManager(client: PlexClient): CollectionManager {
  return new CollectionManager(client);
}
