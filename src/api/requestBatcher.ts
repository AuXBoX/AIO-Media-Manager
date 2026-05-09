/**
 * Request Batching Utility
 * 
 * Groups multiple API requests together to reduce network overhead.
 * Implements intelligent batching with configurable parameters.
 */

export interface BatchConfig {
  /** Maximum number of requests to batch together */
  maxBatchSize: number;
  /** Delay in milliseconds before flushing the batch */
  batchDelay: number;
  /** Whether to enable batching (can be disabled for debugging) */
  enabled: boolean;
}

export interface BatchRequest<T = any> {
  /** Unique identifier for the request */
  id: string;
  /** Request parameters */
  params: any;
  /** Promise resolve function */
  resolve: (value: T) => void;
  /** Promise reject function */
  reject: (error: Error) => void;
  /** Timestamp when request was queued */
  queuedAt: number;
}

export interface BatchResult<T = any> {
  /** Request ID */
  id: string;
  /** Result data (if successful) */
  data?: T;
  /** Error (if failed) */
  error?: Error;
}

/**
 * Generic request batcher that groups similar requests together
 */
export class RequestBatcher<T = any> {
  private queue: BatchRequest<T>[] = [];
  private timer: NodeJS.Timeout | null = null;
  private config: BatchConfig;
  private batchHandler: (requests: BatchRequest<T>[]) => Promise<BatchResult<T>[]>;

  constructor(
    batchHandler: (requests: BatchRequest<T>[]) => Promise<BatchResult<T>[]>,
    config: Partial<BatchConfig> = {}
  ) {
    this.batchHandler = batchHandler;
    this.config = {
      maxBatchSize: config.maxBatchSize ?? 50,
      batchDelay: config.batchDelay ?? 50,
      enabled: config.enabled ?? true,
    };
  }

  /**
   * Add a request to the batch queue
   */
  async request(id: string, params: any): Promise<T> {
    // If batching is disabled, execute immediately
    if (!this.config.enabled) {
      const results = await this.batchHandler([
        {
          id,
          params,
          resolve: () => {},
          reject: () => {},
          queuedAt: Date.now(),
        },
      ]);
      
      const result = results[0];
      if (result?.error) {
        throw result.error;
      }
      return result?.data as T;
    }

    return new Promise<T>((resolve, reject) => {
      // Add to queue
      this.queue.push({
        id,
        params,
        resolve,
        reject,
        queuedAt: Date.now(),
      });

      // Schedule batch flush if not already scheduled
      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.config.batchDelay);
      }

      // Flush immediately if batch size limit reached
      if (this.queue.length >= this.config.maxBatchSize) {
        this.flush();
      }
    });
  }

  /**
   * Flush the current batch
   */
  private async flush(): Promise<void> {
    // Clear timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Get current batch and clear queue
    const batch = this.queue.splice(0);

    if (batch.length === 0) {
      return;
    }

    try {
      // Execute batch handler
      const results = await this.batchHandler(batch);

      // Resolve/reject individual promises
      results.forEach((result) => {
        const request = batch.find((r) => r.id === result.id);
        if (!request) return;

        if (result.error) {
          request.reject(result.error);
        } else {
          request.resolve(result.data as T);
        }
      });

      // Handle any requests that didn't get a result
      batch.forEach((request) => {
        const hasResult = results.some((r) => r.id === request.id);
        if (!hasResult) {
          request.reject(new Error('No result returned for request'));
        }
      });
    } catch (error) {
      // If batch handler fails completely, reject all requests
      batch.forEach((request) => {
        request.reject(
          error instanceof Error ? error : new Error('Batch request failed')
        );
      });
    }
  }

  /**
   * Force flush the current batch immediately
   */
  async forceFlush(): Promise<void> {
    await this.flush();
  }

  /**
   * Get the current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear the queue without executing
   */
  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Reject all pending requests
    this.queue.forEach((request) => {
      request.reject(new Error('Batch queue cleared'));
    });

    this.queue = [];
  }
}

/**
 * Metadata request batcher
 * Groups metadata fetch requests by rating key
 */
export class MetadataBatcher extends RequestBatcher<any> {
  constructor(
    fetchFunction: (ratingKeys: string[]) => Promise<Map<string, any>>,
    config?: Partial<BatchConfig>
  ) {
    super(
      async (requests) => {
        const ratingKeys = requests.map((r) => r.params.ratingKey);
        
        try {
          const results = await fetchFunction(ratingKeys);
          
          return requests.map((request) => ({
            id: request.id,
            data: results.get(request.params.ratingKey),
            error: results.has(request.params.ratingKey)
              ? undefined
              : new Error(`No data found for ratingKey: ${request.params.ratingKey}`),
          }));
        } catch (error) {
          // If batch fetch fails, return errors for all requests
          return requests.map((request) => ({
            id: request.id,
            error: error instanceof Error ? error : new Error('Batch fetch failed'),
          }));
        }
      },
      config
    );
  }

  /**
   * Fetch metadata for a single rating key
   */
  async getMetadata(ratingKey: string): Promise<any> {
    return this.request(ratingKey, { ratingKey });
  }
}

/**
 * Image request batcher
 * Groups image fetch requests by URL
 */
export class ImageBatcher extends RequestBatcher<Blob> {
  constructor(
    fetchFunction: (urls: string[]) => Promise<Map<string, Blob>>,
    config?: Partial<BatchConfig>
  ) {
    super(
      async (requests) => {
        const urls = requests.map((r) => r.params.url);
        
        try {
          const results = await fetchFunction(urls);
          
          return requests.map((request) => ({
            id: request.id,
            data: results.get(request.params.url),
            error: results.has(request.params.url)
              ? undefined
              : new Error(`No data found for URL: ${request.params.url}`),
          }));
        } catch (error) {
          return requests.map((request) => ({
            id: request.id,
            error: error instanceof Error ? error : new Error('Batch fetch failed'),
          }));
        }
      },
      config
    );
  }

  /**
   * Fetch image for a single URL
   */
  async getImage(url: string): Promise<Blob> {
    return this.request(url, { url });
  }
}

/**
 * Create a batched version of any async function
 */
export function createBatcher<TParams, TResult>(
  batchHandler: (params: TParams[]) => Promise<TResult[]>,
  config?: Partial<BatchConfig>
): (params: TParams) => Promise<TResult> {
  const batcher = new RequestBatcher<TResult>(
    async (requests) => {
      const params = requests.map((r) => r.params);
      
      try {
        const results = await batchHandler(params);
        
        return requests.map((request, index) => ({
          id: request.id,
          data: results[index],
        }));
      } catch (error) {
        return requests.map((request) => ({
          id: request.id,
          error: error instanceof Error ? error : new Error('Batch operation failed'),
        }));
      }
    },
    config
  );

  let requestCounter = 0;

  return (params: TParams): Promise<TResult> => {
    const id = `req-${++requestCounter}`;
    return batcher.request(id, params);
  };
}
