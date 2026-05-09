import { useState } from 'react';
import { PlexClient } from '@/api/plexClient';
import { BatchOperationManager, BatchOperation } from '@/managers/BatchOperationManager';
import { OperationProgressModal, OperationHistory } from '@/components/batch';

/**
 * Example usage of Batch Operation components
 * 
 * This demonstrates how to:
 * 1. Create a BatchOperationManager
 * 2. Queue and execute batch operations
 * 3. Display progress with OperationProgressModal
 * 4. Show history with OperationHistory
 */

interface BatchOperationExampleProps {
  client: PlexClient;
}

export function BatchOperationExample({ client }: BatchOperationExampleProps) {
  const [manager] = useState(() => new BatchOperationManager(client));
  const [currentOperationId, setCurrentOperationId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  /**
   * Start a batch refresh operation
   */
  const handleBatchRefresh = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items first');
      return;
    }

    const operation: BatchOperation = {
      type: 'refresh',
      ratingKeys: selectedItems,
    };

    try {
      // Queue the operation
      const operationId = await manager.queueOperation(operation);
      setCurrentOperationId(operationId);
      setShowProgress(true);

      // Execute in background
      manager.executeOperation(operationId).catch((error) => {
        console.error('Operation failed:', error);
      });
    } catch (error) {
      console.error('Failed to queue operation:', error);
    }
  };

  /**
   * Start a batch match operation
   */
  const handleBatchMatch = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items first');
      return;
    }

    const operation: BatchOperation = {
      type: 'match',
      ratingKeys: selectedItems,
    };

    try {
      const operationId = await manager.queueOperation(operation);
      setCurrentOperationId(operationId);
      setShowProgress(true);

      manager.executeOperation(operationId).catch((error) => {
        console.error('Operation failed:', error);
      });
    } catch (error) {
      console.error('Failed to queue operation:', error);
    }
  };

  /**
   * Start a batch update operation
   */
  const handleBatchUpdate = async (updates: Record<string, any>) => {
    if (selectedItems.length === 0) {
      alert('Please select items first');
      return;
    }

    const operation: BatchOperation = {
      type: 'update',
      ratingKeys: selectedItems,
      data: updates,
    };

    try {
      const operationId = await manager.queueOperation(operation);
      setCurrentOperationId(operationId);
      setShowProgress(true);

      manager.executeOperation(operationId).catch((error) => {
        console.error('Operation failed:', error);
      });
    } catch (error) {
      console.error('Failed to queue operation:', error);
    }
  };

  /**
   * Cancel the current operation
   */
  const handleCancel = async () => {
    if (!currentOperationId) return;

    try {
      await manager.cancelOperation(currentOperationId);
    } catch (error) {
      console.error('Failed to cancel operation:', error);
    }
  };

  /**
   * Retry failed items from a previous operation
   */
  const handleRetry = async (operationId: string) => {
    try {
      await manager.retryFailedItems(operationId);
    } catch (error) {
      console.error('Failed to retry operation:', error);
    }
  };

  /**
   * Close the progress modal
   */
  const handleCloseProgress = () => {
    setShowProgress(false);
    setCurrentOperationId(null);
    manager.clearCompletedOperations();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Action Buttons */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Batch Operations
        </h2>

        <div className="flex space-x-3">
          <button
            onClick={handleBatchRefresh}
            disabled={selectedItems.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Refresh Selected ({selectedItems.length})
          </button>

          <button
            onClick={handleBatchMatch}
            disabled={selectedItems.length === 0}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Match Selected ({selectedItems.length})
          </button>

          <button
            onClick={() => handleBatchUpdate({ studio: 'Example Studio' })}
            disabled={selectedItems.length === 0}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Update Selected ({selectedItems.length})
          </button>
        </div>

        {/* Example item selection (in real app, this would be a list of media items) */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Selected Items: {selectedItems.length}
          </p>
          <button
            onClick={() => setSelectedItems(['1', '2', '3', '4', '5'])}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Select 5 example items
          </button>
        </div>
      </div>

      {/* Operation History */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <OperationHistory
          getHistory={() => manager.getOperationHistory()}
          onRetry={handleRetry}
        />
      </div>

      {/* Progress Modal */}
      {currentOperationId && (
        <OperationProgressModal
          isOpen={showProgress}
          operationId={currentOperationId}
          onClose={handleCloseProgress}
          onCancel={handleCancel}
          getStatus={(id) => manager.getOperationStatus(id)}
        />
      )}
    </div>
  );
}
