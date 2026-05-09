/**
 * Batched Plex Client
 * 
 * Extends the PlexClient with request batching capabilities for improved performance.
 */

import { PlexClient, PlexClientConfig } from './plexClient';
import { MetadataBatcher, ImageBatcher, type BatchConfig } from './requestBatcher';

export interface BatchedPlexClientConfig extends PlexClientConfig {
  /** Batching configuration */
  batching?: {
    /** Metadata batching config */
    metadata?: Partial<BatchConfig>;
    /** Image batching config */
    images?: Partial<BatchConfig>;
  };
}

/**
 * Plex client with built-in request batching
 */
export class BatchedPlexClient extends PlexClient {
  private metadataBatcher: MetadataBatcher;
  private imageBatcher: ImageBatcher;

  constructor(config: BatchedPlexClientConfig) {
    super(config);

    // Initialize metadata batcher
    this.metadataBatcher = new MetadataBatcher(
      async (ratingKeys: string[]) => {
        const results = new Map();

        // Fetch all metadata items in parallel
        await Promise.all(
          ratingKeys.map(async (ratingKey) => {
            try {
              const data = await super.get(`/library/metadata/${ratingKey}`);
              results.set(ratingKey, data);
            } catch (error) {
              // Log error but don't fail the entire batch
              console.error(`Failed to fetch metadata for ${ratingKey}:`, error);
            }
          })
        );

        return results;
      },
      config.batching?.metadata
    );

    // Initialize image batcher
    this.imageBatcher = new ImageBatcher(
      async (urls: string[]) => {
        const results = new Map();

        // Fetch all images in parallel
        await Promise.all(
          urls.map(async (url) => {
            try {
              // Use the parent class's get method to fetch the image
              const response = await fetch(url);
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              const blob = await response.blob();
              results.set(url, blob);
            } catch (error) {
              console.error(`Failed to fetch image ${url}:`, error);
            }
          })
        );

        return results;
      },
      config.batching?.images
    );
  }

  /**
   * Get metadata with automatic batching
   */
  async getMetadata(ratingKey: string): Promise<any> {
    return this.metadataBatcher.getMetadata(ratingKey);
  }

  /**
   * Get multiple metadata items (batched)
   */
  async getMetadataBatch(ratingKeys: string[]): Promise<Map<string, any>> {
    const promises = ratingKeys.map((key) => 
      this.metadataBatcher.getMetadata(key)
        .then(data => ({ key, data, error: undefined as Error | undefined }))
        .catch((error: Error) => ({ key, data: undefined, error }))
    );

    const results = await Promise.all(promises);
    const map = new Map();

    results.forEach(({ key, data, error }) => {
      if (data) {
        map.set(key, data);
      } else if (error) {
        console.error(`Failed to fetch metadata for ${key}:`, error);
      }
    });

    return map;
  }

  /**
   * Get image with automatic batching
   */
  async getImage(url: string): Promise<Blob> {
    return this.imageBatcher.getImage(url);
  }

  /**
   * Get multiple images (batched)
   */
  async getImageBatch(urls: string[]): Promise<Map<string, Blob>> {
    const promises = urls.map((url) =>
      this.imageBatcher.getImage(url)
        .then(blob => ({ url, blob, error: undefined as Error | undefined }))
        .catch((error: Error) => ({ url, blob: undefined, error }))
    );

    const results = await Promise.all(promises);
    const map = new Map();

    results.forEach(({ url, blob, error }) => {
      if (blob) {
        map.set(url, blob);
      } else if (error) {
        console.error(`Failed to fetch image ${url}:`, error);
      }
    });

    return map;
  }

  /**
   * Get children metadata with batching
   */
  async getChildren(ratingKey: string): Promise<any[]> {
    const data = await super.get(`/library/metadata/${ratingKey}/children`);
    return data.MediaContainer?.Metadata || [];
  }

  /**
   * Get children metadata for multiple items (batched)
   */
  async getChildrenBatch(ratingKeys: string[]): Promise<Map<string, any[]>> {
    const promises = ratingKeys.map(async (key) => {
      try {
        const children = await this.getChildren(key);
        return { key, children };
      } catch (error) {
        console.error(`Failed to fetch children for ${key}:`, error);
        return { key, children: [] };
      }
    });

    const results = await Promise.all(promises);
    const map = new Map();

    results.forEach(({ key, children }) => {
      map.set(key, children);
    });

    return map;
  }

  /**
   * Force flush all pending batches
   */
  async flushBatches(): Promise<void> {
    await Promise.all([
      this.metadataBatcher.forceFlush(),
      this.imageBatcher.forceFlush(),
    ]);
  }

  /**
   * Get batching statistics
   */
  getBatchingStats(): {
    metadata: { queueSize: number };
    images: { queueSize: number };
  } {
    return {
      metadata: {
        queueSize: this.metadataBatcher.getQueueSize(),
      },
      images: {
        queueSize: this.imageBatcher.getQueueSize(),
      },
    };
  }

  /**
   * Update batching configuration
   */
  updateBatchingConfig(config: {
    metadata?: Partial<BatchConfig>;
    images?: Partial<BatchConfig>;
  }): void {
    if (config.metadata) {
      this.metadataBatcher.updateConfig(config.metadata);
    }
    if (config.images) {
      this.imageBatcher.updateConfig(config.images);
    }
  }
}

/**
 * Create a batched Plex API client instance
 */
export function createBatchedPlexClient(
  config: BatchedPlexClientConfig
): BatchedPlexClient {
  return new BatchedPlexClient(config);
}
