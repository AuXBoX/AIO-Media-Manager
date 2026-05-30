import { FC } from 'react';
import { Spinner } from './Spinner';
import clsx from 'clsx';

export interface LoadingIndicatorProps {
  /**
   * Loading message to display
   */
  message?: string;
  /**
   * Position of the indicator
   * - fixed: Fixed at bottom center of viewport
   * - absolute: Absolute positioned (requires parent with relative positioning)
   * - inline: Inline with content
   */
  position?: 'fixed' | 'absolute' | 'inline';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * LoadingIndicator Component
 * 
 * Floating loading indicator for "Loading more..." states.
 * Matches the Plex Pro design with blue background and white text.
 * 
 * @example
 * ```tsx
 * // Fixed at bottom of viewport
 * {isFetchingNextPage && (
 *   <LoadingIndicator message="Loading more..." position="fixed" />
 * )}
 * 
 * // Absolute positioned within container
 * <div className="relative">
 *   {isFetchingNextPage && (
 *     <LoadingIndicator message="Loading more..." position="absolute" />
 *   )}
 * </div>
 * 
 * // Inline with content
 * <LoadingIndicator message="Loading..." position="inline" />
 * ```
 */
export const LoadingIndicator: FC<LoadingIndicatorProps> = ({
  message = 'Loading...',
  position = 'absolute',
  className,
}) => {
  const positionClasses = {
    fixed: 'fixed bottom-4 left-1/2 transform -translate-x-1/2',
    absolute: 'absolute bottom-4 left-1/2 transform -translate-x-1/2',
    inline: 'inline-flex',
  };

  return (
    <div
      className={clsx(
        'flex items-center gap-3',
        'bg-[#3B82F6] text-white', // Plex Pro blue
        'px-4 py-2 rounded-full shadow-lg',
        'z-50',
        positionClasses[position],
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner size="sm" variant="white" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

/**
 * LoadingBadge Component
 * 
 * Small badge-style loading indicator for inline use.
 * 
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <span>Refreshing</span>
 *   <LoadingBadge />
 * </div>
 * ```
 */
export interface LoadingBadgeProps {
  /**
   * Badge text
   */
  text?: string;
  /**
   * Color variant
   */
  variant?: 'primary' | 'secondary';
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const LoadingBadge: FC<LoadingBadgeProps> = ({
  text,
  variant = 'primary',
  className,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium',
        {
          'bg-[#EEF4FF] text-[#3B82F6]': variant === 'primary', // Plex Pro blue subtle
          'bg-[#F1F5F9] text-[#64748B]': variant === 'secondary', // Plex Pro gray
        },
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner
        size="xs"
        variant={variant === 'primary' ? 'primary' : 'secondary'}
      />
      {text && <span>{text}</span>}
    </span>
  );
};

/**
 * LoadingDots Component
 * 
 * Animated dots loading indicator for minimal loading states.
 * 
 * @example
 * ```tsx
 * <div>
 *   <span>Loading</span>
 *   <LoadingDots />
 * </div>
 * ```
 */
export interface LoadingDotsProps {
  /**
   * Size of the dots
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Color variant
   */
  variant?: 'primary' | 'secondary' | 'white';
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const LoadingDots: FC<LoadingDotsProps> = ({
  size = 'md',
  variant = 'primary',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  const colorClasses = {
    primary: 'bg-primary-500',
    secondary: 'bg-slate-500',
    white: 'bg-white',
  };

  return (
    <span
      className={clsx('inline-flex items-center gap-1', className)}
      role="status"
      aria-label="Loading"
    >
      <span
        className={clsx(
          'rounded-full animate-pulse',
          sizeClasses[size],
          colorClasses[variant]
        )}
        style={{ animationDelay: '0ms' }}
      />
      <span
        className={clsx(
          'rounded-full animate-pulse',
          sizeClasses[size],
          colorClasses[variant]
        )}
        style={{ animationDelay: '150ms' }}
      />
      <span
        className={clsx(
          'rounded-full animate-pulse',
          sizeClasses[size],
          colorClasses[variant]
        )}
        style={{ animationDelay: '300ms' }}
      />
    </span>
  );
};

/**
 * LoadingBar Component
 * 
 * Horizontal loading bar for top-of-page loading states.
 * 
 * @example
 * ```tsx
 * {isLoading && <LoadingBar />}
 * ```
 */
export interface LoadingBarProps {
  /**
   * Progress percentage (0-100)
   * If not provided, shows indeterminate animation
   */
  progress?: number;
  /**
   * Height of the bar
   */
  height?: number;
  /**
   * Color variant
   */
  variant?: 'primary' | 'success' | 'warning' | 'error';
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const LoadingBar: FC<LoadingBarProps> = ({
  progress,
  height = 3,
  variant = 'primary',
  className,
}) => {
  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
  };

  return (
    <div
      className={clsx('w-full bg-slate-200/50 overflow-hidden', className)}
      style={{ height: `${height}px` }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <div
        className={clsx(
          'h-full transition-all duration-300',
          colorClasses[variant],
          {
            'animate-pulse': progress === undefined,
          }
        )}
        style={{
          width: progress !== undefined ? `${progress}%` : '100%',
          animation:
            progress === undefined
              ? 'indeterminate 1.5s ease-in-out infinite'
              : undefined,
        }}
      />
    </div>
  );
};

