interface CachedDataBadgeProps {
  /**
   * Whether the data is from cache
   */
  isCached: boolean;
  /**
   * Whether the cached data is dirty (has offline changes)
   */
  isDirty?: boolean;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Position variant for absolute positioning
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline';
}

/**
 * CachedDataBadge Component
 * 
 * Visual indicator showing whether data is cached and if it has offline changes
 * Can be positioned absolutely or inline
 */
export function CachedDataBadge({
  isCached,
  isDirty = false,
  size = 'sm',
  position = 'inline',
}: CachedDataBadgeProps) {
  if (!isCached) return null;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const positionClasses = {
    'top-left': 'absolute top-2 left-2',
    'top-right': 'absolute top-2 right-2',
    'bottom-left': 'absolute bottom-2 left-2',
    'bottom-right': 'absolute bottom-2 right-2',
    'inline': '',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${isDirty 
          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' 
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        }
        ${sizeClasses[size]}
        ${positionClasses[position]}
      `}
      title={isDirty ? 'Cached with offline changes' : 'Cached data'}
    >
      {/* Icon */}
      <svg
        className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isDirty ? (
          // Pencil icon for dirty data
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        ) : (
          // Cloud download icon for cached data
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
          />
        )}
      </svg>

      {/* Label */}
      <span>{isDirty ? 'Modified' : 'Cached'}</span>
    </div>
  );
}
