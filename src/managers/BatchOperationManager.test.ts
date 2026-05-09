import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BatchOperationManager, BatchOperation } from './BatchOperationManager';
import { PlexClient } from '@/api/plexClient';
import { db } from '@/db/database';

// Mock the database
vi.mock('@/db/database', () => ({
  db: {
    operationHistory: {
      add: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          limit: vi.fn(() => ({
            toArray: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    },
  },
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-operation-id',
}));

describe('BatchOperationManager', () => {
  let manager: BatchOperationManager;
  let mockClient: PlexClient;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      get: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    } as any;

    manager = new BatchOperationManager(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('queueOperation', () => {
    it('should queue a batch operation and return operation ID', async () => {
      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1', '2', '3'],
      };

      const operationId = await manager.queueOperation(operation);

      expect(operationId).toBe('test-operation-id');

      const status = await manager.getOperationStatus(operationId);
      expect(status.status).toBe('queued');
      expect(status.total).toBe(3);
      expect(status.completed).toBe(0);
      expect(status.failed).toBe(0);
    });

    it('should initialize operation with correct type', async () => {
      const operation: BatchOperation = {
        type: 'match',
        ratingKeys: ['1', '2'],
      };

      const operationId = await manager.queueOperation(operation);
      const status = await manager.getOperationStatus(operationId);

      expect(status.type).toBe('match');
    });
  });

  describe('executeOperation', () => {
    it('should execute refresh operation for all items', async () => {
      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1', '2', '3'],
      };

      const operationId = await manager.queueOperation(operation);
      await manager.executeOperation(operationId);

      expect(mockClient.get).toHaveBeenCalledTimes(3);
      expect(mockClient.get).toHaveBeenCalledWith('/library/metadata/1/refresh');
      expect(mockClient.get).toHaveBeenCalledWith('/library/metadata/2/refresh');
      expect(mockClient.get).toHaveBeenCalledWith('/library/metadata/3/refresh');

      const status = await manager.getOperationStatus(operationId);
      expect(status.status).toBe('completed');
      expect(status.completed).toBe(3);
      expect(status.failed).toBe(0);
      expect(status.progress).toBe(100);
    });

    it('should execute match operation for all items', async () => {
      const operation: BatchOperation = {
        type: 'match',
        ratingKeys: ['1', '2'],
      };

      const operationId = await manager.queueOperation(operation);
      await manager.executeOperation(operationId);

      expect(mockClient.get).toHaveBeenCalledTimes(2);
      expect(mockClient.get).toHaveBeenCalledWith('/library/metadata/1/match');
      expect(mockClient.get).toHaveBeenCalledWith('/library/metadata/2/match');
    });

    it('should execute update operation with data', async () => {
      const operation: BatchOperation = {
        type: 'update',
        ratingKeys: ['1'],
        data: { title: 'New Title', year: 2023 },
      };

      const operationId = await manager.queueOperation(operation);
      await manager.executeOperation(operationId);

      expect(mockClient.put).toHaveBeenCalledTimes(1);
      expect(mockClient.put).toHaveBeenCalledWith(
        expect.stringContaining('/library/metadata/1?')
      );
      expect(mockClient.put).toHaveBeenCalledWith(
        expect.stringContaining('title=New+Title')
      );
      expect(mockClient.put).toHaveBeenCalledWith(
        expect.stringContaining('year=2023')
      );
    });

    it('should execute artwork operation with data', async () => {
      const operation: BatchOperation = {
        type: 'artwork',
        ratingKeys: ['1'],
        data: { url: 'http://example.com/poster.jpg', type: 'poster' },
      };

      const operationId = await manager.queueOperation(operation);
      await manager.executeOperation(operationId);

      expect(mockClient.put).toHaveBeenCalledTimes(1);
      expect(mockClient.put).toHaveBeenCalledWith(
        expect.stringContaining('/library/metadata/1/posters?')
      );
    });

    it('should track failed items and continue execution', async () => {
      // Mock one failure
      mockClient.get = vi
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({});

      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1', '2', '3'],
      };

      const operationId = await manager.queueOperation(operation);
      await manager.executeOperation(operationId);

      const status = await manager.getOperationStatus(operationId);
      expect(status.completed).toBe(2);
      expect(status.failed).toBe(1);
      expect(status.errors).toHaveLength(1);
      expect(status.errors[0]).toEqual({
        ratingKey: '2',
        error: 'Network error',
      });
    });

    it('should update progress during execution', async () => {
      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1', '2', '3', '4'],
      };

      const operationId = await manager.queueOperation(operation);
      
      // Execute in background
      const executionPromise = manager.executeOperation(operationId);

      // Wait a bit for some items to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      const status = await manager.getOperationStatus(operationId);
      expect(status.progress).toBeGreaterThan(0);

      await executionPromise;
    });

    it('should calculate estimated time remaining', async () => {
      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1', '2', '3', '4', '5'],
      };

      const operationId = await manager.queueOperation(operation);
      await manager.executeOperation(operationId);

      const status = await manager.getOperationStatus(operationId);
      expect(status.estimatedTimeRemaining).toBe(0); // Completed
    });

    it('should throw error if operation not found', async () => {
      await expect(manager.executeOperation('non-existent')).rejects.toThrow(
        'Operation non-existent not found'
      );
    });

    it('should throw error if operation already running', async () => {
      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1', '2', '3'],
      };

      const operationId = await manager.queueOperation(operation);
      
      // Start execution
      const executionPromise = manager.executeOperation(operationId);

      // Try to execute again
      await expect(manager.executeOperation(operationId)).rejects.toThrow(
        'is already running'
      );

      await executionPromise;
    });

    it('should save to history when completed', async () => {
      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1', '2'],
      };

      const operationId = await manager.queueOperation(operation);
      await manager.executeOperation(operationId);

      expect(db.operationHistory.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: operationId,
          type: 'refresh',
          total: 2,
          succeeded: 2,
          failed: 0,
        })
      );
    });
  });

  describe('cancelOperation', () => {
    it('should cancel a running operation', async () => {
      // Mock slow execution
      mockClient.get = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1', '2', '3', '4', '5'],
      };

      const operationId = await manager.queueOperation(operation);
      
      // Start execution
      const executionPromise = manager.executeOperation(operationId);

      // Wait a bit then cancel
      await new Promise((resolve) => setTimeout(resolve, 50));
      await manager.cancelOperation(operationId);

      await executionPromise;

      const status = await manager.getOperationStatus(operationId);
      expect(status.status).toBe('cancelled');
      expect(status.completed).toBeLessThan(5);
    });

    it('should throw error if operation not found', async () => {
      await expect(manager.cancelOperation('non-existent')).rejects.toThrow(
        'Operation non-existent not found'
      );
    });

    it('should throw error if operation not running', async () => {
      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1'],
      };

      const operationId = await manager.queueOperation(operation);

      await expect(manager.cancelOperation(operationId)).rejects.toThrow(
        'is not running'
      );
    });
  });

  describe('retryFailedItems', () => {
    it('should retry only failed items', async () => {
      // Mock one failure
      mockClient.get = vi
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({});

      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1', '2', '3'],
      };

      const operationId = await manager.queueOperation(operation);
      await manager.executeOperation(operationId);

      // Clear mock calls
      vi.clearAllMocks();

      // Retry failed items
      await manager.retryFailedItems(operationId);

      // Should only retry the failed item
      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(mockClient.get).toHaveBeenCalledWith('/library/metadata/2/refresh');
    });

    it('should throw error if operation not found', async () => {
      await expect(manager.retryFailedItems('non-existent')).rejects.toThrow(
        'Operation non-existent not found'
      );
    });

    it('should throw error if no failed items', async () => {
      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1', '2'],
      };

      const operationId = await manager.queueOperation(operation);
      await manager.executeOperation(operationId);

      await expect(manager.retryFailedItems(operationId)).rejects.toThrow(
        'has no failed items'
      );
    });
  });

  describe('getOperationStatus', () => {
    it('should return operation status', async () => {
      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1', '2', '3'],
      };

      const operationId = await manager.queueOperation(operation);
      const status = await manager.getOperationStatus(operationId);

      expect(status).toMatchObject({
        id: operationId,
        type: 'refresh',
        total: 3,
        completed: 0,
        failed: 0,
        status: 'queued',
        progress: 0,
        errors: [],
      });
    });

    it('should throw error if operation not found', async () => {
      await expect(manager.getOperationStatus('non-existent')).rejects.toThrow(
        'Operation non-existent not found'
      );
    });
  });

  describe('getOperationHistory', () => {
    it('should return operation history from database', async () => {
      const mockHistory = [
        {
          id: '1',
          type: 'refresh',
          total: 10,
          succeeded: 9,
          failed: 1,
          startedAt: Date.now() - 1000,
          completedAt: Date.now(),
          errors: [],
        },
      ];

      (db.operationHistory.orderBy as any).mockReturnValue({
        reverse: vi.fn(() => ({
          limit: vi.fn(() => ({
            toArray: vi.fn(() => Promise.resolve(mockHistory)),
          })),
        })),
      });

      const history = await manager.getOperationHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        id: '1',
        type: 'refresh',
        total: 10,
        succeeded: 9,
        failed: 1,
      });
    });
  });

  describe('clearCompletedOperations', () => {
    it('should remove completed operations from memory', async () => {
      const operation: BatchOperation = {
        type: 'refresh',
        ratingKeys: ['1'],
      };

      const operationId = await manager.queueOperation(operation);
      await manager.executeOperation(operationId);

      manager.clearCompletedOperations();

      await expect(manager.getOperationStatus(operationId)).rejects.toThrow(
        'Operation test-operation-id not found'
      );
    });
  });
});
