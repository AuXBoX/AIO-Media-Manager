import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/appStore';
import { createPlexClient } from '@/api/plexClient';
import { createCollectionManager, Collection } from '@/managers/CollectionManager';
import { CollectionEditor } from '@/components/collections/CollectionEditor';
import { MetadataRefreshModal } from '@/components/library/MetadataRefreshModal';
import { AlphabetJumpList } from '@/components/library/AlphabetJumpList';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getSettingsManager } from '@/managers/SettingsManager';
import { useResponsiveColumns } from '@/hooks/useResponsiveColumns';

type ViewMode = 'grid' | 'list';

/**
 * CollectionsPage Component
 * Displays all collections for a movie library
 */
export function CollectionsPage() {
  const { libraryKey } = useParams<{ libraryKey: string }>();
  const { serverConnection, currentToken } = useAppStore();
  const queryClient = useQueryClient();

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [posterSize, setPosterSize] = useState<number>(180);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate columns based on poster size
  const columns_grid = useResponsiveColumns({
    minColumnWidth: posterSize,
    maxColumns: 12,
    gap: 8,
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsManager = getSettingsManager();
        const settings = await settingsManager.getSettings();
        setViewMode(settings.defaultView);
        // Use imageQuality setting to determine poster size
        const sizeMap = { low: 120, medium: 180, high: 240 };
        setPosterSize(sizeMap[settings.imageQuality] || 180);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  // Save view mode to settings when it changes
  useEffect(() => {
    if (isLoadingSettings) return;
    const saveViewMode = async () => {
      try {
        const settingsManager = getSettingsManager();
        await settingsManager.setSetting('defaultView', viewMode);
      } catch (error) {
        console.error('Failed to save view mode:', error);
      }
    };
    saveViewMode();
  }, [viewMode, isLoadingSettings]);

  // Save poster size to settings when it changes
  useEffect(() => {
    if (isLoadingSettings) return;
    const savePosterSize = async () => {
      try {
        const settingsManager = getSettingsManager();
        const quality = posterSize <= 140 ? 'low' : posterSize <= 210 ? 'medium' : 'high';
        await settingsManager.setSetting('imageQuality', quality);
      } catch (error) {
        console.error('Failed to save poster size:', error);
      }
    };
    savePosterSize();
  }, [posterSize, isLoadingSettings]);

  // Create Plex client
  const client = serverConnection && currentToken
    ? createPlexClient({ baseURL: serverConnection.uri, token: currentToken })
    : null;

  // Fetch collections
  const { data: collections, isLoading, error, refetch } = useQuery({
    queryKey: ['collections', libraryKey],
    queryFn: async () => {
      if (!client || !libraryKey) return [];
      const manager = createCollectionManager(client);
      return manager.getCollections(libraryKey);
    },
    enabled: !!client && !!libraryKey,
  });

  // Create collection mutation
  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!client || !libraryKey) throw new Error('No client or library key');
      const manager = createCollectionManager(client);
      return manager.createCollection(libraryKey, title);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', libraryKey] });
      setShowCreateModal(false);
      setNewCollectionTitle('');
    },
  });

  const handleCreateCollection = () => {
    if (newCollectionTitle.trim()) {
      createMutation.mutate(newCollectionTitle.trim());
    }
  };

  // Sort collections alphabetically
  const sortedCollections = useMemo(() => {
    if (!collections) return [];
    return [...collections].sort((a, b) => {
      const titleA = (a.title || '').toUpperCase();
      const titleB = (b.title || '').toUpperCase();
      return titleA.localeCompare(titleB);
    });
  }, [collections]);

  // Handle alphabet jump
  const handleJumpToLetter = useCallback((letter: string) => {
    if (!sortedCollections.length || !contentRef.current) return;
    const targetLetter = letter === '#' ? '0' : letter.toUpperCase();
    const index = sortedCollections.findIndex((c) => {
      const title = (c.title || '').toUpperCase();
      if (letter === '#') return /^[0-9]/.test(title);
      return title.startsWith(targetLetter);
    });
    if (index === -1) return;

    if (viewMode === 'list') {
      // Scroll to the row element
      const rows = contentRef.current.querySelectorAll('[data-collection-row]');
      const targetRow = rows[index] as HTMLElement | undefined;
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // Grid view - scroll to the card
      const cards = contentRef.current.querySelectorAll('[data-collection-card]');
      const targetCard = cards[index] as HTMLElement | undefined;
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [sortedCollections, viewMode]);

  const handleCollectionClick = (collection: Collection) => {
    setSelectedCollection(collection);
  };

  const handleEditorClose = () => {
    setSelectedCollection(null);
    // Refresh collections in case of updates
    refetch();
  };

  if (!libraryKey) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">No library selected</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 animate-fade-in">
      {/* Header / Toolbar with Glass Effect */}
      <div className="sticky top-0 z-50 h-16 px-6 bg-white/75 backdrop-blur-md border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between h-full gap-6">
          {/* Left Section: Title and Stats */}
          <div className="flex items-center gap-4 min-w-0">
            <h1 className="text-xl font-semibold text-text-primary tracking-tight whitespace-nowrap">
              Collections
            </h1>
            <div className="flex items-center gap-2 text-sm text-text-tertiary">
              <span>{sortedCollections.length} {sortedCollections.length === 1 ? 'collection' : 'collections'}</span>
            </div>
          </div>

          {/* Right Section: Actions and View Toggle */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Selection Actions */}
            {selectedItems.size > 0 && (
              <>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => {
                    const itemsToRefresh = sortedCollections.filter((c) => selectedItems.has(c.ratingKey));
                    if (itemsToRefresh.length > 0) {
                      setShowRefreshModal(true);
                    }
                  }}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                >
                  Refresh ({selectedItems.size})
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setSelectedItems(new Set())}
                >
                  Clear
                </Button>
              </>
            )}
            {/* Poster Size Slider (only in grid view) */}
            {viewMode === 'grid' && (
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-background-secondary rounded-lg">
                <svg className="w-4 h-4 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="range"
                  min="80"
                  max="320"
                  step="20"
                  value={posterSize}
                  onChange={(e) => setPosterSize(parseInt(e.target.value))}
                  className="w-32 h-2 bg-secondary-300 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  aria-label="Poster size"
                />
                <span className="text-xs text-text-tertiary font-medium w-12 text-right">
                  {posterSize}px
                </span>
              </div>
            )}

            {/* Select All / Deselect All (only in list view) */}
            {viewMode === 'list' && (
              <Button
                variant="ghost"
                size="small"
                onClick={() => {
                  if (selectedItems.size === sortedCollections.length) {
                    setSelectedItems(new Set());
                  } else {
                    setSelectedItems(new Set(sortedCollections.map((c) => c.ratingKey)));
                  }
                }}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {selectedItems.size === sortedCollections.length ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                }
                title={selectedItems.size === sortedCollections.length ? 'Deselect All' : 'Select All'}
              >
                {selectedItems.size === sortedCollections.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}

            {/* View Toggle Buttons */}
            <div className="inline-flex items-center gap-1 bg-background-secondary rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all duration-150 ${
                  viewMode === 'grid'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-text-tertiary hover:text-text-primary hover:bg-white/50'
                }`}
                aria-label="Grid view"
                title="Grid view"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all duration-150 ${
                  viewMode === 'list'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-text-tertiary hover:text-text-primary hover:bg-white/50'
                }`}
                aria-label="List view"
                title="List view"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              New Collection
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden bg-background-primary" style={{ height: `calc(100vh - ${typeof window !== 'undefined' && (window as any).electron ? 96 : 64}px)` }}>
        <div className="h-full w-full relative">
          <div className={`h-full overflow-y-auto ${viewMode === 'grid' ? 'p-6' : ''}`} ref={contentRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-red-600 dark:text-red-400 mb-4">Failed to load collections</p>
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : sortedCollections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <svg
              className="h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 mb-4">No collections yet</p>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              Create Your First Collection
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="pr-8" style={{ display: 'grid', gridTemplateColumns: `repeat(${columns_grid}, minmax(0, 1fr))`, gap: '16px' }}>
            {sortedCollections.map((collection) => (
              <div key={collection.ratingKey} data-collection-card>
                <CollectionCard
                  collection={collection}
                  serverUrl={serverConnection?.uri || ''}
                  token={currentToken || ''}
                  onClick={() => handleCollectionClick(collection)}
                  posterSize={posterSize}
                />
              </div>
            ))}
          </div>
        ) : (
          <CollectionListView
            collections={sortedCollections}
            serverUrl={serverConnection?.uri || ''}
            token={currentToken || ''}
            onCollectionClick={handleCollectionClick}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
          />
        )}
          </div>
          {sortedCollections.length > 0 && (
            <AlphabetJumpList
              items={sortedCollections.map((c) => ({ title: c.title, ratingKey: c.ratingKey }))}
              onJumpToLetter={handleJumpToLetter}
            />
          )}
        </div>
      </div>

      {/* Collection Editor Modal */}
      {selectedCollection && client && serverConnection && currentToken && (
        <CollectionEditor
          collection={selectedCollection}
          client={client}
          serverUrl={serverConnection.uri}
          token={currentToken}
          onClose={handleEditorClose}
          onSave={() => refetch()}
        />
      )}

      {/* Create Collection Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewCollectionTitle('');
        }}
        title="Create New Collection"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Collection Name
            </label>
            <input
              type="text"
              value={newCollectionTitle}
              onChange={(e) => setNewCollectionTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateCollection();
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Marvel Movies, 80s Classics"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setNewCollectionTitle('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateCollection}
              disabled={!newCollectionTitle.trim() || createMutation.isPending}
              loading={createMutation.isPending}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Metadata Refresh Modal */}
      {showRefreshModal && (
        <MetadataRefreshModal
          items={sortedCollections.filter((c) => selectedItems.has(c.ratingKey)) as any}
          serverUrl={serverConnection?.uri || ''}
          token={currentToken || ''}
          onClose={() => setShowRefreshModal(false)}
          onComplete={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}

/**
 * Collection Card Component
 */
interface CollectionCardProps {
  collection: Collection;
  serverUrl: string;
  token: string;
  onClick: () => void;
  posterSize?: number;
}

function CollectionCard({ collection, serverUrl, token, onClick, posterSize = 180 }: CollectionCardProps) {
  const thumbUrl = collection.thumb
    ? `${serverUrl}${collection.thumb}?X-Plex-Token=${token}`
    : null;

  return (
    <div
      className="group cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={collection.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <span className="text-white text-xs font-medium">
            {collection.childCount} {collection.childCount === 1 ? 'movie' : 'movies'}
          </span>
        </div>
      </div>
      <div className="mt-2">
        <h3 className={`font-medium text-gray-900 dark:text-gray-100 truncate ${posterSize < 140 ? 'text-xs' : 'text-sm'}`}>
          {collection.title}
        </h3>
        {collection.summary && posterSize >= 140 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
            {collection.summary}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Collection List View Component
 * Flex-based table matching the Movies TableListView layout
 */
interface CollectionListViewProps {
  collections: Collection[];
  serverUrl: string;
  token: string;
  onCollectionClick: (collection: Collection) => void;
  selectedItems?: Set<string>;
  onSelectionChange?: (selectedItems: Set<string>) => void;
}

function CollectionListView({ collections, serverUrl, token, onCollectionClick, selectedItems, onSelectionChange }: CollectionListViewProps) {
  const rowHeight = 56;

  return (
    <div className="flex flex-col h-full bg-background-primary">
      {/* Sticky Table Header */}
      <div className="flex-shrink-0 bg-white border-b border-border sticky top-0 z-40">
        <div className="flex items-center h-12 pr-8">
          {/* Checkbox column */}
          {onSelectionChange && (
            <div className="px-4 w-14 flex-shrink-0 flex items-center justify-center">
              <input
                type="checkbox"
                checked={selectedItems?.size === collections.length && collections.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelectionChange(new Set(collections.map((c) => c.ratingKey)));
                  } else {
                    onSelectionChange(new Set());
                  }
                }}
                className="w-4 h-4 accent-primary-600 border-secondary-300 rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
              />
            </div>
          )}
          {/* Title column header */}
          <div
            className="px-4 text-xs font-semibold text-[#64748B] uppercase tracking-[0.05em]"
            style={{ flex: 1, minWidth: 140 }}
          >
            <div className="flex items-center justify-start">
              <span className="whitespace-nowrap">Title</span>
            </div>
          </div>
          {/* Movies column header */}
          <div
            className="px-4 text-xs font-semibold text-[#64748B] uppercase tracking-[0.05em]"
            style={{ width: 100, minWidth: 100, flex: '0 0 auto' }}
          >
            <div className="flex items-center justify-center">
              <span className="whitespace-nowrap">Movies</span>
            </div>
          </div>
          {/* Summary column header */}
          <div
            className="px-4 text-xs font-semibold text-[#64748B] uppercase tracking-[0.05em]"
            style={{ flex: 1, minWidth: 140 }}
          >
            <div className="flex items-center justify-start">
              <span className="whitespace-nowrap">Summary</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-auto">
        {collections.map((collection) => {
          const thumbUrl = collection.thumb
            ? `${serverUrl}/photo/:/transcode?url=${encodeURIComponent(collection.thumb)}&width=34&height=50&X-Plex-Token=${token}`
            : null;
          const isChecked = selectedItems?.has(collection.ratingKey) || false;

          return (
            <div
              key={collection.ratingKey}
              data-collection-row
              onClick={() => onCollectionClick(collection)}
              className={`group flex items-center border-b border-border cursor-pointer transition-all duration-150 pr-8 ${
                isChecked ? 'bg-primary-50' : 'hover:bg-background-primary'
              }`}
              style={{ height: `${rowHeight}px` }}
            >
              {/* Checkbox column */}
              {onSelectionChange && (
                <div className="px-4 w-14 flex-shrink-0 flex items-center">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      e.stopPropagation();
                      const newSelection = new Set(selectedItems);
                      if (e.target.checked) {
                        newSelection.add(collection.ratingKey);
                      } else {
                        newSelection.delete(collection.ratingKey);
                      }
                      onSelectionChange(newSelection);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 accent-primary-600 border-secondary-300 rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
                  />
                </div>
              )}
              {/* Title column with poster */}
              <div
                className="px-4 text-sm text-text-primary flex items-center gap-3"
                style={{ flex: 1, minWidth: 140 }}
              >
                <div className="w-[34px] h-[50px] bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={collection.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-text-primary truncate">
                  {collection.title}
                </span>
              </div>
              {/* Movies column */}
              <div
                className="px-4 text-sm text-text-secondary"
                style={{ width: 100, minWidth: 100, flex: '0 0 auto', textAlign: 'center' }}
              >
                {collection.childCount}
              </div>
              {/* Summary column */}
              <div
                className="px-4 text-sm text-text-secondary"
                style={{ flex: 1, minWidth: 140 }}
              >
                <span className="line-clamp-1">
                  {collection.summary || '\u2014'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
