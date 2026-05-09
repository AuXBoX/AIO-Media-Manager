import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBatchedPlexClient } from './batchedPlexClient';

describe('BatchedPlexClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Factory Function', () => {
    it('should create a batched client', () => {
      const client = createBatchedPlexClient({
        baseURL: 'http://localhost:32400',
        token: 'test-token',
      });

      expect(client).toBeDefined();
      expect(typeof client.getMetadata).toBe('function');
      expect(typeof client.getImage).toBe('function');
    });

    it('should create a client with custom batching config', () => {
      const client = createBatchedPlexClient({
        baseURL: 'http://localhost:32400',
        token: 'test-token',
        batching: {
          metadata: { maxBatchSize: 100, batchDelay: 25 },
          images: { maxBatchSize: 50, batchDelay: 50 },
        },
      });

      expect(client).toBeDefined();
    });

    it('should report batching statistics', () => {
      const client = createBatchedPlexClient({
        baseURL: 'http://localhost:32400',
        token: 'test-token',
      });

      const stats = client.getBatchingStats();

      expect(stats).toHaveProperty('metadata');
      expect(stats).toHaveProperty('images');
      expect(stats.metadata).toHaveProperty('queueSize');
      expect(stats.images).toHaveProperty('queueSize');
    });

    it('should update batching configuration', () => {
      const client = createBatchedPlexClient({
        baseURL: 'http://localhost:32400',
        token: 'test-token',
      });

      // Should not throw
      expect(() => {
        client.updateBatchingConfig({
          metadata: { maxBatchSize: 100 },
          images: { batchDelay: 200 },
        });
      }).not.toThrow();
    });
  });
});
