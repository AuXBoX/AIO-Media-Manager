import { FC } from 'react';
import { Spinner } from './Spinner';
import clsx from 'clsx';

export interface LoadingStateProps {
  /**
   * Loading message to display
   */
  message?: string;
  /**
   * Size of the spinner
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Whether to center the loading state
   */
  centered?: boolean;
  /**
   * Whether to take full height
   */
  fullHeight?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * LoadingState Component
 * 
 * General-purpose loading state with spinner and optional message.
 * Follows the Plex Pro design system with clean, minimal styling.
 * 
 * @example
 * ```tsx
 * // Basic loading state
 * <LoadingState message="Loading..." />
 * 
 * // Centered full-height loading
 * <LoadingState message="Loading library..." centered fullHeight />
 * 
 * // Small inline loading
 * <LoadingState size="sm" message="Refreshing..." />
 * ```
 */
export const LoadingState: FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'lg',
  centered = true,
  fullHeight = false,
  className,
}) => {
  const spinnerSizeMap = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const,
    xl: 'xl' as const,
  };

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-4',
        {
          'h-screen': fullHeight && centered,
          'h-full': fullHeight && !centered,
          'py-12': !fullHeight,
        },
        className
      )}
    >
      <Spinner size={spinnerSizeMap[size]} variant="primary" />
      {message && (
        <p className="text-sm text-[#334155] font-medium">{message}</p>
      )}
    </div>
  );
};

/**
 * InlineLoadingState Component
 * 
 * Compact loading state for inline use (e.g., within cards or sections).
 * 
 * @example
 * ```tsx
 * <div className="card">
 *   <InlineLoadingState message="Loading data..." />
 * </div>
 * ```
 */
export interface InlineLoadingStateProps {
  /**
   * Loading message
   */
  message?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const InlineLoadingState: FC<InlineLoadingStateProps> = ({
  message = 'Loading...',
  className,
}) => {
  return (
    <div className={clsx('flex items-center gap-3 py-4', className)}>
      <Spinner size="sm" variant="primary" />
      <span className="text-sm text-[#334155]">{message}</span>
    </div>
  );
};

/**
 * PageLoadingState Component
 * 
 * Full-page loading state with centered spinner and message.
 * Used for initial page loads or major transitions.
 * 
 * @example
 * ```tsx
 * if (isLoading) {
 *   return <PageLoadingState message="Loading metadata..." />;
 * }
 * ```
 */
export interface PageLoadingStateProps {
  /**
   * Loading message
   */
  message?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const PageLoadingState: FC<PageLoadingStateProps> = ({
  message = 'Loading...',
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex items-center justify-center h-screen bg-[#F8FAFC]',
        className
      )}
    >
      <div className="text-center">
        <Spinner size="xl" variant="primary" className="mx-auto mb-4" />
        <p className="text-sm text-[#334155] font-medium">{message}</p>
      </div>
    </div>
  );
};

/**
 * CardLoadingState Component
 * 
 * Loading state for card components.
 * Displays a centered spinner within a card-sized container.
 * 
 * @example
 * ```tsx
 * <div className="card">
 *   {isLoading ? (
 *     <CardLoadingState />
 *   ) : (
 *     <CardContent />
 *   )}
 * </div>
 * ```
 */
export interface CardLoadingStateProps {
  /**
   * Minimum height of the card
   */
  minHeight?: string | number;
  /**
   * Loading message
   */
  message?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const CardLoadingState: FC<CardLoadingStateProps> = ({
  minHeight = '200px',
  message,
  className,
}) => {
  return (
    <div
      className={clsx('flex flex-col items-center justify-center p-8', className)}
      style={{ minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }}
    >
      <Spinner size="md" variant="primary" />
      {message && (
        <p className="mt-3 text-sm text-[#334155]">{message}</p>
      )}
    </div>
  );
};

/**
 * SectionLoadingState Component
 * 
 * Loading state for page sections or panels.
 * More compact than full-page loading.
 * 
 * @example
 * ```tsx
 * <section>
 *   <h2>Recent Albums</h2>
 *   {isLoading ? (
 *     <SectionLoadingState message="Loading albums..." />
 *   ) : (
 *     <AlbumGrid albums={albums} />
 *   )}
 * </section>
 * ```
 */
export interface SectionLoadingStateProps {
  /**
   * Loading message
   */
  message?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SectionLoadingState: FC<SectionLoadingStateProps> = ({
  message = 'Loading...',
  className,
}) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12', className)}>
      <Spinner size="lg" variant="primary" />
      <p className="mt-4 text-sm text-[#334155]">{message}</p>
    </div>
  );
};
