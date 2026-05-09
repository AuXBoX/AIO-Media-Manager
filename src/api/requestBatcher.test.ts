import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RequestBatcher,
  MetadataBatcher,
  ImageBatcher,
  createBatcher,
  type BatchRequest,
} from './requestBatcher';

describe('RequestBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Batching', () => {
    it('should batch multiple requests together', async () => {
      const handler = vi.fn(async (requests: BatchRequest[]) => {
        return requests.map((req) => ({
          id: req.id,
          data: `result-${req.params.value}`,
        }));
      });

      const batcher = new RequestBatcher(handler, { batchDelay: 50 });

      const promise1 = batcher.request('req1', { value: 1 });
      const promise2 = batcher.request('req2', { value: 2 });
      const promise3 = batcher.request('req3', { value: 3 });

      // Advance timers to trigger batch flush
      await vi.advanceTimersByTimeAsync(50);

      const results = await Promise.all([promise1, promise2, promise3]);

      expect(results).toEqual(['result-1', 'result-2', 'result-3']);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'req1', params: { value: 1 } }),
          expect.objectContaining({ id: 'req2', params: { value: 2 } }),
          expect.objectContaining({ id: 'req3', params: { value: 3 } }),
        ])
      );
    });

    it('should flush immediately when max batch size is reached', async () => {
      const handler = vi.fn(async (requests: BatchRequest[]) => {
        return requests.map((req) => ({
          id: req.id,
          data: `result-${req.params.value}`,
        }));
      });

      const batcher = new RequestBatcher(handler, {
        maxBatchSize: 2,
        batchDelay: 100,
      });

      const promise1 = batcher.request('req1', { value: 1 });
      const promise2 = batcher.request('req2', { value: 2 });

      // Should flush immediately without waiting for timer
      const results = await Promise.all([promise1, promise2]);

      expect(results).toEqual(['result-1', 'result-2']);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle empty batches gracefully', async () => {
      const handler = vi.fn(async () => []);
      const batcher = new RequestBatcher(handler, { batchDelay: 50 });

      // Force flush with empty queue
      await batcher.forceFlush();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should reject individual requests on error', async () => {
      const handler = vi.fn(async (requests: BatchRequest[]) => {
        return requests.map((req) => ({
          id: req.id,
          error: new Error(`Error for ${req.id}`),
        }));
      });

      const batcher = new RequestBatcher(handler, { batchDelay: 50 });

      const promise = batcher.request('req1', { value: 1 });

      await vi.advanceTimersByTimeAsync(50);

      await expect(promise).rejects.toThrow('Error for req1');
    });

    it('should reject all requests if batch handler throws', async () => {
      const handler = vi.fn(async () => {
        throw new Error('Batch handler failed');
      });

      const batcher = new RequestBatcher(handler, { batchDelay: 50 });

      const promise1 = batcher.request('req1', { value: 1 });
      const promise2 = batcher.request('req2', { value: 2 });

      await vi.advanceTimersByTimeAsync(50);

      await expect(promise1).rejects.toThrow('Batch handler failed');
      await expect(promise2).rejects.toThrow('Batch handler failed');
    });

    it('should reject requests with no result', async () => {
      const handler = vi.fn(async (requests: BatchRequest[]) => {
        // Only return result for first request
        return [
          {
            id: requests[0]!.id,
            data: 'result',
          },
        ];
      });

      const batcher = new RequestBatcher(handler, { batchDelay: 50 });

      const promise1 = batcher.request('req1', { value: 1 });
      const promise2 = batcher.request('req2', { value: 2 });

      await vi.advanceTimersByTimeAsync(50);

      await expect(promise1).resolves.toBe('result');
      await expect(promise2).rejects.toThrow('No result returned for request');
    });
  });

  describe('Configuration', () => {
    it('should respect custom batch delay', async () => {
      const handler = vi.fn(async (requests: BatchRequest[]) => {
        return requests.map((req) => ({ id: req.id, data: 'result' }));
      });

      const batcher = new RequestBatcher(handler, { batchDelay: 100 });

      batcher.request('req1', { value: 1 });

      // Should not flush yet
      await vi.advanceTimersByTimeAsync(50);
      expect(handler).not.toHaveBeenCalled();

      // Should flush now
      await vi.advanceTimersByTimeAsync(50);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should respect custom max batch size', async () => {
      const handler = vi.fn(async (requests: BatchRequest[]) => {
        return requests.map((req) => ({ id: req.id, data: 'result' }));
      });

      const batcher = new RequestBatcher(handler, {
        maxBatchSize: 3,
        batchDelay: 100,
      });

      batcher.request('req1', { value: 1 });
      batcher.request('req2', { value: 2 });

      // Should not flush yet (only 2 requests)
      expect(handler).not.toHaveBeenCalled();

      batcher.request('req3', { value: 3 });

      // Should flush immediately (reached max size)
      await Promise.resolve();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should allow disabling batching', async () => {
      const handler = vi.fn(async (requests: BatchRequest[]) => {
        return requests.map((req) => ({ id: req.id, data: 'result' }));
      });

      const batcher = new RequestBatcher(handler, { enabled: false });

      const result = await batcher.request('req1', { value: 1 });

      expect(result).toBe('result');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'req1' }),
      ]);
    });

    it('should allow updating configuration', async () => {
      const handler = vi.fn(async (requests: BatchRequest[]) => {
        return requests.map((req) => ({ id: req.id, data: 'result' }));
      });

      const batcher = new RequestBatcher(handler, { maxBatchSize: 10 });

      batcher.updateConfig({ maxBatchSize: 2 });

      batcher.request('req1', { value: 1 });
      batcher.request('req2', { value: 2 });

      // Should flush immediately with new max size
      await Promise.resolve();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Queue Management', () => {
    it('should report queue size', () => {
      const handler = vi.fn(async () => []);
      const batcher = new RequestBatcher(handler, { batchDelay: 100 });

      expect(batcher.getQueueSize()).toBe(0);

      batcher.request('req1', { value: 1 });
      expect(batcher.getQueueSize()).toBe(1);

      batcher.request('req2', { value: 2 });
      expect(batcher.getQueueSize()).toBe(2);
    });

    it('should clear queue', async () => {
      const handler = vi.fn(async () => []);
      const batcher = new RequestBatcher(handler, { batchDelay: 100 });

      const promise1 = batcher.request('req1', { value: 1 });
      const promise2 = batcher.request('req2', { value: 2 });

      batcher.clear();

      expect(batcher.getQueueSize()).toBe(0);
      await expect(promise1).rejects.toThrow('Batch queue cleared');
      await expect(promise2).rejects.toThrow('Batch queue cleared');
    });

    it('should force flush', async () => {
      const handler = vi.fn(async (requests: BatchRequest[]) => {
        return requests.map((req) => ({ id: req.id, data: 'result' }));
      });

      const batcher = new RequestBatcher(handler, { batchDelay: 100 });

      const promise = batcher.request('req1', { value: 1 });

      // Force flush without waiting for timer
      await batcher.forceFlush();

      const result = await promise;
      expect(result).toBe('result');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

describe('MetadataBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should batch metadata requests', async () => {
    const fetchFunction = vi.fn(async (ratingKeys: string[]) => {
      const results = new Map<string, any>();
      ratingKeys.forEach((key) => {
        results.set(key, { ratingKey: key, title: `Title ${key}` });
      });
      return results;
    });

    const batcher = new MetadataBatcher(fetchFunction, { batchDelay: 50 });

    const promise1 = batcher.getMetadata('123');
    const promise2 = batcher.getMetadata('456');
    const promise3 = batcher.getMetadata('789');

    await vi.advanceTimersByTimeAsync(50);

    const results = await Promise.all([promise1, promise2, promise3]);

    expect(results).toEqual([
      { ratingKey: '123', title: 'Title 123' },
      { ratingKey: '456', title: 'Title 456' },
      { ratingKey: '789', title: 'Title 789' },
    ]);

    expect(fetchFunction).toHaveBeenCalledTimes(1);
    expect(fetchFunction).toHaveBeenCalledWith(['123', '456', '789']);
  });

  it('should handle missing metadata', async () => {
    const fetchFunction = vi.fn(async (ratingKeys: string[]) => {
      const results = new Map<string, any>();
      // Only return data for first key
      results.set(ratingKeys[0]!, { ratingKey: ratingKeys[0], title: 'Title' });
      return results;
    });

    const batcher = new MetadataBatcher(fetchFunction, { batchDelay: 50 });

    const promise1 = batcher.getMetadata('123');
    const promise2 = batcher.getMetadata('456');

    await vi.advanceTimersByTimeAsync(50);

    await expect(promise1).resolves.toEqual({ ratingKey: '123', title: 'Title' });
    await expect(promise2).rejects.toThrow('No data found for ratingKey: 456');
  });

  it('should handle fetch errors', async () => {
    const fetchFunction = vi.fn(async () => {
      throw new Error('Network error');
    });

    const batcher = new MetadataBatcher(fetchFunction, { batchDelay: 50 });

    const promise = batcher.getMetadata('123');

    await vi.advanceTimersByTimeAsync(50);

    await expect(promise).rejects.toThrow('Network error');
  });
});

describe('ImageBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should batch image requests', async () => {
    const fetchFunction = vi.fn(async (urls: string[]) => {
      const results = new Map<string, Blob>();
      urls.forEach((url) => {
        results.set(url, new Blob([`data-${url}`]));
      });
      return results;
    });

    const batcher = new ImageBatcher(fetchFunction, { batchDelay: 50 });

    const promise1 = batcher.getImage('http://example.com/1.jpg');
    const promise2 = batcher.getImage('http://example.com/2.jpg');

    await vi.advanceTimersByTimeAsync(50);

    const results = await Promise.all([promise1, promise2]);

    expect(results).toHaveLength(2);
    expect(results[0]).toBeInstanceOf(Blob);
    expect(results[1]).toBeInstanceOf(Blob);

    expect(fetchFunction).toHaveBeenCalledTimes(1);
    expect(fetchFunction).toHaveBeenCalledWith([
      'http://example.com/1.jpg',
      'http://example.com/2.jpg',
    ]);
  });

  it('should handle missing images', async () => {
    const fetchFunction = vi.fn(async (urls: string[]) => {
      const results = new Map<string, Blob>();
      // Only return data for first URL
      results.set(urls[0]!, new Blob(['data']));
      return results;
    });

    const batcher = new ImageBatcher(fetchFunction, { batchDelay: 50 });

    const promise1 = batcher.getImage('http://example.com/1.jpg');
    const promise2 = batcher.getImage('http://example.com/2.jpg');

    await vi.advanceTimersByTimeAsync(50);

    await expect(promise1).resolves.toBeInstanceOf(Blob);
    await expect(promise2).rejects.toThrow(
      'No data found for URL: http://example.com/2.jpg'
    );
  });
});

describe('createBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a batched function', async () => {
    const batchHandler = vi.fn(async (params: Array<{ id: number }>) => {
      return params.map((p) => ({ id: p.id, value: p.id * 2 }));
    });

    const batchedFn = createBatcher(batchHandler, { batchDelay: 50 });

    const promise1 = batchedFn({ id: 1 });
    const promise2 = batchedFn({ id: 2 });
    const promise3 = batchedFn({ id: 3 });

    await vi.advanceTimersByTimeAsync(50);

    const results = await Promise.all([promise1, promise2, promise3]);

    expect(results).toEqual([
      { id: 1, value: 2 },
      { id: 2, value: 4 },
      { id: 3, value: 6 },
    ]);

    expect(batchHandler).toHaveBeenCalledTimes(1);
    expect(batchHandler).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('should handle errors in batched function', async () => {
    const batchHandler = vi.fn(async () => {
      throw new Error('Batch failed');
    });

    const batchedFn = createBatcher(batchHandler, { batchDelay: 50 });

    const promise = batchedFn({ id: 1 });

    await vi.advanceTimersByTimeAsync(50);

    await expect(promise).rejects.toThrow('Batch failed');
  });
});
