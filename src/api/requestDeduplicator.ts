/**
 * Request Deduplication Utility
 * 
 * Prevents duplicate identical requests from being sent to the server.
 * When multiple identical requests are made simultaneously, only one actual
 * network request is executed and the result is shared with all callers.
 */

export interface DeduplicationConfig {
  /** Whether deduplication is enabled */
  enabled: boolean;
  /** Maximum time (ms) to keep a request in the deduplication cache */
  ttl: number;
  /** Methods to deduplicate (e.g., ['GET', 'HEAD']) */
  methods: string[];
  /** Whether to deduplicate requests with different headers */
  ignoreHeaders: boolean;
}

export interface PendingRequest<T> {
  /** Promise that resolves when the request completes */
  promise: Promise<T>;
  /** Resolve function for the promise */
  resolve: (value: T) => void;
  /** Reject function for the promise */
  reject: (error: Error) => void;
  /** Timestamp when the request was queued */
  queuedAt: number;
  /** Number of callers waiting for this request */
  callerCount: number;
}

export interface RequestKey {
  method: string;
  url: string;
  params?: any;
  data?: any;
  headers?: Record<string, string>;
}

export interface DeduplicationStats {
  /** Total number of requests processed */
  totalRequests: number;
  /** Number of requests that were deduplicated */
  deduplicatedRequests: number;
  /** Number of unique requests executed */
  uniqueRequests: number;
  /** Current number of in-flight requests */
  inFlightRequests: number;
  /** Deduplication hit rate (0-1) */
  hitRate: number;
}

/**
 * Request deduplicator that prevents duplicate simultaneous requests
 */
export class RequestDeduplicator {
  private inFlightRequests = new Map<string, PendingRequest<any>>();
  private config: DeduplicationConfig;
  private stats: DeduplicationStats = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    uniqueRequests: 0,
    inFlightRequests: 0,
    hitRate: 0,
  };

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      ttl: config.ttl ?? 5000, // 5 seconds default
      methods: config.methods ?? ['GET', 'HEAD'],
      ignoreHeaders: config.ignoreHeaders ?? true,
    };
  }

  /**
   * Execute a request with deduplication
   * If an identical request is already in flight, returns the existing promise
   */
  async deduplicate<T>(
    requestKey: RequestKey,
    requestFn: () => Promise<T>
  ): Promise<T> {
    this.stats.totalRequests++;

    // Check if deduplication is enabled and method is eligible
    if (!this.config.enabled || !this.shouldDeduplicate(requestKey.method)) {
      this.stats.uniqueRequests++;
      return requestFn();
    }

    const key = this.generateKey(requestKey);

    // Check if identical request is already in flight
    const existing = this.inFlightRequests.get(key);
    if (existing) {
      // Check if request hasn't expired
      if (Date.now() - existing.queuedAt < this.config.ttl) {
        this.stats.deduplicatedRequests++;
        existing.callerCount++;
        return existing.promise;
      } else {
        // Request expired, remove it
        this.inFlightRequests.delete(key);
      }
    }

    // Create new request
    this.stats.uniqueRequests++;
    this.stats.inFlightRequests++;

    let resolve: (value: T) => void;
    let reject: (error: Error) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const pendingRequest: PendingRequest<T> = {
      promise,
      resolve: resolve!,
      reject: reject!,
      queuedAt: Date.now(),
      callerCount: 1,
    };

    this.inFlightRequests.set(key, pendingRequest);

    // Execute the actual request
    try {
      const result = await requestFn();
      pendingRequest.resolve(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Request failed');
      pendingRequest.reject(err);
      throw err;
    } finally {
      // Clean up
      this.inFlightRequests.delete(key);
      this.stats.inFlightRequests--;
      this.updateHitRate();
    }
  }

  /**
   * Generate a unique key for a request
   */
  private generateKey(requestKey: RequestKey): string {
    const parts: string[] = [
      requestKey.method.toUpperCase(),
      requestKey.url,
    ];

    // Include params if present
    if (requestKey.params) {
      parts.push(JSON.stringify(this.sortObject(requestKey.params)));
    }

    // Include data if present (for POST/PUT/PATCH)
    if (requestKey.data) {
      parts.push(JSON.stringify(this.sortObject(requestKey.data)));
    }

    // Include headers if not ignoring them
    if (!this.config.ignoreHeaders && requestKey.headers) {
      parts.push(JSON.stringify(this.sortObject(requestKey.headers)));
    }

    return parts.join('::');
  }

  /**
   * Sort object keys for consistent key generation
   */
  private sortObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObject(item));
    }

    const sorted: Record<string, any> = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = this.sortObject(obj[key]);
      });

    return sorted;
  }

  /**
   * Check if a request method should be deduplicated
   */
  private shouldDeduplicate(method: string): boolean {
    return this.config.methods.includes(method.toUpperCase());
  }

  /**
   * Update deduplication hit rate
   */
  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate =
        this.stats.deduplicatedRequests / this.stats.totalRequests;
    }
  }

  /**
   * Get current deduplication statistics
   */
  getStats(): DeduplicationStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      uniqueRequests: 0,
      inFlightRequests: this.inFlightRequests.size,
      hitRate: 0,
    };
  }

  /**
   * Clear all in-flight requests
   * Rejects all pending requests with a cancellation error
   */
  clear(): void {
    const error = new Error('Request deduplication cleared');
    this.inFlightRequests.forEach((request) => {
      request.reject(error);
    });
    this.inFlightRequests.clear();
    this.stats.inFlightRequests = 0;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DeduplicationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): DeduplicationConfig {
    return { ...this.config };
  }

  /**
   * Get number of in-flight requests
   */
  getInFlightCount(): number {
    return this.inFlightRequests.size;
  }

  /**
   * Check if a request is currently in flight
   */
  isInFlight(requestKey: RequestKey): boolean {
    const key = this.generateKey(requestKey);
    return this.inFlightRequests.has(key);
  }
}

/**
 * Create a request deduplicator instance
 */
export function createRequestDeduplicator(
  config?: Partial<DeduplicationConfig>
): RequestDeduplicator {
  return new RequestDeduplicator(config);
}
