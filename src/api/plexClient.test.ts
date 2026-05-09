import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { PlexClient, PlexApiError, ErrorCategory, createPlexClient } from './plexClient';

describe('PlexClient', () => {
  let client: PlexClient;
  let mock: MockAdapter;

  beforeEach(() => {
    client = new PlexClient({
      baseURL: 'https://test.plex.tv',
      token: 'test-token',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 100,
      rateLimit: {
        maxRequests: 5,
        perMilliseconds: 1000,
      },
    });

    // Create mock adapter for the internal axios instance
    mock = new MockAdapter((client as any).client);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Initialization', () => {
    it('should create client with correct configuration', () => {
      const config = client.getConfig();
      
      expect(config.baseURL).toBe('https://test.plex.tv');
      expect(config.token).toBe('test-token');
      expect(config.timeout).toBe(5000);
      expect(config.maxRetries).toBe(2);
    });

    it('should set default headers', () => {
      const internalClient = (client as any).client;
      
      expect(internalClient.defaults.headers['X-Plex-Token']).toBe('test-token');
      expect(internalClient.defaults.headers['X-Plex-Product']).toBe('AIO Media Manager');
      expect(internalClient.defaults.headers['Accept']).toBe('application/json');
    });

    it('should create client using factory function', () => {
      const factoryClient = createPlexClient({
        baseURL: 'https://test.plex.tv',
        token: 'test-token',
      });
      
      expect(factoryClient).toBeInstanceOf(PlexClient);
    });
  });

  describe('GET Requests', () => {
    it('should make successful GET request', async () => {
      const responseData = { data: 'test' };
      mock.onGet('/test').reply(200, responseData);

      const result = await client.get('/test');
      
      expect(result).toEqual(responseData);
    });

    it('should pass query parameters', async () => {
      mock.onGet('/test', { params: { foo: 'bar' } }).reply(200, { success: true });

      const result = await client.get('/test', { params: { foo: 'bar' } });
      
      expect(result).toEqual({ success: true });
    });

    it('should deduplicate identical GET requests', async () => {
      let requestCount = 0;
      mock.onGet('/test').reply(() => {
        requestCount++;
        return [200, { count: requestCount }];
      });

      // Make two identical requests simultaneously
      const [result1, result2] = await Promise.all([
        client.get('/test'),
        client.get('/test'),
      ]);

      // Should only make one actual request
      expect(requestCount).toBe(1);
      expect(result1).toEqual(result2);
    });
  });

  describe('POST Requests', () => {
    it('should make successful POST request', async () => {
      const postData = { name: 'test' };
      const responseData = { id: 1, ...postData };
      
      mock.onPost('/test', postData).reply(201, responseData);

      const result = await client.post('/test', postData);
      
      expect(result).toEqual(responseData);
    });
  });

  describe('PUT Requests', () => {
    it('should make successful PUT request', async () => {
      const putData = { name: 'updated' };
      const responseData = { id: 1, ...putData };
      
      mock.onPut('/test/1', putData).reply(200, responseData);

      const result = await client.put('/test/1', putData);
      
      expect(result).toEqual(responseData);
    });
  });

  describe('DELETE Requests', () => {
    it('should make successful DELETE request', async () => {
      mock.onDelete('/test/1').reply(204);

      const result = await client.delete('/test/1');
      
      expect(result).toBeUndefined();
    });
  });

  describe('Error Classification', () => {
    it('should classify 401 as authentication error', async () => {
      mock.onGet('/test').reply(401);

      await expect(client.get('/test')).rejects.toThrow(PlexApiError);
      
      try {
        await client.get('/test');
      } catch (error) {
        expect((error as PlexApiError).category).toBe(ErrorCategory.AUTHENTICATION);
        expect((error as PlexApiError).statusCode).toBe(401);
      }
    });

    it('should classify 403 as authorization error', async () => {
      mock.onGet('/test').reply(403);

      try {
        await client.get('/test');
      } catch (error) {
        expect((error as PlexApiError).category).toBe(ErrorCategory.AUTHORIZATION);
      }
    });

    it('should classify 404 as not found error', async () => {
      mock.onGet('/test').reply(404);

      try {
        await client.get('/test');
      } catch (error) {
        expect((error as PlexApiError).category).toBe(ErrorCategory.NOT_FOUND);
      }
    });

    it('should classify 429 as rate limit error', async () => {
      mock.onGet('/test').reply(429);

      try {
        await client.get('/test');
      } catch (error) {
        expect((error as PlexApiError).category).toBe(ErrorCategory.RATE_LIMIT);
      }
    });

    it('should classify 500 as server error', async () => {
      mock.onGet('/test').reply(500);

      try {
        await client.get('/test');
      } catch (error) {
        expect((error as PlexApiError).category).toBe(ErrorCategory.SERVER_ERROR);
      }
    });

    it('should classify network error', async () => {
      mock.onGet('/test').networkError();

      try {
        await client.get('/test');
      } catch (error) {
        expect((error as PlexApiError).category).toBe(ErrorCategory.NETWORK);
      }
    });

    it('should classify timeout error', async () => {
      mock.onGet('/test').timeout();

      try {
        await client.get('/test');
      } catch (error) {
        expect((error as PlexApiError).category).toBe(ErrorCategory.TIMEOUT);
      }
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network error', async () => {
      let attempts = 0;
      mock.onGet('/test').reply(() => {
        attempts++;
        if (attempts < 3) {
          return [500, {}]; // Server error
        }
        return [200, { success: true }];
      });

      const result = await client.get('/test');
      
      expect(attempts).toBe(3);
      expect(result).toEqual({ success: true });
    });

    it('should not retry on authentication error', async () => {
      let attempts = 0;
      mock.onGet('/test').reply(() => {
        attempts++;
        return [401, {}];
      });

      await expect(client.get('/test')).rejects.toThrow();
      
      // Should only attempt once (no retries for auth errors)
      expect(attempts).toBe(1);
    });

    it('should respect max retries', async () => {
      let attempts = 0;
      mock.onGet('/test').reply(() => {
        attempts++;
        return [500, {}]; // Always fail
      });

      await expect(client.get('/test')).rejects.toThrow();
      
      // Should attempt: 1 initial + 2 retries = 3 total
      expect(attempts).toBe(3);
    });

    it('should use exponential backoff', async () => {
      const timestamps: number[] = [];
      
      mock.onGet('/test').reply(() => {
        timestamps.push(Date.now());
        return [500, {}];
      });

      await expect(client.get('/test')).rejects.toThrow();
      
      // Check that delays increase exponentially
      if (timestamps.length >= 3) {
        const delay1 = timestamps[1]! - timestamps[0]!;
        const delay2 = timestamps[2]! - timestamps[1]!;
        
        // Second delay should be roughly 2x the first delay
        expect(delay2).toBeGreaterThan(delay1 * 1.5);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should track request timestamps', async () => {
      mock.onGet('/test').reply(200, { success: true });

      // Make multiple requests
      await client.get('/test');
      await client.get('/test');
      await client.get('/test');
      
      // Check that rate limit queue is being populated
      const rateLimitQueue = (client as any).rateLimitQueue;
      expect(rateLimitQueue.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Updates', () => {
    it('should update token', () => {
      client.updateToken('new-token');
      
      const config = client.getConfig();
      expect(config.token).toBe('new-token');
      
      const internalClient = (client as any).client;
      expect(internalClient.defaults.headers['X-Plex-Token']).toBe('new-token');
    });

    it('should update base URL', () => {
      client.updateBaseURL('https://new.plex.tv');
      
      const config = client.getConfig();
      expect(config.baseURL).toBe('https://new.plex.tv');
      
      const internalClient = (client as any).client;
      expect(internalClient.defaults.baseURL).toBe('https://new.plex.tv');
    });
  });

  describe('Request Deduplication', () => {
    it('should not deduplicate requests with different parameters', async () => {
      let requestCount = 0;
      mock.onGet('/test').reply(() => {
        requestCount++;
        return [200, { count: requestCount }];
      });

      // Make two requests with different parameters
      const [result1, result2] = await Promise.all([
        client.get('/test', { params: { id: 1 } }),
        client.get('/test', { params: { id: 2 } }),
      ]);

      // Should make two separate requests
      expect(requestCount).toBe(2);
      expect(result1).not.toEqual(result2);
    });

    it('should deduplicate only GET requests', async () => {
      let getCount = 0;
      let postCount = 0;
      
      mock.onGet('/test').reply(() => {
        getCount++;
        return [200, { count: getCount }];
      });
      
      mock.onPost('/test').reply(() => {
        postCount++;
        return [200, { count: postCount }];
      });

      // Make identical GET requests
      await Promise.all([
        client.get('/test'),
        client.get('/test'),
      ]);

      // Make identical POST requests
      await Promise.all([
        client.post('/test', { data: 'test' }),
        client.post('/test', { data: 'test' }),
      ]);

      // GET should be deduplicated
      expect(getCount).toBe(1);
      
      // POST should not be deduplicated
      expect(postCount).toBe(2);
    });
  });
});
