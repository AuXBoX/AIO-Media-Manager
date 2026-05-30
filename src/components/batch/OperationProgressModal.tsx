import { useEffect, useState } from 'react';
import { OperationStatus } from '@/managers/BatchOperationManager';

interface OperationProgressModalProps {
  isOpen: boolean;
  operationId: string;
  onClose: () => void;
  onCancel: () => void;
  getStatus: (operationId: string) => Promise<OperationStatus>;
}

/**
 * Operation Progress Modal
 * 
 * Displays real-time progress for batch operations with:
 * - Progress bar and percentage
 * - Item counts (completed, failed, total)
 * - Estimated time remaining
 * - Cancel button
 * - Error list
 */
export function OperationProgressModal({
  isOpen,
  operationId,
  onClose,
  onCancel,
  getStatus,
}: OperationProgressModalProps) {
  const [status, setStatus] = useState<OperationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll for status updates
  useEffect(() => {
    if (!isOpen || !operationId) return;

    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const currentStatus = await getStatus(operationId);
        setStatus(currentStatus);

        // Stop polling if operation is completed, cancelled, or failed
        if (
          currentStatus.status === 'completed' ||
          currentStatus.status === 'cancelled' ||
          currentStatus.status === 'failed'
        ) {
          clearInterval(intervalId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
        clearInterval(intervalId);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 500ms
    intervalId = setInterval(fetchStatus, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [isOpen, operationId, getStatus]);

  const handleCancel = async () => {
    try {
      await onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel operation');
    }
  };

  const handleClose = () => {
    // Only allow closing if operation is not running
    if (status && status.status !== 'running') {
      onClose();
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusColor = (statusType: string): string => {
    switch (statusType) {
      case 'running':
        return 'text-blue-600 dark:text-blue-400';
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'cancelled':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (statusType: string) => {
    switch (statusType) {
      case 'running':
        return (
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      case 'completed':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'failed':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Batch Operation Progress
            </h2>
            {status && status.status !== 'running' && (
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-400 mr-3 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {status && (
              <>
                {/* Status */}
                <div className="flex items-center space-x-3">
                  <div className={getStatusColor(status.status)}>{getStatusIcon(status.status)}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</p>
                    <p className={`text-lg font-semibold capitalize ${getStatusColor(status.status)}`}>
                      {status.status}
                    </p>
                  </div>
                </div>

                {/* Operation Type */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Operation Type
                  </p>
                  <p className="text-base text-gray-900 dark:text-white capitalize">{status.type}</p>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {Math.round(status.progress)}%
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300 ease-out"
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>
                </div>

                {/* Item Counts */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{status.total}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {status.completed}
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <p className="text-sm text-red-600 dark:text-red-400 mb-1">Failed</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">{status.failed}</p>
                  </div>
                </div>

                {/* Estimated Time Remaining */}
                {status.status === 'running' && status.estimatedTimeRemaining !== undefined && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                      Estimated Time Remaining
                    </p>
                    <p className="text-xl font-semibold text-blue-700 dark:text-blue-300">
                      {formatTime(status.estimatedTimeRemaining)}
                    </p>
                  </div>
                )}

                {/* Errors */}
                {status.errors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Errors ({status.errors.length})
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      {status.errors.map((err, index) => (
                        <div
                          key={index}
                          className="text-sm text-gray-700 dark:text-gray-300 border-l-2 border-red-400 pl-3"
                        >
                          <span className="font-medium">Item {err.ratingKey}:</span> {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            {status?.status === 'running' && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Cancel Operation
              </button>
            )}
            {status && status.status !== 'running' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OperationProgressModal;
