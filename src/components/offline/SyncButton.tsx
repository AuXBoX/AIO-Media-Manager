import { useState } from 'react';

interface SyncButtonProps {
  /**
   * Whether sync is currently in progress
   */
  isSyncing: boolean;
  /**
   * Whether the application is online
   */
  isOnline: boolean;
  /**
   * Number of pending changes to sync
   */
  pendingChanges?: number;
  /**
   * Callback when sync is triggered
   */
  onSync: () => void;
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'icon';
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * SyncButton Component
 * 
 * Manual sync trigger button with loading state and pending changes indicator
 */
export function SyncButton({
  isSyncing,
  isOnline,
  pendingChanges = 0,
  onSync,
  variant = 'primary',
  size = 'md',
}: SyncButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const disabled = !isOnline || isSyncing;

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300',
    icon: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400',
  };

  const getTooltipText = () => {
    if (!isOnline) return 'Cannot sync while offline';
    if (isSyncing) return 'Syncing...';
    if (pendingChanges === 0) return 'No changes to sync';
    return `Sync ${pendingChanges} ${pendingChanges === 1 ? 'change' : 'changes'}`;
  };

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={onSync}
          disabled={disabled}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`
            relative rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            ${sizeClasses[size]}
            ${variantClasses[variant]}
          `}
          aria-label="Sync changes"
        >
          {/* Sync Icon */}
          <svg
            className={`${iconSizeClasses[size]} ${isSyncing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>

          {/* Pending Changes Badge */}
          {pendingChanges > 0 && !isSyncing && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {pendingChanges > 9 ? '9+' : pendingChanges}
            </span>
          )}
        </button>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-50">
            {getTooltipText()}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={onSync}
      disabled={disabled}
      className={`
        flex items-center gap-2 rounded-lg font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
      `}
    >
      {/* Sync Icon */}
      <svg
        className={`${iconSizeClasses[size]} ${isSyncing ? 'animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>

      {/* Button Text */}
      <span>
        {isSyncing ? 'Syncing...' : 'Sync Now'}
        {pendingChanges > 0 && !isSyncing && (
          <span className="ml-1 text-xs opacity-75">
            ({pendingChanges})
          </span>
        )}
      </span>
    </button>
  );
}
