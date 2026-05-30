import { useState } from 'react';

interface OnlineIndicatorProps {
  isOnline: boolean;
  isSyncing?: boolean;
  lastSyncTime?: number;
  onManualSync?: () => void;
}

/**
 * OnlineIndicator Component
 * 
 * Displays the current online/offline status with visual indicators
 * Shows sync status and provides manual sync trigger
 */
export function OnlineIndicator({
  isOnline,
  isSyncing = false,
  lastSyncTime,
  onManualSync,
}: OnlineIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Format last sync time
  const formatLastSync = (timestamp: number | undefined): string => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Status Indicator Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={isOnline ? 'Online' : 'Offline'}
      >
        {/* Status Dot */}
        <div className="relative">
          <div
            className={`w-3 h-3 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          {isSyncing && (
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping" />
          )}
        </div>

        {/* Status Text */}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isSyncing ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
        </span>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            showDetails ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 space-y-3">
            {/* Connection Status */}
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Connection Status
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {isOnline ? 'Connected to server' : 'Working offline'}
                </span>
              </div>
            </div>

            {/* Last Sync */}
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Last Sync
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {formatLastSync(lastSyncTime)}
              </div>
            </div>

            {/* Sync Status */}
            {isSyncing && (
              <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <span>Syncing changes...</span>
              </div>
            )}

            {/* Manual Sync Button */}
            {onManualSync && isOnline && !isSyncing && (
              <button
                onClick={() => {
                  onManualSync();
                  setShowDetails(false);
                }}
                className="w-full px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sync Now
              </button>
            )}

            {/* Offline Message */}
            {!isOnline && (
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                Changes will sync automatically when connection is restored.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDetails && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}
