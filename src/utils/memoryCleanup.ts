/**
 * Memory Cleanup Utilities
 * 
 * Provides utilities for cleaning up memory during long sessions:
 * - React Query cache cleanup
 * - IndexedDB cache expiration
 * - Event listener cleanup
 * - Image/blob cleanup
 * - Memory monitoring
 */

import { QueryClient } from '@tanstack/react-query';
import { db } from '@/db/database';

/**
 * Configuration for memory cleanup
 */
export interface CleanupConfig {
  /** Interval between cleanup runs (ms) */
  cleanupInterval?: number;
  /** Max age for React Query cache entries (ms) */
  queryCacheMaxAge?: number;
  /** Max age for IndexedDB cache entries (ms) */
  dbCacheMaxAge?: number;
  /** Enable automatic cleanup */
  autoCleanup?: boolean;
}

/**
 * Default cleanup configuration
 */
const DEFAULT_CONFIG: Required<CleanupConfig> = {
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  queryCacheMaxAge: 30 * 60 * 1000, // 30 minutes
  dbCacheMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  autoCleanup: true,
};

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  /** Total heap size (bytes) */
  totalHeapSize?: number;
  /** Used heap size (bytes) */
  usedHeapSize?: number;
  /** Heap size limit (bytes) */
  heapSizeLimit?: number;
  /** React Query cache size (number of queries) */
  queryCacheSize: number;
  /** IndexedDB cache size (bytes) */
  dbCacheSize: number;
  /** Number of cached metadata items */
  cachedMetadataCount: number;
  /** Number of cached artwork items */
  cachedArtworkCount: number;
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  /** Number of React Query entries removed */
  queriesRemoved: number;
  /** Number of IndexedDB metadata entries removed */
  metadataRemoved: number;
  /** Number of IndexedDB artwork entries removed */
  artworkRemoved: number;
  /** Bytes freed from IndexedDB */
  bytesFreed: number;
  /** Timestamp of cleanup */
  timestamp: number;
}

/**
 * Memory Manager
 * 
 * Manages memory cleanup and monitoring for the application
 */
export class MemoryManager {
  private config: Required<CleanupConfig>;
  private cleanupIntervalId: number | null = null;
  private queryClient: QueryClient;
  private isRunning = false;

  constructor(queryClient: QueryClient, config: CleanupConfig = {}) {
    this.queryClient = queryClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start automatic cleanup
   */
  startCleanup(): void {
    if (this.isRunning) {
      console.warn('Memory cleanup is already running');
      return;
    }

    if (!this.config.autoCleanup) {
      console.log('Automatic cleanup is disabled');
      return;
    }

    this.isRunning = true;
    this.cleanupIntervalId = window.setInterval(() => {
      this.cleanup().catch((error) => {
        console.error('Memory cleanup failed:', error);
      });
    }, this.config.cleanupInterval);

    console.log(
      `Memory cleanup started (interval: ${this.config.cleanupInterval / 1000}s)`
    );
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupIntervalId !== null) {
      window.clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      this.isRunning = false;
      console.log('Memory cleanup stopped');
    }
  }

  /**
   * Perform a full cleanup
   */
  async cleanup(): Promise<CleanupResult> {
    const result: CleanupResult = {
      queriesRemoved: 0,
      metadataRemoved: 0,
      artworkRemoved: 0,
      bytesFreed: 0,
      timestamp: Date.now(),
    };

    // Clean React Query cache
    result.queriesRemoved = this.cleanupQueryCache();

    // Clean IndexedDB cache
    const dbResult = await this.cleanupDatabase();
    result.metadataRemoved = dbResult.metadataRemoved;
    result.artworkRemoved = dbResult.artworkRemoved;
    result.bytesFreed = dbResult.bytesFreed;

    console.log('Memory cleanup completed:', result);
    return result;
  }

  /**
   * Clean up old React Query cache entries
   */
  private cleanupQueryCache(): number {
    const queries = this.queryClient.getQueryCache().getAll();
    const now = Date.now();
    let removed = 0;

    queries.forEach((query) => {
      const age = now - (query.state.dataUpdatedAt || 0);
      if (age > this.config.queryCacheMaxAge) {
        this.queryClient.removeQueries({ queryKey: query.queryKey });
        removed++;
      }
    });

    return removed;
  }

  /**
   * Clean up old IndexedDB cache entries
   */
  private async cleanupDatabase(): Promise<{
    metadataRemoved: number;
    artworkRemoved: number;
    bytesFreed: number;
  }> {
    const cutoff = Date.now() - this.config.dbCacheMaxAge;
    let metadataRemoved = 0;
    let artworkRemoved = 0;
    let bytesFreed = 0;

    try {
      // Clean old metadata
      const oldMetadata = await db.metadata
        .where('cachedAt')
        .below(cutoff)
        .toArray();

      for (const record of oldMetadata) {
        // Estimate size
        bytesFreed += JSON.stringify(record.data).length;
        await db.metadata.delete(record.ratingKey);
        metadataRemoved++;
      }

      // Clean old artwork
      const oldArtwork = await db.artwork.where('cachedAt').below(cutoff).toArray();

      for (const record of oldArtwork) {
        bytesFreed += record.size;
        await db.artwork.delete(record.url);
        artworkRemoved++;
      }
    } catch (error) {
      console.error('Database cleanup failed:', error);
    }

    return { metadataRemoved, artworkRemoved, bytesFreed };
  }

  /**
   * Get current memory statistics
   */
  async getMemoryStats(): Promise<MemoryStats> {
    const stats: MemoryStats = {
      queryCacheSize: this.queryClient.getQueryCache().getAll().length,
      dbCacheSize: 0,
      cachedMetadataCount: 0,
      cachedArtworkCount: 0,
    };

    // Get performance memory info if available (Chrome/Edge)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      stats.totalHeapSize = memory.totalJSHeapSize;
      stats.usedHeapSize = memory.usedJSHeapSize;
      stats.heapSizeLimit = memory.jsHeapSizeLimit;
    }

    // Get IndexedDB stats
    try {
      const metadata = await db.metadata.toArray();
      stats.cachedMetadataCount = metadata.length;
      stats.dbCacheSize += metadata.reduce(
        (sum, record) => sum + JSON.stringify(record.data).length,
        0
      );

      const artwork = await db.artwork.toArray();
      stats.cachedArtworkCount = artwork.length;
      stats.dbCacheSize += artwork.reduce((sum, record) => sum + record.size, 0);
    } catch (error) {
      console.error('Failed to get database stats:', error);
    }

    return stats;
  }

  /**
   * Clear all caches (nuclear option)
   */
  async clearAllCaches(): Promise<void> {
    // Clear React Query cache
    this.queryClient.clear();

    // Clear IndexedDB cache
    await db.metadata.clear();
    await db.artwork.clear();
    await db.librarySections.clear();

    console.log('All caches cleared');
  }

  /**
   * Clear only React Query cache
   */
  clearQueryCache(): void {
    this.queryClient.clear();
    console.log('React Query cache cleared');
  }

  /**
   * Clear only IndexedDB cache
   */
  async clearDatabaseCache(): Promise<void> {
    await db.metadata.clear();
    await db.artwork.clear();
    await db.librarySections.clear();
    console.log('IndexedDB cache cleared');
  }
}

/**
 * Create a memory manager instance
 */
export function createMemoryManager(
  queryClient: QueryClient,
  config?: CleanupConfig
): MemoryManager {
  return new MemoryManager(queryClient, config);
}

/**
 * Hook cleanup utility
 * 
 * Helps track and cleanup event listeners and subscriptions
 */
export class CleanupTracker {
  private cleanupFunctions: Array<() => void> = [];

  /**
   * Add a cleanup function
   */
  add(cleanup: () => void): void {
    this.cleanupFunctions.push(cleanup);
  }

  /**
   * Add an event listener with automatic cleanup
   */
  addEventListener<K extends keyof WindowEventMap>(
    target: Window | Document | HTMLElement,
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type as string, listener as EventListener, options);
    this.add(() => {
      target.removeEventListener(type as string, listener as EventListener, options);
    });
  }

  /**
   * Add a timer with automatic cleanup
   */
  setTimeout(callback: () => void, delay: number): number {
    const id = window.setTimeout(callback, delay);
    this.add(() => window.clearTimeout(id));
    return id;
  }

  /**
   * Add an interval with automatic cleanup
   */
  setInterval(callback: () => void, delay: number): number {
    const id = window.setInterval(callback, delay);
    this.add(() => window.clearInterval(id));
    return id;
  }

  /**
   * Add an AbortController with automatic cleanup
   */
  createAbortController(): AbortController {
    const controller = new AbortController();
    this.add(() => controller.abort());
    return controller;
  }

  /**
   * Execute all cleanup functions
   */
  cleanup(): void {
    this.cleanupFunctions.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.error('Cleanup function failed:', error);
      }
    });
    this.cleanupFunctions = [];
  }

  /**
   * Get number of tracked cleanup functions
   */
  get size(): number {
    return this.cleanupFunctions.length;
  }
}

/**
 * Image cache cleanup utility
 */
export class ImageCacheManager {
  private imageCache = new Map<string, string>();
  private maxCacheSize: number;

  constructor(maxCacheSize = 100) {
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Add an image URL to cache
   */
  add(key: string, objectUrl: string): void {
    // If cache is full, remove oldest entry
    if (this.imageCache.size >= this.maxCacheSize) {
      const firstKey = this.imageCache.keys().next().value;
      if (firstKey !== undefined) {
        this.revoke(firstKey);
      }
    }

    this.imageCache.set(key, objectUrl);
  }

  /**
   * Get an image URL from cache
   */
  get(key: string): string | undefined {
    return this.imageCache.get(key);
  }

  /**
   * Revoke and remove an image URL
   */
  revoke(key: string): void {
    const objectUrl = this.imageCache.get(key);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      this.imageCache.delete(key);
    }
  }

  /**
   * Clear all cached images
   */
  clear(): void {
    this.imageCache.forEach((objectUrl) => {
      URL.revokeObjectURL(objectUrl);
    });
    this.imageCache.clear();
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.imageCache.size;
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format memory stats to human-readable string
 */
export function formatMemoryStats(stats: MemoryStats): string {
  const lines: string[] = [];

  if (stats.usedHeapSize !== undefined && stats.heapSizeLimit !== undefined) {
    const percentage = ((stats.usedHeapSize / stats.heapSizeLimit) * 100).toFixed(1);
    lines.push(
      `Heap: ${formatBytes(stats.usedHeapSize)} / ${formatBytes(stats.heapSizeLimit)} (${percentage}%)`
    );
  }

  lines.push(`React Query Cache: ${stats.queryCacheSize} queries`);
  lines.push(`IndexedDB Cache: ${formatBytes(stats.dbCacheSize)}`);
  lines.push(`Cached Metadata: ${stats.cachedMetadataCount} items`);
  lines.push(`Cached Artwork: ${stats.cachedArtworkCount} items`);

  return lines.join('\n');
}
