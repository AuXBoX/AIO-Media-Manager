/**
 * Example: Plex API Client with Request Deduplication
 * 
 * This example demonstrates how to integrate the RequestDeduplicator
 * with the existing PlexClient to prevent duplicate simultaneous requests.
 */

import { PlexClient, type PlexClientConfig } from './plexClient';
import { RequestDeduplicator, type RequestKey } from './requestDeduplicator';
import type { AxiosRequestConfig } from 'axios';

/**
 * Enhanced Plex API Client with request deduplication
 * 
 * Extends the base PlexClient to add automatic request deduplication
 * for GET and HEAD requests.
 */
export class PlexClientWithDeduplication extends PlexClient {
  private deduplicator: RequestDeduplicator;

  constructor(config: PlexClientConfig) {
    super(config);

    // Initialize deduplicator with sensible defaults for Plex API
    this.deduplicator = new RequestDeduplicator({
      enabled: true,
      ttl: 5000, // 5 seconds - good for metadata that doesn't change frequently
      methods: ['GET', 'HEAD'], // Only deduplicate safe read operations
      ignoreHeaders: true, // Plex uses same headers for most requests
    });
  }

  /**
   * GET request with automatic deduplication
   * 
   * Identical simultaneous GET requests will be deduplicated,
   * with only one actual network request being made.
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const requestKey: RequestKey = {
      method: 'GET',
      url,
      params: config?.params,
    };

    return this.deduplicator.deduplicate(requestKey, () =>
      super.get<T>(url, config)
    );
  }

  /**
   * Get deduplication statistics
   * 
   * Useful for monitoring and debugging deduplication effectiveness
   */
  getDeduplicationStats() {
    return this.deduplicator.getStats();
  }

  /**
   * Clear deduplication cache
   * 
   * Useful when you need to force fresh requests
   */
  clearDeduplicationCache() {
    this.deduplicator.clear();
  }

  /**
   * Update deduplication configuration
   * 
   * Allows runtime configuration changes
   */
  updateDeduplicationConfig(config: {
    enabled?: boolean;
    ttl?: number;
    methods?: string[];
    ignoreHeaders?: boolean;
  }) {
    this.deduplicator.updateConfig(config);
  }
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example 1: Basic Usage
 */
async function example1_BasicUsage() {
  const client = new PlexClientWithDeduplication({
    baseURL: 'http://localhost:32400',
    token: 'your-plex-token',
  });

  // These three requests will be deduplicated into one
  const [library1, library2, library3] = await Promise.all([
    client.get('/library/sections'),
    client.get('/library/sections'),
    client.get('/library/sections'),
  ]);

  console.log('All three requests returned the same data');
  console.log('But only one HTTP request was made!');
}

/**
 * Example 2: Monitoring Statistics
 */
async function example2_MonitoringStats() {
  const client = new PlexClientWithDeduplication({
    baseURL: 'http://localhost:32400',
    token: 'your-plex-token',
  });

  // Make some requests
  await Promise.all([
    client.get('/library/sections'),
    client.get('/library/sections'),
    client.get('/library/metadata/123'),
    client.get('/library/metadata/123'),
    client.get('/library/metadata/456'),
  ]);

  // Check statistics
  const stats = client.getDeduplicationStats();
  console.log('Deduplication Statistics:');
  console.log(`  Total Requests: ${stats.totalRequests}`);
  console.log(`  Unique Requests: ${stats.uniqueRequests}`);
  console.log(`  Deduplicated: ${stats.deduplicatedRequests}`);
  console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`  Saved ${stats.deduplicatedRequests} network requests!`);
}

/**
 * Example 3: Dynamic Configuration
 */
async function example3_DynamicConfiguration() {
  const client = new PlexClientWithDeduplication({
    baseURL: 'http://localhost:32400',
    token: 'your-plex-token',
  });

  // Normal operation with deduplication
  await Promise.all([
    client.get('/library/sections'),
    client.get('/library/sections'),
  ]);

  // Temporarily disable deduplication for fresh data
  client.updateDeduplicationConfig({ enabled: false });
  const freshData = await client.get('/library/sections');

  // Re-enable with shorter TTL for frequently changing data
  client.updateDeduplicationConfig({
    enabled: true,
    ttl: 2000, // 2 seconds
  });
}

/**
 * Example 4: Real-world Scenario - Loading Library Items
 */
async function example4_RealWorldScenario() {
  const client = new PlexClientWithDeduplication({
    baseURL: 'http://localhost:32400',
    token: 'your-plex-token',
  });

  // Simulate multiple components requesting the same library data
  async function LibraryComponent() {
    return client.get('/library/sections/1/all', {
      params: { type: 9, 'X-Plex-Container-Size': 50 },
    });
  }

  async function SidebarComponent() {
    return client.get('/library/sections/1/all', {
      params: { type: 9, 'X-Plex-Container-Size': 50 },
    });
  }

  async function HeaderComponent() {
    return client.get('/library/sections/1/all', {
      params: { type: 9, 'X-Plex-Container-Size': 50 },
    });
  }

  // All three components load simultaneously
  // But only ONE network request is made!
  const [data1, data2, data3] = await Promise.all([
    LibraryComponent(),
    SidebarComponent(),
    HeaderComponent(),
  ]);

  console.log('All components have their data');
  console.log('Network requests saved: 2');
}

/**
 * Example 5: Handling Errors
 */
async function example5_ErrorHandling() {
  const client = new PlexClientWithDeduplication({
    baseURL: 'http://localhost:32400',
    token: 'invalid-token', // This will cause an error
  });

  try {
    // All three requests will fail with the same error
    await Promise.all([
      client.get('/library/sections'),
      client.get('/library/sections'),
      client.get('/library/sections'),
    ]);
  } catch (error) {
    console.error('All requests failed with:', error);
    // Only one actual network request was made
    // But all three callers received the error
  }
}

/**
 * Example 6: Periodic Statistics Reporting
 */
function example6_PeriodicReporting() {
  const client = new PlexClientWithDeduplication({
    baseURL: 'http://localhost:32400',
    token: 'your-plex-token',
  });

  // Report statistics every minute
  setInterval(() => {
    const stats = client.getDeduplicationStats();
    
    if (stats.totalRequests > 0) {
      console.log('=== Deduplication Report ===');
      console.log(`Requests: ${stats.totalRequests}`);
      console.log(`Saved: ${stats.deduplicatedRequests}`);
      console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
      console.log(`In Flight: ${stats.inFlightRequests}`);
      console.log('===========================');
    }
  }, 60000); // Every minute
}

/**
 * Example 7: Integration with React Query
 */
function example7_ReactQueryIntegration() {
  const client = new PlexClientWithDeduplication({
    baseURL: 'http://localhost:32400',
    token: 'your-plex-token',
  });

  // React Query configuration
  const queryClient = {
    defaultOptions: {
      queries: {
        queryFn: async ({ queryKey }: any) => {
          const [endpoint, params] = queryKey;
          return client.get(endpoint, { params });
        },
      },
    },
  };

  // Multiple components using the same query
  // React Query will deduplicate at the query level
  // AND our client will deduplicate at the network level
  // Double protection against duplicate requests!
}

/**
 * Example 8: Clearing Cache on User Action
 */
async function example8_ClearingCache() {
  const client = new PlexClientWithDeduplication({
    baseURL: 'http://localhost:32400',
    token: 'your-plex-token',
  });

  // User clicks "Refresh" button
  function handleRefreshClick() {
    // Clear deduplication cache to force fresh requests
    client.clearDeduplicationCache();
    
    // Now fetch fresh data
    return client.get('/library/sections');
  }

  // User switches servers
  function handleServerSwitch(newServerUrl: string, newToken: string) {
    // Clear cache when switching servers
    client.clearDeduplicationCache();
    
    // Update client configuration
    client.updateBaseURL(newServerUrl);
    client.updateToken(newToken);
  }
}

// ============================================================================
// Performance Comparison
// ============================================================================

/**
 * Benchmark: With vs Without Deduplication
 */
async function benchmark_Comparison() {
  console.log('=== Performance Benchmark ===\n');

  // Without deduplication
  const clientWithout = new PlexClient({
    baseURL: 'http://localhost:32400',
    token: 'your-plex-token',
  });

  const startWithout = Date.now();
  await Promise.all([
    clientWithout.get('/library/sections'),
    clientWithout.get('/library/sections'),
    clientWithout.get('/library/sections'),
    clientWithout.get('/library/sections'),
    clientWithout.get('/library/sections'),
  ]);
  const timeWithout = Date.now() - startWithout;

  // With deduplication
  const clientWith = new PlexClientWithDeduplication({
    baseURL: 'http://localhost:32400',
    token: 'your-plex-token',
  });

  const startWith = Date.now();
  await Promise.all([
    clientWith.get('/library/sections'),
    clientWith.get('/library/sections'),
    clientWith.get('/library/sections'),
    clientWith.get('/library/sections'),
    clientWith.get('/library/sections'),
  ]);
  const timeWith = Date.now() - startWith;

  console.log(`Without Deduplication: ${timeWithout}ms (5 requests)`);
  console.log(`With Deduplication: ${timeWith}ms (1 request)`);
  console.log(`Improvement: ${((1 - timeWith / timeWithout) * 100).toFixed(2)}%`);
  console.log(`Time Saved: ${timeWithout - timeWith}ms`);
}

// Export examples for documentation
export const examples = {
  example1_BasicUsage,
  example2_MonitoringStats,
  example3_DynamicConfiguration,
  example4_RealWorldScenario,
  example5_ErrorHandling,
  example6_PeriodicReporting,
  example7_ReactQueryIntegration,
  example8_ClearingCache,
  benchmark_Comparison,
};
