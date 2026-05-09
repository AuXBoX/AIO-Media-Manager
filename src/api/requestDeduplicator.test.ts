import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RequestDeduplicator,
  createRequestDeduplicator,
  type RequestKey,
} from './requestDeduplicator';

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = new RequestDeduplicator();
  });

  afterEach(() => {
    deduplicator.clear();
  });

  describe('Basic Deduplication', () => {
    it('should deduplicate identical GET requests', async () => {
      let callCount = 0;
      const requestFn = vi.fn(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'test' };
      });

      const requestKey: RequestKey = {
        method: 'GET',
        url: '/api/test',
      };

      // Make 3 identical requests simultaneously
      const [result1, result2, result3] = await Promise.all([
        deduplicator.deduplicate(requestKey, requestFn),
        deduplicator.deduplicate(requestKey, requestFn),
        deduplicator.deduplicate(requestKey, requestFn),
      ]);

      // Should only call the function once
      expect(callCount).toBe(1);
      expect(requestFn).toHaveBeenCalledTimes(1);

      // All results should be the same
      expect(result1).toEqual({ data: 'test' });
      expect(result2).toEqual({ data: 'test' });
      expect(result3).toEqual({ data: 'test' });
    });

    it('should not deduplicate requests with different URLs', async () => {
      let callCount = 0;
      const requestFn = vi.fn(async () => {
        callCount++;
        return { data: 'test' };
      });

      const requestKey1: RequestKey = {
        method: 'GET',
        url: '/api/test1',
      };

      const requestKey2: RequestKey = {
        method: 'GET',
        url: '/api/test2',
      };

      await Promise.all([
        deduplicator.deduplicate(requestKey1, requestFn),
        deduplicator.deduplicate(requestKey2, requestFn),
      ]);

      expect(callCount).toBe(2);
      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('should not deduplicate requests with different parameters', async () => {
      let callCount = 0;
      const requestFn = vi.fn(async () => {
        callCount++;
        return { data: 'test' };
      });

      const requestKey1: RequestKey = {
        method: 'GET',
        url: '/api/test',
        params: { id: 1 },
      };

      const requestKey2: RequestKey = {
        method: 'GET',
        url: '/api/test',
        params: { id: 2 },
      };

      await Promise.all([
        deduplicator.deduplicate(requestKey1, requestFn),
        deduplicator.deduplicate(requestKey2, requestFn),
      ]);

      expect(callCount).toBe(2);
      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate requests with same parameters in different order', async () => {
      let callCount = 0;
      const requestFn = vi.fn(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'test' };
      });

      const requestKey1: RequestKey = {
        method: 'GET',
        url: '/api/test',
        params: { id: 1, name: 'test' },
      };

      const requestKey2: RequestKey = {
        method: 'GET',
        url: '/api/test',
        params: { name: 'test', id: 1 },
      };

      await Promise.all([
        deduplicator.deduplicate(requestKey1, requestFn),
        deduplicator.deduplicate(requestKey2, requestFn),
      ]);

      expect(callCount).toBe(1);
      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors to all waiting callers', async () => {
      const error = new Error('Request failed');
      const requestFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        throw error;
      });

      const requestKey: RequestKey = {
        method: 'GET',
        url: '/api/test',
      };

      // Make 3 identical requests simultaneously
      const promises = [
        deduplicator.deduplicate(requestKey, requestFn),
        deduplicator.deduplicate(requestKey, requestFn),
        deduplicator.deduplicate(requestKey, requestFn),
      ];

      // All should reject with the same error
      await expect(promises[0]).rejects.toThrow('Request failed');
      await expect(promises[1]).rejects.toThrow('Request failed');
      await expect(promises[2]).rejects.toThrow('Request failed');

      // Should only call the function once
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should allow retry after error', async () => {
      let callCount = 0;
      const requestFn = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First attempt failed');
        }
        return { data: 'success' };
      });

      const requestKey: RequestKey = {
        method: 'GET',
        url: '/api/test',
      };

      // First attempt should fail
      try {
        await deduplicator.deduplicate(requestKey, requestFn);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('First attempt failed');
      }

      // Second attempt should succeed
      const result = await deduplicator.deduplicate(requestKey, requestFn);
      expect(result).toEqual({ data: 'success' });
      expect(callCount).toBe(2);
    });
  });

  describe('Configuration', () => {
    it('should respect enabled flag', async () => {
      const dedup = new RequestDeduplicator({ enabled: false });
      let callCount = 0;
      const requestFn = vi.fn(async () => {
        callCount++;
        return { data: 'test' };
      });

      const requestKey: RequestKey = {
        method: 'GET',
        url: '/api/test',
      };

      await Promise.all([
        dedup.deduplicate(requestKey, requestFn),
        dedup.deduplicate(requestKey, requestFn),
        dedup.deduplicate(requestKey, requestFn),
      ]);

      // Should call function 3 times (no deduplication)
      expect(callCount).toBe(3);
      expect(requestFn).toHaveBeenCalledTimes(3);
    });

    it('should only deduplicate configured methods', async () => {
      const dedup = new RequestDeduplicator({ methods: ['GET'] });
      let getCount = 0;
      let postCount = 0;

      const getRequestFn = vi.fn(async () => {
        getCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'get' };
      });

      const postRequestFn = vi.fn(async () => {
        postCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'post' };
      });

      const getKey: RequestKey = {
        method: 'GET',
        url: '/api/test',
      };

      const postKey: RequestKey = {
        method: 'POST',
        url: '/api/test',
        data: { value: 'test' },
      };

      await Promise.all([
        dedup.deduplicate(getKey, getRequestFn),
        dedup.deduplicate(getKey, getRequestFn),
        dedup.deduplicate(postKey, postRequestFn),
        dedup.deduplicate(postKey, postRequestFn),
      ]);

      // GET should be deduplicated
      expect(getCount).toBe(1);
      // POST should not be deduplicated
      expect(postCount).toBe(2);
    });

    it('should respect TTL configuration', async () => {
      const dedup = new RequestDeduplicator({ ttl: 100 });
      let callCount = 0;
      const requestFn = vi.fn(async () => {
        callCount++;
        return { data: 'test' };
      });

      const requestKey: RequestKey = {
        method: 'GET',
        url: '/api/test',
      };

      // First request
      await dedup.deduplicate(requestKey, requestFn);
      expect(callCount).toBe(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Second request should not be deduplicated
      await dedup.deduplicate(requestKey, requestFn);
      expect(callCount).toBe(2);
    });

    it('should handle header deduplication based on config', async () => {
      const dedupIgnoreHeaders = new RequestDeduplicator({
        ignoreHeaders: true,
      });
      const dedupIncludeHeaders = new RequestDeduplicator({
        ignoreHeaders: false,
      });

      let callCount1 = 0;
      let callCount2 = 0;

      const requestFn1 = vi.fn(async () => {
        callCount1++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'test' };
      });

      const requestFn2 = vi.fn(async () => {
        callCount2++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'test' };
      });

      const requestKey1: RequestKey = {
        method: 'GET',
        url: '/api/test',
        headers: { 'X-Custom': 'value1' },
      };

      const requestKey2: RequestKey = {
        method: 'GET',
        url: '/api/test',
        headers: { 'X-Custom': 'value2' },
      };

      // With ignoreHeaders: true, should deduplicate
      await Promise.all([
        dedupIgnoreHeaders.deduplicate(requestKey1, requestFn1),
        dedupIgnoreHeaders.deduplicate(requestKey2, requestFn1),
      ]);
      expect(callCount1).toBe(1);

      // With ignoreHeaders: false, should not deduplicate
      await Promise.all([
        dedupIncludeHeaders.deduplicate(requestKey1, requestFn2),
        dedupIncludeHeaders.deduplicate(requestKey2, requestFn2),
      ]);
      expect(callCount2).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should track deduplication statistics', async () => {
      let callCount = 0;
      const requestFn = vi.fn(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'test' };
      });

      const requestKey: RequestKey = {
        method: 'GET',
        url: '/api/test',
      };

      // Make 5 identical requests
      await Promise.all([
        deduplicator.deduplicate(requestKey, requestFn),
        deduplicator.deduplicate(requestKey, requestFn),
        deduplicator.deduplicate(requestKey, requestFn),
        deduplicator.deduplicate(requestKey, requestFn),
        deduplicator.deduplicate(requestKey, requestFn),
      ]);

      const stats = deduplicator.getStats();
      expect(stats.totalRequests).toBe(5);
      expect(stats.uniqueRequests).toBe(1);
      expect(stats.deduplicatedRequests).toBe(4);
      expect(stats.hitRate).toBe(0.8); // 4/5
      expect(stats.inFlightRequests).toBe(0);
    });

    it('should reset statistics', async () => {
      const requestFn = vi.fn(async () => ({ data: 'test' }));
      const requestKey: RequestKey = {
        method: 'GET',
        url: '/api/test',
      };

      await deduplicator.deduplicate(requestKey, requestFn);

      let stats = deduplicator.getStats();
      expect(stats.totalRequests).toBe(1);

      deduplicator.resetStats();

      stats = deduplicator.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.uniqueRequests).toBe(0);
      expect(stats.deduplicatedRequests).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    it('should check if request is in flight', async () => {
      const requestFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { data: 'test' };
      });

      const requestKey: RequestKey = {
        method: 'GET',
        url: '/api/test',
      };

      expect(deduplicator.isInFlight(requestKey)).toBe(false);

      const promise = deduplicator.deduplicate(requestKey, requestFn);
      expect(deduplicator.isInFlight(requestKey)).toBe(true);

      await promise;
      expect(deduplicator.isInFlight(requestKey)).toBe(false);
    });

    it('should get in-flight count', async () => {
      const requestFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { data: 'test' };
      });

      expect(deduplicator.getInFlightCount()).toBe(0);

      const promise1 = deduplicator.deduplicate(
        { method: 'GET', url: '/api/test1' },
        requestFn
      );
      expect(deduplicator.getInFlightCount()).toBe(1);

      const promise2 = deduplicator.deduplicate(
        { method: 'GET', url: '/api/test2' },
        requestFn
      );
      expect(deduplicator.getInFlightCount()).toBe(2);

      await Promise.all([promise1, promise2]);
      expect(deduplicator.getInFlightCount()).toBe(0);
    });

    it('should clear all in-flight requests', async () => {
      // Start a request but don't await it
      const requestFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { data: 'test' };
      });

      const requestKey: RequestKey = {
        method: 'GET',
        url: '/api/test',
      };

      // Start request without awaiting
      const promise = deduplicator.deduplicate(requestKey, requestFn).catch(() => {
        // Catch to prevent unhandled rejection
      });
      
      // Wait a bit to ensure it's in flight
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(deduplicator.getInFlightCount()).toBe(1);

      // Clear
      deduplicator.clear();
      expect(deduplicator.getInFlightCount()).toBe(0);

      // Wait for promise to settle
      await promise;
    });

    it('should update configuration', () => {
      const initialConfig = deduplicator.getConfig();
      expect(initialConfig.enabled).toBe(true);
      expect(initialConfig.ttl).toBe(5000);

      deduplicator.updateConfig({ enabled: false, ttl: 10000 });

      const updatedConfig = deduplicator.getConfig();
      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.ttl).toBe(10000);
    });
  });

  describe('Factory Function', () => {
    it('should create deduplicator with default config', () => {
      const dedup = createRequestDeduplicator();
      const config = dedup.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.ttl).toBe(5000);
      expect(config.methods).toEqual(['GET', 'HEAD']);
      expect(config.ignoreHeaders).toBe(true);
    });

    it('should create deduplicator with custom config', () => {
      const dedup = createRequestDeduplicator({
        enabled: false,
        ttl: 10000,
        methods: ['GET', 'POST'],
        ignoreHeaders: false,
      });
      const config = dedup.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.ttl).toBe(10000);
      expect(config.methods).toEqual(['GET', 'POST']);
      expect(config.ignoreHeaders).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle nested object parameters', async () => {
      let callCount = 0;
      const requestFn = vi.fn(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'test' };
      });

      const requestKey1: RequestKey = {
        method: 'GET',
        url: '/api/test',
        params: {
          filter: { name: 'test', age: 25 },
          sort: ['name', 'age'],
        },
      };

      const requestKey2: RequestKey = {
        method: 'GET',
        url: '/api/test',
        params: {
          sort: ['name', 'age'],
          filter: { age: 25, name: 'test' },
        },
      };

      await Promise.all([
        deduplicator.deduplicate(requestKey1, requestFn),
        deduplicator.deduplicate(requestKey2, requestFn),
      ]);

      // Should deduplicate despite different key order
      expect(callCount).toBe(1);
    });

    it('should handle POST requests with data', async () => {
      const dedup = new RequestDeduplicator({ methods: ['POST'] });
      let callCount = 0;
      const requestFn = vi.fn(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'created' };
      });

      const requestKey: RequestKey = {
        method: 'POST',
        url: '/api/test',
        data: { name: 'test', value: 123 },
      };

      await Promise.all([
        dedup.deduplicate(requestKey, requestFn),
        dedup.deduplicate(requestKey, requestFn),
        dedup.deduplicate(requestKey, requestFn),
      ]);

      expect(callCount).toBe(1);
    });

    it('should handle sequential requests correctly', async () => {
      let callCount = 0;
      const requestFn = vi.fn(async () => {
        callCount++;
        return { data: 'test', count: callCount };
      });

      const requestKey: RequestKey = {
        method: 'GET',
        url: '/api/test',
      };

      // First request
      const result1 = await deduplicator.deduplicate(requestKey, requestFn);
      expect(result1.count).toBe(1);

      // Second request (after first completes)
      const result2 = await deduplicator.deduplicate(requestKey, requestFn);
      expect(result2.count).toBe(2);

      // Should not deduplicate sequential requests
      expect(callCount).toBe(2);
    });
  });
});
