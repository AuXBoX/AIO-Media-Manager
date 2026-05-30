/**
 * EmptyState Component Examples
 * 
 * This file demonstrates all variants of the EmptyState component
 * and its pre-configured versions for different use cases.
 */

import {
  EmptyState,
  LibraryEmptyState,
  DetailPanelEmptyState,
  SearchEmptyState,
  PlaylistEmptyState,
} from './EmptyState';

/**
 * Example 1: Basic EmptyState
 * 
 * Minimal empty state with just a title
 */
export function BasicEmptyStateExample() {
  return (
    <div className="p-8 bg-background-primary">
      <EmptyState title="No items found" />
    </div>
  );
}

/**
 * Example 2: EmptyState with Description
 * 
 * Empty state with title and description text
 */
export function EmptyStateWithDescriptionExample() {
  return (
    <div className="p-8 bg-background-primary">
      <EmptyState
        title="No items found"
        description="This area is currently empty. Add some items to get started."
      />
    </div>
  );
}

/**
 * Example 3: EmptyState with Custom Icon
 * 
 * Empty state with a custom SVG icon
 */
export function EmptyStateWithIconExample() {
  return (
    <div className="p-8 bg-background-primary">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
        title="No documents"
        description="Upload your first document to begin"
      />
    </div>
  );
}

/**
 * Example 4: EmptyState with Primary Action
 * 
 * Empty state with a primary action button
 */
export function EmptyStateWithActionExample() {
  const handleCreate = () => {
    console.log('Create clicked');
  };

  return (
    <div className="p-8 bg-background-primary">
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
              d="M12 4v16m8-8H4"
            />
          </svg>
        }
        title="No playlists yet"
        description="Create your first playlist to organize your media"
        action={{
          label: 'Create Playlist',
          onClick: handleCreate,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ),
        }}
      />
    </div>
  );
}

/**
 * Example 5: EmptyState with Primary and Secondary Actions
 * 
 * Empty state with both primary and secondary action buttons
 */
export function EmptyStateWithMultipleActionsExample() {
  const handleImport = () => {
    console.log('Import clicked');
  };

  const handleLearnMore = () => {
    console.log('Learn more clicked');
  };

  return (
    <div className="p-8 bg-background-primary">
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
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        }
        title="No media files"
        description="Import your media library to get started with organizing and managing your content"
        action={{
          label: 'Import Media',
          onClick: handleImport,
        }}
        secondaryAction={{
          label: 'Learn More',
          onClick: handleLearnMore,
        }}
      />
    </div>
  );
}

/**
 * Example 6: Small Size EmptyState
 * 
 * Compact empty state for smaller spaces
 */
export function SmallEmptyStateExample() {
  return (
    <div className="p-8 bg-background-primary">
      <EmptyState
        size="sm"
        title="No results"
        description="Try adjusting your filters"
      />
    </div>
  );
}

/**
 * Example 7: Large Size EmptyState
 * 
 * Large empty state for prominent display
 */
export function LargeEmptyStateExample() {
  return (
    <div className="p-8 bg-background-primary">
      <EmptyState
        size="lg"
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
        title="Welcome to your library"
        description="Your media library is empty. Add some content to get started with organizing and enjoying your collection."
      />
    </div>
  );
}

/**
 * Example 8: LibraryEmptyState
 * 
 * Pre-configured empty state for library views
 */
export function LibraryEmptyStateExample() {
  return (
    <div className="p-8 bg-background-primary">
      <LibraryEmptyState libraryName="Movies" />
    </div>
  );
}

/**
 * Example 9: DetailPanelEmptyState
 * 
 * Pre-configured empty state for detail panel when no item is selected
 */
export function DetailPanelEmptyStateExample() {
  return (
    <div className="p-8 bg-secondary-800 text-white">
      <DetailPanelEmptyState />
    </div>
  );
}

/**
 * Example 10: SearchEmptyState
 * 
 * Pre-configured empty state for search results
 */
export function SearchEmptyStateExample() {
  return (
    <div className="p-8 bg-background-primary">
      <SearchEmptyState query="avatar" />
    </div>
  );
}

/**
 * Example 11: SearchEmptyState without Query
 * 
 * Search empty state without a specific query
 */
export function SearchEmptyStateNoQueryExample() {
  return (
    <div className="p-8 bg-background-primary">
      <SearchEmptyState />
    </div>
  );
}

/**
 * Example 12: PlaylistEmptyState
 * 
 * Pre-configured empty state for empty playlists
 */
export function PlaylistEmptyStateExample() {
  const handleAddItems = () => {
    console.log('Add items clicked');
  };

  return (
    <div className="p-8 bg-background-primary">
      <PlaylistEmptyState onAddItems={handleAddItems} />
    </div>
  );
}

/**
 * Example 13: PlaylistEmptyState without Action
 * 
 * Playlist empty state without the add items button
 */
export function PlaylistEmptyStateNoActionExample() {
  return (
    <div className="p-8 bg-background-primary">
      <PlaylistEmptyState />
    </div>
  );
}

/**
 * Example 14: All Sizes Comparison
 * 
 * Shows all three size variants side by side
 */
export function AllSizesComparisonExample() {
  return (
    <div className="grid grid-cols-3 gap-8 p-8 bg-background-primary">
      <div className="border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-4 text-text-secondary">Small</h3>
        <EmptyState
          size="sm"
          title="Small Size"
          description="Compact for tight spaces"
        />
      </div>
      <div className="border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-4 text-text-secondary">Medium (Default)</h3>
        <EmptyState
          size="md"
          title="Medium Size"
          description="Default size for most use cases"
        />
      </div>
      <div className="border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-4 text-text-secondary">Large</h3>
        <EmptyState
          size="lg"
          title="Large Size"
          description="Prominent display for main content areas"
        />
      </div>
    </div>
  );
}

/**
 * Example 15: All Pre-configured Variants
 * 
 * Shows all pre-configured empty state variants
 */
export function AllVariantsExample() {
  return (
    <div className="space-y-8 p-8 bg-background-primary">
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-text-primary">Library Empty State</h3>
        <LibraryEmptyState libraryName="TV Shows" />
      </div>

      <div className="border border-border rounded-lg p-6 bg-secondary-800">
        <h3 className="text-lg font-semibold mb-4 text-white">Detail Panel Empty State</h3>
        <DetailPanelEmptyState />
      </div>

      <div className="border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-text-primary">Search Empty State</h3>
        <SearchEmptyState query="test search" />
      </div>

      <div className="border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-text-primary">Playlist Empty State</h3>
        <PlaylistEmptyState onAddItems={() => console.log('Add items')} />
      </div>
    </div>
  );
}
