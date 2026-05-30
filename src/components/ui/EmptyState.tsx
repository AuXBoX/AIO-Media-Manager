import { FC, ReactNode } from 'react';
import clsx from 'clsx';
import { Button } from './Button';

export interface EmptyStateProps {
  /**
   * Icon or illustration to display
   */
  icon?: ReactNode;
  /**
   * Title text
   */
  title: string;
  /**
   * Description text
   */
  description?: string;
  /**
   * Primary action button
   */
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /**
   * Secondary action button
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * EmptyState Component
 * 
 * Displays an empty state with optional icon, title, description, and actions.
 * Follows the Plex Pro design system with clean, minimal styling.
 * 
 * @example
 * ```tsx
 * // Basic empty state
 * <EmptyState
 *   title="No items found"
 *   description="This library is empty"
 * />
 * 
 * // With icon and action
 * <EmptyState
 *   icon={<FolderIcon />}
 *   title="No playlists yet"
 *   description="Create your first playlist to get started"
 *   action={{
 *     label: "Create Playlist",
 *     onClick: () => handleCreate()
 *   }}
 * />
 * 
 * // With custom icon
 * <EmptyState
 *   icon={
 *     <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 *       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 *     </svg>
 *   }
 *   title="No documents"
 *   description="Upload your first document to begin"
 * />
 * ```
 */
export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'w-12 h-12 mb-3',
      title: 'text-base',
      description: 'text-xs',
      gap: 'gap-2',
    },
    md: {
      container: 'py-12',
      icon: 'w-16 h-16 mb-4',
      title: 'text-lg',
      description: 'text-sm',
      gap: 'gap-3',
    },
    lg: {
      container: 'py-16',
      icon: 'w-20 h-20 mb-6',
      title: 'text-xl',
      description: 'text-base',
      gap: 'gap-4',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      {/* Icon */}
      {icon && (
        <div className={clsx('text-text-tertiary', sizes.icon)}>
          {icon}
        </div>
      )}

      {/* Title */}
      <h3
        className={clsx(
          'font-semibold text-text-primary',
          sizes.title
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={clsx(
            'mt-2 text-text-secondary max-w-md',
            sizes.description
          )}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className={clsx('flex items-center justify-center mt-6', sizes.gap)}>
          {action && (
            <Button
              variant="primary"
              onClick={action.onClick}
              icon={action.icon}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="secondary"
              onClick={secondaryAction.onClick}
              icon={secondaryAction.icon}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * LibraryEmptyState Component
 * 
 * Pre-configured empty state for library views with no items.
 * 
 * @example
 * ```tsx
 * if (items.length === 0) {
 *   return <LibraryEmptyState libraryName="Movies" />;
 * }
 * ```
 */
export interface LibraryEmptyStateProps {
  /**
   * Name of the library
   */
  libraryName?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const LibraryEmptyState: FC<LibraryEmptyStateProps> = ({
  libraryName = 'library',
  className,
}) => {
  return (
    <EmptyState
      icon={
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      }
      title="No items found"
      description={`This ${libraryName} is empty. Add media files to your Plex library to see them here.`}
      size="lg"
      className={className}
    />
  );
};

/**
 * DetailPanelEmptyState Component
 * 
 * Pre-configured empty state for detail panel when no item is selected.
 * 
 * @example
 * ```tsx
 * if (!selectedItem) {
 *   return <DetailPanelEmptyState />;
 * }
 * ```
 */
export interface DetailPanelEmptyStateProps {
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const DetailPanelEmptyState: FC<DetailPanelEmptyStateProps> = ({
  className,
}) => {
  return (
    <EmptyState
      icon={
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
      }
      title="No selection"
      description="Select an item from the library to view and edit its details"
      size="md"
      className={className}
    />
  );
};

/**
 * SearchEmptyState Component
 * 
 * Pre-configured empty state for search results with no matches.
 * 
 * @example
 * ```tsx
 * if (searchResults.length === 0) {
 *   return <SearchEmptyState query={searchQuery} />;
 * }
 * ```
 */
export interface SearchEmptyStateProps {
  /**
   * Search query that returned no results
   */
  query?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SearchEmptyState: FC<SearchEmptyStateProps> = ({
  query,
  className,
}) => {
  return (
    <EmptyState
      icon={
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title="No results found"
      description={
        query
          ? `No items match "${query}". Try a different search term.`
          : 'Try adjusting your search criteria'
      }
      size="md"
      className={className}
    />
  );
};

/**
 * PlaylistEmptyState Component
 * 
 * Pre-configured empty state for empty playlists.
 * 
 * @example
 * ```tsx
 * if (playlist.items.length === 0) {
 *   return <PlaylistEmptyState onAddItems={handleAddItems} />;
 * }
 * ```
 */
export interface PlaylistEmptyStateProps {
  /**
   * Callback when add items button is clicked
   */
  onAddItems?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const PlaylistEmptyState: FC<PlaylistEmptyStateProps> = ({
  onAddItems,
  className,
}) => {
  return (
    <EmptyState
      icon={
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      }
      title="Empty playlist"
      description="Add items to this playlist to start building your collection"
      action={
        onAddItems
          ? {
              label: 'Add Items',
              onClick: onAddItems,
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              ),
            }
          : undefined
      }
      size="md"
      className={className}
    />
  );
};
