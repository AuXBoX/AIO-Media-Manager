# Request Deduplication

## Overview

The Request Deduplication utility prevents duplicate identical requests from being sent to the server. When multiple identical requests are made simultaneously, only one actual network request is executed and the result is shared with all callers.

## Features

- **Automatic Deduplication**: Detects and deduplicates identical simultaneous requests
- **Configurable Behavior**: Control which HTTP methods to deduplicate
- **TTL Support**: Automatically expire cached requests after a configurable time
- **Error Handling**: Propagates errors to all waiting callers
- **Statistics Tracking**: Monitor deduplication effectiveness
- **Header Handling**: Optionally include/exclude headers from deduplication key

## Usage

### Basic Usage

```typescript
import { RequestDeduplicator } from './requestDeduplicator';

const deduplicator = new RequestDeduplicator();

// Make a request
const requestKey = {
  method: 'GET',
  url: '/api/users',
  params: { page: 1 },
};

const result = await deduplicator.deduplicate(requestKey, async () => {
  const response = await fetch('/api/users?page=1');
  return response.json();
});
```

### With Custom Configuration

```typescript
const deduplicator = new RequestDeduplicator({
  enabled: true,
  ttl: 10000, // 10 seconds
  methods: ['GET', 'HEAD', 'OPTIONS'],
  ignoreHeaders: true,
});
```

### Integration with Axios

```typescript
import axios from 'axios';
import { RequestDeduplicator } from './requestDeduplicator';

const deduplicator = new RequestDeduplicator();

async function fetchUser(userId: string) {
  const requestKey = {
    method: 'GET',
    url: `/api/users/${userId}`,
  };

  return deduplicator.deduplicate(requestKey, async () => {
    const response = await axios.get(`/api/users/${userId}`);
    return response.data;
  });
}

// These will only make one actual HTTP request
const [user1, user2, user3] = await Promise.all([
  fetchUser('123'),
  fetchUser('123'),
  fetchUser('123'),
]);
```

## Configuration Options

### `enabled` (boolean)
- **Default**: `true`
- **Description**: Whether deduplication is enabled. When false, all requests are executed normally.

### `ttl` (number)
- **Default**: `5000` (5 seconds)
- **Description**: Maximum time in milliseconds to keep a request in the deduplication cache. After this time, a new request will be made even if identical.

### `methods` (string[])
- **Default**: `['GET', 'HEAD']`
- **Description**: HTTP methods to deduplicate. Only requests with these methods will be deduplicated.

### `ignoreHeaders` (boolean)
- **Default**: `true`
- **Description**: Whether to ignore headers when generating the deduplication key. When true, requests with different headers but same URL/params will be deduplicated.

## API Reference

### `deduplicate<T>(requestKey: RequestKey, requestFn: () => Promise<T>): Promise<T>`

Execute a request with deduplication.

**Parameters:**
- `requestKey`: Object containing method, url, params, data, and optionally headers
- `requestFn`: Function that executes the actual request

**Returns:** Promise that resolves with the request result

**Example:**
```typescript
const result = await deduplicator.deduplicate(
  { method: 'GET', url: '/api/data' },
  () => fetch('/api/data').then(r => r.json())
);
```

### `getStats(): DeduplicationStats`

Get current deduplication statistics.

**Returns:** Object containing:
- `totalRequests`: Total number of requests processed
- `deduplicatedRequests`: Number of requests that were deduplicated
- `uniqueRequests`: Number of unique requests executed
- `inFlightRequests`: Current number of in-flight requests
- `hitRate`: Deduplication hit rate (0-1)

**Example:**
```typescript
const stats = deduplicator.getStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
```

### `resetStats(): void`

Reset all statistics to zero.

### `clear(): void`

Clear all in-flight requests. All pending requests will be rejected with a cancellation error.

**Example:**
```typescript
// Cancel all pending requests
deduplicator.clear();
```

### `updateConfig(config: Partial<DeduplicationConfig>): void`

Update configuration at runtime.

**Example:**
```typescript
// Disable deduplication temporarily
deduplicator.updateConfig({ enabled: false });

// Re-enable with new TTL
deduplicator.updateConfig({ enabled: true, ttl: 15000 });
```

### `getConfig(): DeduplicationConfig`

Get current configuration.

### `getInFlightCount(): number`

Get the number of currently in-flight requests.

### `isInFlight(requestKey: RequestKey): boolean`

Check if a specific request is currently in flight.

## How It Works

### Request Key Generation

The deduplicator generates a unique key for each request based on:
1. HTTP method (uppercase)
2. URL
3. Query parameters (sorted for consistency)
4. Request body/data (sorted for consistency)
5. Headers (optional, based on `ignoreHeaders` config)

Example keys:
```
GET::/api/users::{"page":1}
POST::/api/users::{"name":"John","email":"john@example.com"}
```

### Deduplication Flow

1. Request comes in
2. Generate unique key from request parameters
3. Check if identical request is already in flight
4. If yes: Return existing promise
5. If no: Execute request and cache promise
6. When request completes: Remove from cache and resolve all waiting callers
7. If request fails: Remove from cache and reject all waiting callers

### TTL Expiration

Requests are automatically removed from the cache after the configured TTL. This prevents stale data and ensures fresh requests are made periodically.

## Performance Benefits

### Without Deduplication
```
Time: 0ms    100ms   200ms   300ms
Req1: |-------|
Req2:   |-------|
Req3:     |-------|
Total: 3 requests, ~300ms
```

### With Deduplication
```
Time: 0ms    100ms   200ms   300ms
Req1: |-------|
Req2: (deduplicated)
Req3: (deduplicated)
Total: 1 request, ~100ms
```

**Benefits:**
- Reduced server load
- Lower bandwidth usage
- Faster response times for duplicate requests
- Prevents race conditions

## Best Practices

### 1. Use for Read Operations

Deduplication is most effective for read operations (GET, HEAD) that are safe to cache temporarily.

```typescript
// Good: Read operations
const deduplicator = new RequestDeduplicator({
  methods: ['GET', 'HEAD'],
});
```

### 2. Be Careful with Write Operations

Avoid deduplicating write operations (POST, PUT, DELETE) unless you're certain they're idempotent.

```typescript
// Caution: Only if truly idempotent
const deduplicator = new RequestDeduplicator({
  methods: ['GET', 'POST'], // POST should be idempotent
});
```

### 3. Set Appropriate TTL

Choose a TTL based on how frequently your data changes:
- Fast-changing data: 1-5 seconds
- Moderate data: 5-30 seconds
- Slow-changing data: 30-60 seconds

```typescript
const deduplicator = new RequestDeduplicator({
  ttl: 10000, // 10 seconds for moderate data
});
```

### 4. Monitor Statistics

Regularly check deduplication statistics to ensure it's working effectively:

```typescript
setInterval(() => {
  const stats = deduplicator.getStats();
  console.log('Deduplication stats:', {
    hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
    saved: stats.deduplicatedRequests,
    total: stats.totalRequests,
  });
}, 60000); // Every minute
```

### 5. Handle Errors Gracefully

Errors are propagated to all waiting callers, so ensure proper error handling:

```typescript
try {
  const result = await deduplicator.deduplicate(requestKey, requestFn);
} catch (error) {
  // Handle error - all duplicate requests will receive this error
  console.error('Request failed:', error);
}
```

## Integration with Plex API Client

The request deduplicator can be integrated with the Plex API client to prevent duplicate requests:

```typescript
import { PlexClient } from './plexClient';
import { RequestDeduplicator } from './requestDeduplicator';

class EnhancedPlexClient extends PlexClient {
  private deduplicator = new RequestDeduplicator({
    ttl: 5000,
    methods: ['GET', 'HEAD'],
  });

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const requestKey = {
      method: 'GET',
      url,
      params: config?.params,
    };

    return this.deduplicator.deduplicate(requestKey, () =>
      super.get<T>(url, config)
    );
  }
}
```

## Troubleshooting

### Requests Not Being Deduplicated

**Possible causes:**
1. Deduplication is disabled: Check `getConfig().enabled`
2. Method not in allowed list: Check `getConfig().methods`
3. Requests have different parameters: Verify request keys are identical
4. TTL expired: Increase TTL if requests are too far apart

**Solution:**
```typescript
// Check configuration
console.log(deduplicator.getConfig());

// Check if request is in flight
console.log(deduplicator.isInFlight(requestKey));

// Check statistics
console.log(deduplicator.getStats());
```

### Memory Leaks

If you notice memory growing, ensure:
1. TTL is set appropriately (not too long)
2. Requests are completing (not hanging)
3. Clear cache when no longer needed

**Solution:**
```typescript
// Clear cache periodically
setInterval(() => {
  if (deduplicator.getInFlightCount() === 0) {
    deduplicator.clear();
  }
}, 300000); // Every 5 minutes
```

### Stale Data

If data seems stale, reduce the TTL:

```typescript
deduplicator.updateConfig({ ttl: 1000 }); // 1 second
```

## Testing

The request deduplicator includes comprehensive unit tests covering:
- Basic deduplication
- Error handling
- Configuration options
- Statistics tracking
- Utility methods
- Complex scenarios

Run tests:
```bash
npm test -- src/api/requestDeduplicator.test.ts
```

## License

Part of the Plex Media Manager project.
