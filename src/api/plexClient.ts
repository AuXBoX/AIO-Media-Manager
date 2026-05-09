import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

/**
 * Custom error class for Plex API errors
 */
export class PlexApiError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PlexApiError';
  }
}

/**
 * Request queue item for deduplication
 */
interface QueuedRequest {
  config: AxiosRequestConfig;
  promise: Promise<any>;
}

/**
 * Plex API Client Configuration
 */
export interface PlexClientConfig {
  baseURL: string;
  token: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  rateLimit?: {
    maxRequests: number;
    perMilliseconds: number;
  };
}

/**
 * Plex API Client
 * 
 * Provides a robust HTTP client for Plex Media Server API with:
 * - Automatic retry with exponential backoff
 * - Rate limiting
 * - Request deduplication
 * - Error classification
 * - Request/response interceptors
 */
export class PlexClient {
  private client: AxiosInstance;
  private config: PlexClientConfig;
  private requestQueue: Map<string, QueuedRequest> = new Map();
  private rateLimitQueue: Array<number> = [];

  constructor(config: PlexClientConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      rateLimit: {
        maxRequests: 100,
        perMilliseconds: 60000, // 100 requests per minute
      },
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'X-Plex-Token': this.config.token,
        'X-Plex-Product': 'AIO Media Manager',
        'X-Plex-Client-Identifier': 'aio-media-manager',
        'X-Plex-Platform': 'Web',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Apply rate limiting
        await this.applyRateLimit();
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & { _retryCount?: number };
        
        // Classify error
        const classifiedError = this.classifyError(error);
        
        // Retry logic
        if (this.shouldRetry(classifiedError, config)) {
          config._retryCount = (config._retryCount || 0) + 1;
          
          // Calculate delay with exponential backoff
          const delay = this.config.retryDelay! * Math.pow(2, config._retryCount - 1);
          
          await this.delay(delay);
          
          return this.client.request(config);
        }
        
        return Promise.reject(classifiedError);
      }
    );
  }

  /**
   * Classify error into categories
   */
  private classifyError(error: AxiosError): PlexApiError {
    if (!error.response) {
      // Network error or timeout
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return new PlexApiError(
          'Request timeout',
          ErrorCategory.TIMEOUT,
          undefined,
          error
        );
      }
      return new PlexApiError(
        'Network error',
        ErrorCategory.NETWORK,
        undefined,
        error
      );
    }

    const status = error.response.status;

    switch (status) {
      case 401:
        return new PlexApiError(
          'Authentication failed',
          ErrorCategory.AUTHENTICATION,
          status,
          error
        );
      case 403:
        return new PlexApiError(
          'Access forbidden',
          ErrorCategory.AUTHORIZATION,
          status,
          error
        );
      case 404:
        return new PlexApiError(
          'Resource not found',
          ErrorCategory.NOT_FOUND,
          status,
          error
        );
      case 429:
        return new PlexApiError(
          'Rate limit exceeded',
          ErrorCategory.RATE_LIMIT,
          status,
          error
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new PlexApiError(
          'Server error',
          ErrorCategory.SERVER_ERROR,
          status,
          error
        );
      default:
        return new PlexApiError(
          error.message || 'Unknown error',
          ErrorCategory.UNKNOWN,
          status,
          error
        );
    }
  }

  /**
   * Check if request should be retried
   */
  private shouldRetry(error: PlexApiError, config: AxiosRequestConfig & { _retryCount?: number }): boolean {
    const retryCount = config._retryCount || 0;
    
    if (retryCount >= this.config.maxRetries!) {
      return false;
    }

    // Retry on network errors, timeouts, and server errors
    return [
      ErrorCategory.NETWORK,
      ErrorCategory.TIMEOUT,
      ErrorCategory.SERVER_ERROR,
    ].includes(error.category);
  }

  /**
   * Apply rate limiting
   */
  private async applyRateLimit(): Promise<void> {
    if (!this.config.rateLimit) return;

    const now = Date.now();
    const { maxRequests, perMilliseconds } = this.config.rateLimit;

    // Remove old timestamps
    this.rateLimitQueue = this.rateLimitQueue.filter(
      (timestamp) => now - timestamp < perMilliseconds
    );

    // Check if we've exceeded the rate limit
    if (this.rateLimitQueue.length >= maxRequests) {
      const oldestRequest = this.rateLimitQueue[0]!;
      const waitTime = perMilliseconds - (now - oldestRequest);
      
      if (waitTime > 0) {
        await this.delay(waitTime);
      }
    }

    // Add current request timestamp
    this.rateLimitQueue.push(Date.now());
  }

  /**
   * Deduplicate identical requests
   */
  private async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<AxiosResponse<T>>
  ): Promise<AxiosResponse<T>> {
    // Check if identical request is already in progress
    const existing = this.requestQueue.get(key);
    if (existing) {
      return existing.promise;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      this.requestQueue.delete(key);
    });

    this.requestQueue.set(key, { config: {}, promise });

    return promise;
  }

  /**
   * Generate cache key for request deduplication
   */
  private generateRequestKey(method: string, url: string, params?: any): string {
    return `${method}:${url}:${JSON.stringify(params || {})}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET request with deduplication
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const key = this.generateRequestKey('GET', url, config?.params);
    
    const response = await this.deduplicateRequest(key, () =>
      this.client.get<T>(url, config)
    );
    
    return response.data;
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * Update authentication token
   */
  updateToken(token: string): void {
    this.config.token = token;
    this.client.defaults.headers['X-Plex-Token'] = token;
  }

  /**
   * Update base URL
   */
  updateBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
    this.client.defaults.baseURL = baseURL;
  }

  /**
   * Get current configuration
   */
  getConfig(): PlexClientConfig {
    return { ...this.config };
  }
}

/**
 * Create a Plex API client instance
 */
export function createPlexClient(config: PlexClientConfig): PlexClient {
  return new PlexClient(config);
}
