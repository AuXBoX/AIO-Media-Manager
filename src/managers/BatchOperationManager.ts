import { v4 as uuidv4 } from 'uuid';
import { db } from '@/db/database';
import { PlexClient } from '@/api/plexClient';

/**
 * Batch operation types
 */
export type BatchOperationType = 'refresh' | 'match' | 'artwork' | 'update';

/**
 * Operation status
 */
export type OperationStatusType = 'queued' | 'running' | 'completed' | 'cancelled' | 'failed';

/**
 * Batch operation definition
 */
export interface BatchOperation {
  type: BatchOperationType;
  ratingKeys: string[];
  data?: any;
}

/**
 * Operation status with progress tracking
 */
export interface OperationStatus {
  id: string;
  type: string;
  total: number;
  completed: number;
  failed: number;
  status: OperationStatusType;
  progress: number;
  estimatedTimeRemaining?: number;
  errors: Array<{ ratingKey: string; error: string }>;
  startedAt?: number;
  completedAt?: number;
}

/**
 * Operation history record
 */
export interface OperationHistory {
  id: string;
  type: string;
  total: number;
  succeeded: number;
  failed: number;
  startedAt: number;
  completedAt: number;
}

/**
 * Batch Operation Manager Interface
 */
export interface IBatchOperationManager {
  queueOperation(operation: BatchOperation): Promise<string>;
  executeOperation(operationId: string): Promise<void>;
  cancelOperation(operationId: string): Promise<void>;
  retryFailedItems(operationId: string): Promise<void>;
  getOperationStatus(operationId: string): Promise<OperationStatus>;
  getOperationHistory(): Promise<OperationHistory[]>;
}

/**
 * Internal operation state
 */
interface OperationState {
  id: string;
  operation: BatchOperation;
  status: OperationStatus;
  cancelled: boolean;
  startTime?: number;
  itemTimes: number[]; // Track time per item for ETA calculation
}

/**
 * Batch Operation Manager
 * 
 * Manages batch operations on media items with:
 * - Operation queuing
 * - Progress tracking
 * - Cancellation support
 * - Retry failed items
 * - Operation history
 */
export class BatchOperationManager implements IBatchOperationManager {
  private operations: Map<string, OperationState> = new Map();
  private executionHandlers: Map<BatchOperationType, (ratingKey: string, data?: any) => Promise<void>> = new Map();

  constructor(private client: PlexClient) {
    this.setupExecutionHandlers();
  }

  /**
   * Set up execution handlers for different operation types
   */
  private setupExecutionHandlers(): void {
    // Refresh metadata handler
    this.executionHandlers.set('refresh', async (ratingKey: string) => {
      await this.client.get(`/library/metadata/${ratingKey}/refresh`);
    });

    // Match metadata handler
    this.executionHandlers.set('match', async (ratingKey: string) => {
      await this.client.get(`/library/metadata/${ratingKey}/match`);
    });

    // Update metadata handler
    this.executionHandlers.set('update', async (ratingKey: string, data?: any) => {
      if (!data) {
        throw new Error('Update operation requires data');
      }
      
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      await this.client.put(`/library/metadata/${ratingKey}?${params.toString()}`);
    });

    // Artwork upload handler
    this.executionHandlers.set('artwork', async (ratingKey: string, data?: any) => {
      if (!data?.url || !data?.type) {
        throw new Error('Artwork operation requires url and type');
      }

      const params = new URLSearchParams({
        url: data.url,
        includeExternalMedia: '1',
      });

      await this.client.put(`/library/metadata/${ratingKey}/posters?${params.toString()}`);
    });
  }

  /**
   * Queue a batch operation
   */
  async queueOperation(operation: BatchOperation): Promise<string> {
    const id = uuidv4();
    
    const status: OperationStatus = {
      id,
      type: operation.type,
      total: operation.ratingKeys.length,
      completed: 0,
      failed: 0,
      status: 'queued',
      progress: 0,
      errors: [],
    };

    const state: OperationState = {
      id,
      operation,
      status,
      cancelled: false,
      itemTimes: [],
    };

    this.operations.set(id, state);

    return id;
  }

  /**
   * Execute a queued operation
   */
  async executeOperation(operationId: string): Promise<void> {
    const state = this.operations.get(operationId);
    
    if (!state) {
      throw new Error(`Operation ${operationId} not found`);
    }

    if (state.status.status === 'running') {
      throw new Error(`Operation ${operationId} is already running`);
    }

    if (state.status.status === 'completed') {
      throw new Error(`Operation ${operationId} is already completed`);
    }

    // Update status to running
    state.status.status = 'running';
    state.status.startedAt = Date.now();
    state.startTime = Date.now();
    state.cancelled = false;

    const handler = this.executionHandlers.get(state.operation.type);
    
    if (!handler) {
      throw new Error(`No handler found for operation type: ${state.operation.type}`);
    }

    // Execute operation for each item
    for (let i = 0; i < state.operation.ratingKeys.length; i++) {
      // Check if operation was cancelled
      if (state.cancelled) {
        state.status.status = 'cancelled';
        break;
      }

      const ratingKey = state.operation.ratingKeys[i]!;
      const itemStartTime = Date.now();

      try {
        await handler(ratingKey, state.operation.data);
        state.status.completed++;
      } catch (error) {
        state.status.failed++;
        state.status.errors.push({
          ratingKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Track item execution time
      const itemTime = Date.now() - itemStartTime;
      state.itemTimes.push(itemTime);

      // Update progress
      state.status.progress = ((i + 1) / state.status.total) * 100;

      // Calculate estimated time remaining
      if (state.itemTimes.length > 0) {
        const avgTime = state.itemTimes.reduce((a, b) => a + b, 0) / state.itemTimes.length;
        const remainingItems = state.status.total - (i + 1);
        state.status.estimatedTimeRemaining = Math.round((avgTime * remainingItems) / 1000); // in seconds
      }
    }

    // Mark as completed if not cancelled
    if (!state.cancelled) {
      state.status.status = state.status.failed === state.status.total ? 'failed' : 'completed';
      state.status.completedAt = Date.now();
      state.status.progress = 100;
      state.status.estimatedTimeRemaining = 0;

      // Save to history
      await this.saveToHistory(state);
    }
  }

  /**
   * Cancel a running operation
   */
  async cancelOperation(operationId: string): Promise<void> {
    const state = this.operations.get(operationId);
    
    if (!state) {
      throw new Error(`Operation ${operationId} not found`);
    }

    if (state.status.status !== 'running') {
      throw new Error(`Operation ${operationId} is not running`);
    }

    state.cancelled = true;
  }

  /**
   * Retry failed items from an operation
   */
  async retryFailedItems(operationId: string): Promise<void> {
    const state = this.operations.get(operationId);
    
    if (!state) {
      throw new Error(`Operation ${operationId} not found`);
    }

    if (state.status.errors.length === 0) {
      throw new Error(`Operation ${operationId} has no failed items`);
    }

    // Create a new operation with only failed items
    const failedRatingKeys = state.status.errors.map((e) => e.ratingKey);
    
    const retryOperation: BatchOperation = {
      type: state.operation.type,
      ratingKeys: failedRatingKeys,
      data: state.operation.data,
    };

    const newOperationId = await this.queueOperation(retryOperation);
    
    // Execute the retry operation
    await this.executeOperation(newOperationId);
  }

  /**
   * Get operation status
   */
  async getOperationStatus(operationId: string): Promise<OperationStatus> {
    const state = this.operations.get(operationId);
    
    if (!state) {
      throw new Error(`Operation ${operationId} not found`);
    }

    return { ...state.status };
  }

  /**
   * Get operation history from database
   */
  async getOperationHistory(): Promise<OperationHistory[]> {
    const records = await db.operationHistory
      .orderBy('startedAt')
      .reverse()
      .limit(50)
      .toArray();

    return records.map((record) => ({
      id: record.id,
      type: record.type,
      total: record.total,
      succeeded: record.succeeded,
      failed: record.failed,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
    }));
  }

  /**
   * Save completed operation to history
   */
  private async saveToHistory(state: OperationState): Promise<void> {
    if (!state.status.startedAt || !state.status.completedAt) {
      return;
    }

    await db.operationHistory.add({
      id: state.id,
      type: state.operation.type,
      total: state.status.total,
      succeeded: state.status.completed,
      failed: state.status.failed,
      startedAt: state.status.startedAt,
      completedAt: state.status.completedAt,
      errors: state.status.errors,
    });
  }

  /**
   * Clear completed operations from memory
   */
  clearCompletedOperations(): void {
    for (const [id, state] of this.operations.entries()) {
      if (state.status.status === 'completed' || state.status.status === 'cancelled') {
        this.operations.delete(id);
      }
    }
  }
}

/**
 * Create a batch operation manager instance
 */
export function createBatchOperationManager(client: PlexClient): BatchOperationManager {
  return new BatchOperationManager(client);
}
