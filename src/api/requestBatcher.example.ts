/**
 * Request Batching Examples
 * 
 * This file demonstrates various usage patterns for the request batching utilities.
 */

import { createBatchedPlexClient } from './batchedPlexClient';
import { createBatcher, MetadataBatcher } from './requestBatcher';

// ============================================================================
// Example 1: Basic Batched Plex Client Usage
// ============================================================================

export function example1_BasicBatchedClient() {
  // Create a batched Plex client
  const client = createBatchedPlexClient({
    baseURL: 'http://localhost:32400',
    token: 'your-auth-token',
    batching: {
      metadata: {
        maxBatchSize: 50,  // Batch up to 50 metadata requests
        batchDelay: 50,    // Wait 50ms before flushing
      },
      images: {
        maxBatchSize: 20,  // Batch up to 20 image requests
        batchDelay: 100,   // Wait 100ms before flushing
      },
    },
  });

  // Fetch multiple metadata items - automatically batched
  async function fetchMultipleItems(ratingKeys: string[]) {
    const promises = ratingKeys.map((key) => client.getMetadata(key));
    const results = await Promise.all(promises);
    return results;
  }

  return { client, fetchMultipleItems };
}

// ============================================================================
// Example 2: React Component with Batching
// ============================================================================

export function example2_ReactComponent() {
  const client = createBatchedPlexClient({
    baseURL: 'http://localhost:32400',
    token: 'your-auth-token',
  });

  // React component that displays a list of media items
  function MediaList({ items }: { items: Array<{ ratingKey: string }> }) {
    return (
      <>
        {items.map((item) => (
          <MediaCard key={item.ratingKey} ratingKey={item.ratingKey} />
        ))}
      </>
    );
  }

  // Each card fetches its own metadata, but requests are batched
  function MediaCard({ ratingKey }: { ratingKey: string }) {
    const [metadata, setMetadata] = React.useState<any>(null);

    React.useEffect(() => {
      // This request is automatically batched with other concurrent requests
      client.getMetadata(ratingKey).then(setMetadata);
    }, [ratingKey]);

    if (!metadata) return <div>Loading...</div>;
    return <div>{metadata.title}</div>;
  }

  return { MediaList, MediaCard };
}

// ============================================================================
// Example 3: Custom Batcher for API Calls
// ============================================================================

export function example3_CustomBatcher() {
  // Create a custom batcher for any async function
  interface UserParams {
    userId: number;
  }

  interface User {
    id: number;
    name: string;
    email: string;
  }

  // Original batch function that handles multiple users
  async function fetchUsersBatch(params: UserParams[]): Promise<User[]> {
    const userIds = params.map((p) => p.userId);
    const response = await fetch('/api/users/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: userIds }),
    });
    return response.json();
  }

  // Create batched version
  const fetchUser = createBatcher<UserParams, User>(
    fetchUsersBatch,
    { maxBatchSize: 50, batchDelay: 50 }
  );

  // Use like a normal async function - batching happens automatically
  async function loadUsers(userIds: number[]) {
    const promises = userIds.map((id) => fetchUser({ userId: id }));
    const users = await Promise.all(promises);
    return users;
  }

  return { fetchUser, loadUsers };
}

// ============================================================================
// Example 4: Metadata Batcher with Error Handling
// ============================================================================

export function example4_ErrorHandling() {
  const metadataBatcher = new MetadataBatcher(
    async (ratingKeys: string[]) => {
      const results = new Map<string, any>();

      // Fetch each item, handling errors individually
      await Promise.all(
        ratingKeys.map(async (key) => {
          try {
            const response = await fetch(`/api/metadata/${key}`);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            results.set(key, data);
          } catch (error) {
            console.error(`Failed to fetch metadata for ${key}:`, error);
            // Don't add to results - will trigger error for this specific request
          }
        })
      );

      return results;
    },
    { maxBatchSize: 50, batchDelay: 50 }
  );

  // Fetch with error handling
  async function fetchMetadataWithFallback(ratingKey: string) {
    try {
      return await metadataBatcher.getMetadata(ratingKey);
    } catch (error) {
      console.error(`Metadata fetch failed for ${ratingKey}:`, error);
      // Return fallback data
      return {
        ratingKey,
        title: 'Unknown',
        error: true,
      };
    }
  }

  return { metadataBatcher, fetchMetadataWithFallback };
}

// ============================================================================
// Example 5: Performance Monitoring
// ============================================================================

export function example5_PerformanceMonitoring() {
  const client = createBatchedPlexClient({
    baseURL: 'http://localhost:32400',
    token: 'your-auth-token',
  });

  // Monitor batching performance
  function monitorBatching() {
    setInterval(() => {
      const stats = client.getBatchingStats();
      console.log('Batching Stats:', {
        metadataQueueSize: stats.metadata.queueSize,
        imagesQueueSize: stats.images.queueSize,
      });
    }, 1000);
  }

  // Adjust batching based on network conditions
  function adjustBatchingForNetwork(networkSpeed: 'fast' | 'slow') {
    if (networkSpeed === 'fast') {
      client.updateBatchingConfig({
        metadata: { maxBatchSize: 100, batchDelay: 25 },
        images: { maxBatchSize: 50, batchDelay: 50 },
      });
    } else {
      client.updateBatchingConfig({
        metadata: { maxBatchSize: 20, batchDelay: 100 },
        images: { maxBatchSize: 10, batchDelay: 200 },
      });
    }
  }

  return { monitorBatching, adjustBatchingForNetwork };
}

// ============================================================================
// Example 6: Force Flush for Time-Sensitive Operations
// ============================================================================

export function example6_ForceFlush() {
  const client = createBatchedPlexClient({
    baseURL: 'http://localhost:32400',
    token: 'your-auth-token',
    batching: {
      metadata: {
        maxBatchSize: 100,
        batchDelay: 1000, // Long delay for efficiency
      },
    },
  });

  // Queue requests during user interaction
  async function preloadMetadata(ratingKeys: string[]) {
    // Queue all requests
    const promises = ratingKeys.map((key) => client.getMetadata(key));

    // Don't wait for batch delay - flush immediately
    await client.flushBatches();

    // All requests are now in flight
    return Promise.all(promises);
  }

  // User clicks "Load More" - flush pending batches immediately
  async function handleLoadMore(newItems: string[]) {
    // Flush any pending batches first
    await client.flushBatches();

    // Then load new items
    return preloadMetadata(newItems);
  }

  return { preloadMetadata, handleLoadMore };
}

// ============================================================================
// Example 7: Conditional Batching (Debug Mode)
// ============================================================================

export function example7_ConditionalBatching() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const debugMode = localStorage.getItem('debugMode') === 'true';

  const client = createBatchedPlexClient({
    baseURL: 'http://localhost:32400',
    token: 'your-auth-token',
    batching: {
      metadata: {
        maxBatchSize: 50,
        batchDelay: 50,
        // Disable batching in debug mode for easier debugging
        enabled: !debugMode,
      },
    },
  });

  // Toggle batching at runtime
  function toggleBatching(enabled: boolean) {
    client.updateBatchingConfig({
      metadata: { enabled },
      images: { enabled },
    });
  }

  return { client, toggleBatching };
}

// ============================================================================
// Example 8: Integration with React Query
// ============================================================================

export function example8_ReactQuery() {
  import { useQuery } from '@tanstack/react-query';

  const client = createBatchedPlexClient({
    baseURL: 'http://localhost:32400',
    token: 'your-auth-token',
  });

  // Custom hook that uses batching with React Query
  function useMetadata(ratingKey: string) {
    return useQuery({
      queryKey: ['metadata', ratingKey],
      queryFn: () => client.getMetadata(ratingKey),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }

  // Component that uses the hook
  function MediaGrid({ items }: { items: Array<{ ratingKey: string }> }) {
    return (
      <div className="grid">
        {items.map((item) => (
          <MediaCard key={item.ratingKey} ratingKey={item.ratingKey} />
        ))}
      </div>
    );
  }

  function MediaCard({ ratingKey }: { ratingKey: string }) {
    // Each card makes its own query, but React Query + batching
    // ensures efficient data fetching
    const { data, isLoading, error } = useMetadata(ratingKey);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error loading metadata</div>;

    return (
      <div>
        <h3>{data.title}</h3>
        <p>{data.summary}</p>
      </div>
    );
  }

  return { useMetadata, MediaGrid, MediaCard };
}
