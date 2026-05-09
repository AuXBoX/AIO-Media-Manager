# API Layer Documentation

This directory contains the API client infrastructure for the Plex Media Manager application.

## Components

### PlexClient (`plexClient.ts`)

The main HTTP client for communicating with Plex Media Server. Features:

- **Automatic Retry**: Exponential backoff for failed requests
- **Rate Limiting**: Configurable request rate limits
- **Request Deduplication**: Prevents duplicate identical requests
- **Error Classification**: Categorizes errors for appropriate handling
- **Token Management**: Handles authentication tokens

**Usage:**

```typescript
import { createPlexClient } from './api/plexClient';

const client = createPlexClient({
  baseURL: 'http://localhost:32400',
  token: 'your-auth-token',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  rateLimit: {
    maxRequests: 100,
    perMilliseconds: 60000,
  },
});

// Make requests
const data = await client.get('/library/sections');
```

### Request Batcher (`requestBatcher.ts`)

Groups multiple API requests together to reduce network overhead and improve performance.

#### Features

- **Automatic Batching**: Groups requests within a configurable time window
- **Configurable Parameters**: Adjust batch size and delay
- **Intelligent Grouping**: Batches similar requests together
- **Error Handling**: Gracefully handles individual and batch failures
- **Type-Safe**: Full TypeScript support with generics

#### Core Classes

##### `RequestBatcher<T>`

Generic request batcher that can batch any type of request.

```typescript
import { RequestBatcher } from './api/requestBatcher';

const batcher = new RequestBatcher<MyDataType>(
  async (requests) => {
    // Handle batch of requests
    const ids = requests.map(r => r.params.id);
    const results = await fetchMultiple(ids);
    
    return requests.map(request => ({
      id: request.id,
      data: results.get(request.params.id),
      error: results.has(request.params.id) 
        ? undefined 
        : new Error('Not found'),
    }));
  },
  {
    maxBatchSize: 50,    // Max requests per batch
    batchDelay: 50,      // Delay in ms before flushing
    enabled: true,       // Enable/disable batching
  }
);

// Use the batcher
const result = await batcher.request('unique-id', { id: 123 });
```

##### `MetadataBatcher`

Specialized batcher for metadata requests.

```typescript
import { MetadataBatcher } from './api/requestBatcher';

const metadataBatcher = new MetadataBatcher(
  async (ratingKeys: string[]) => {
    // Fetch multiple metadata items
    const results = new Map();
    await Promise.all(
      ratingKeys.map(async (key) => {
        const data = await fetchMetadata(key);
        results.set(key, data);
      })
    );
    return results;
  },
  { maxBatchSize: 50, batchDelay: 50 }
);

// Fetch metadata (automatically batched)
const metadata1 = metadataBatcher.getMetadata('123');
const metadata2 = metadataBatcher.getMetadata('456');
const metadata3 = metadataBatcher.getMetadata('789');

// All three requests are batched together
const results = await Promise.all([metadata1, metadata2, metadata3]);
```

##### `ImageBatcher`

Specialized batcher for image requests.

```typescript
import { ImageBatcher } from './api/requestBatcher';

const imageBatcher = new ImageBatcher(
  async (urls: string[]) => {
    const results = new Map();
    await Promise.all(
      urls.map(async (url) => {
        const blob = await fetch(url).then(r => r.blob());
        results.set(url, blob);
      })
    );
    return results;
  },
  { maxBatchSize: 20, batchDelay: 100 }
);

// Fetch images (automatically batched)
const image1 = imageBatcher.getImage('http://example.com/1.jpg');
const image2 = imageBatcher.getImage('http://example.com/2.jpg');

const [blob1, blob2] = await Promise.all([image1, image2]);
```

##### `createBatcher`

Factory function to create a batched version of any async function.

```typescript
import { createBatcher } from './api/requestBatcher';

// Original function that handles multiple items
async function fetchUsers(ids: number[]): Promise<User[]> {
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
  return response.json();
}

// Create batched version
const batchedFetchUser = createBatcher(
  fetchUsers,
  { maxBatchSize: 50, batchDelay: 50 }
);

// Use like a normal async function - batching happens automatically
const user1 = batchedFetchUser(1);
const user2 = batchedFetchUser(2);
const user3 = batchedFetchUser(3);

// All three calls are batched into a single fetchUsers([1, 2, 3]) call
const results = await Promise.all([user1, user2, user3]);
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxBatchSize` | number | 50 | Maximum number of requests to batch together |
| `batchDelay` | number | 50 | Delay in milliseconds before flushing the batch |
| `enabled` | boolean | true | Whether batching is enabled (useful for debugging) |

#### Methods

##### `request(id: string, params: any): Promise<T>`

Add a request to the batch queue. Returns a promise that resolves when the batch is processed.

##### `forceFlush(): Promise<void>`

Immediately flush the current batch without waiting for the timer.

##### `getQueueSize(): number`

Get the current number of requests in the queue.

##### `updateConfig(config: Partial<BatchConfig>): void`

Update the batcher configuration.

##### `clear(): void`

Clear the queue and reject all pending requests.

#### Usage Patterns

##### Pattern 1: Batching Metadata Fetches

When displaying a list of items, batch the metadata requests:

```typescript
const metadataBatcher = new MetadataBatcher(
  async (ratingKeys) => {
    // Fetch all metadata in parallel
    const results = new Map();
    await Promise.all(
      ratingKeys.map(async (key) => {
        const data = await plexClient.get(`/library/metadata/${key}`);
        results.set(key, data);
      })
    );
    return results;
  }
);

// In your component
const items = ['123', '456', '789', '101', '102'];
const metadataPromises = items.map(id => metadataBatcher.getMetadata(id));
const metadata = await Promise.all(metadataPromises);
```

##### Pattern 2: Batching with React Query

Integrate with React Query for automatic caching:

```typescript
import { useQuery } from '@tanstack/react-query';

const metadataBatcher = new MetadataBatcher(fetchMetadataBatch);

function useMetadata(ratingKey: string) {
  return useQuery({
    queryKey: ['metadata', ratingKey],
    queryFn: () => metadataBatcher.getMetadata(ratingKey),
    staleTime: 5 * 60 * 1000,
  });
}

// In your component - requests are automatically batched
function MediaList({ items }) {
  return items.map(item => <MediaCard key={item.id} ratingKey={item.id} />);
}

function MediaCard({ ratingKey }) {
  const { data } = useMetadata(ratingKey); // Batched automatically
  return <div>{data?.title}</div>;
}
```

##### Pattern 3: Conditional Batching

Disable batching for debugging or specific scenarios:

```typescript
const batcher = new RequestBatcher(handler, {
  enabled: process.env.NODE_ENV === 'production',
});

// Or update at runtime
if (debugMode) {
  batcher.updateConfig({ enabled: false });
}
```

##### Pattern 4: Manual Flush Control

Force flush for time-sensitive operations:

```typescript
const batcher = new MetadataBatcher(fetchBatch, {
  batchDelay: 1000, // Long delay for efficiency
});

// Queue requests
items.forEach(item => batcher.getMetadata(item.id));

// Force immediate flush when user takes action
await batcher.forceFlush();
```

#### Performance Considerations

1. **Batch Size**: Larger batches reduce network overhead but increase latency for individual requests
2. **Batch Delay**: Shorter delays reduce latency but may result in smaller batches
3. **Network Conditions**: Adjust parameters based on network speed and server capacity
4. **API Limits**: Respect server rate limits and maximum request sizes

**Recommended Settings:**

- **Fast Networks**: `maxBatchSize: 100, batchDelay: 25`
- **Slow Networks**: `maxBatchSize: 20, batchDelay: 100`
- **Rate-Limited APIs**: `maxBatchSize: 50, batchDelay: 50`

#### Error Handling

The batcher handles errors at both the batch and individual request level:

```typescript
const batcher = new MetadataBatcher(
  async (ratingKeys) => {
    const results = new Map();
    
    // Fetch each item, handling individual errors
    await Promise.all(
      ratingKeys.map(async (key) => {
        try {
          const data = await fetchMetadata(key);
          results.set(key, data);
        } catch (error) {
          // Individual item failed - don't add to results
          console.error(`Failed to fetch ${key}:`, error);
        }
      })
    );
    
    return results;
  }
);

// Individual request error handling
try {
  const metadata = await batcher.getMetadata('123');
} catch (error) {
  // Handle error for this specific request
  console.error('Metadata fetch failed:', error);
}
```

### Query Client (`queryClient.ts`)

React Query client configuration with optimized defaults for caching and refetching.

### Query Keys (`queryKeys.ts`)

Centralized query key factory for consistent cache management.

### WebSocket Client (`plexWebSocket.ts`)

Real-time event handling for Plex server notifications.

## Best Practices

1. **Use Request Batching**: Always use the request batcher for operations that fetch multiple items
2. **Configure Appropriately**: Adjust batch parameters based on your use case
3. **Handle Errors**: Implement proper error handling for both individual and batch failures
4. **Monitor Performance**: Track batch sizes and timing to optimize configuration
5. **Test Thoroughly**: Test with various batch sizes and error scenarios

## Testing

All API components include comprehensive unit tests. Run tests with:

```bash
npm test src/api/
```

## Integration Example

Complete example integrating all API components:

```typescript
import { createPlexClient } from './api/plexClient';
import { MetadataBatcher } from './api/requestBatcher';
import { queryClient } from './api/queryClient';

// Create Plex client
const plexClient = createPlexClient({
  baseURL: serverUrl,
  token: authToken,
});

// Create metadata batcher
const metadataBatcher = new MetadataBatcher(
  async (ratingKeys) => {
    const results = new Map();
    await Promise.all(
      ratingKeys.map(async (key) => {
        const data = await plexClient.get(`/library/metadata/${key}`);
        results.set(key, data);
      })
    );
    return results;
  },
  { maxBatchSize: 50, batchDelay: 50 }
);

// Use with React Query
function useMetadata(ratingKey: string) {
  return useQuery({
    queryKey: ['metadata', ratingKey],
    queryFn: () => metadataBatcher.getMetadata(ratingKey),
  });
}
```
