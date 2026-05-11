import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/appStore';
import { createLibraryManager, type LibraryItem } from '@/managers/LibraryManager';
import { createPlexClient } from '@/api/plexClient';
import { getSettingsManager } from '@/managers/SettingsManager';
import { queryKeys } from '@/api/queryKeys';
import { VirtualGrid } from '@/components/library/VirtualGrid';
import { TableListView } from '@/components/library/TableListView';
import { TVShowTreeView } from '@/components/library/TVShowTreeView';
import { DetailPanel } from '@/components/library/DetailPanel';
import { ColumnSelector } from '@/components/library/ColumnSelector';
import { MetadataRefreshModal } from '@/components/library/MetadataRefreshModal';
import { AlphabetJumpList } from '@/components/library/AlphabetJumpList';
import { getColumnDefinitions } from '@/components/library/columnDefinitions';
import { useResponsiveColumns } from '@/hooks/useResponsiveColumns';
import { useColumnSettings } from '@/hooks/useColumnSettings';
import { ResizablePanes } from '@/components/ui/ResizablePanes';
import { db } from '@/db/database';

type ViewMode = 'grid' | 'list';

/**
 * LibraryView Component
 * Main page for displaying library content
 */
export function LibraryView() {
  const { libraryKey } = useParams<{ libraryKey: string }>();
  const { serverConnection, currentToken, selectedLibrary } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [cachedItems, setCachedItems] = useState<Map<string, { isCached: boolean; isDirty: boolean }>>(new Map());
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [posterSize, setPosterSize] = useState<number>(180); // Default 180px
  const pageSize = 200; // Page size for infinite scroll
  const gridRef = useRef<{ scrollToLetter: (letter: string) => void } | null>(null);
  
  // Load poster size from settings
  useEffect(() => {
    const loadPosterSize = async () => {
      try {
        const settingsManager = getSettingsManager();
        const settings = await settingsManager.getSettings();
        // Use imageQuality setting to determine poster size
        // low: 120px, medium: 180px, high: 240px
        const sizeMap = { low: 120, medium: 180, high: 240 };
        setPosterSize(sizeMap[settings.imageQuality] || 180);
      } catch (error) {
        console.error('Failed to load poster size:', error);
      }
    };
    loadPosterSize();
  }, []);

  // Save poster size to settings when it changes
  useEffect(() => {
    const savePosterSize = async () => {
      try {
        const settingsManager = getSettingsManager();
        // Map poster size to imageQuality setting
        // 80-140: low, 141-210: medium, 211+: high
        const quality = posterSize <= 140 ? 'low' : posterSize <= 210 ? 'medium' : 'high';
        await settingsManager.setSetting('imageQuality', quality);
      } catch (error) {
        console.error('Failed to save poster size:', error);
      }
    };
    savePosterSize();
  }, [posterSize]);
  
  // Calculate columns based on poster size
  const columns_grid = useResponsiveColumns({ 
    minColumnWidth: posterSize, 
    maxColumns: 12, 
    gap: 8 // Reduced from 16 to 8 for tighter spacing like Plex
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsManager = getSettingsManager();
        const settings = await settingsManager.getSettings();
        setViewMode(settings.defaultView);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  // Save viewMode to settings when it changes
  useEffect(() => {
    if (isLoadingSettings) return; // Don't save during initial load
    
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

  // Use libraryKey from URL if available, otherwise use selectedLibrary
  const activeLibraryKey = libraryKey || selectedLibrary?.key;
  const libraryType = selectedLibrary?.type || 'movie';
  
  // Check if this is a TV show library
  const isTVShowLibrary = libraryType === 'show';

  // Get default columns for this library type
  const defaultColumns = getColumnDefinitions(libraryType);
  
  // Use persistent column settings
  const [columns, setColumns] = useColumnSettings(libraryType, defaultColumns);

  // Debug logging
  useEffect(() => {
    console.log('Selected item changed:', selectedItem?.title, 'View mode:', viewMode);
  }, [selectedItem, viewMode]);

  // Fetch library items with infinite scroll
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.libraryItems(activeLibraryKey || '', {
      offset: 0,
      limit: pageSize,
      // For TV show libraries, only fetch shows (type 2), not seasons/episodes
      ...(isTVShowLibrary ? { type: 2 } : {}),
    }),
    queryFn: async ({ pageParam = 0 }) => {
      console.log('[LibraryView] Fetching page:', { pageParam, pageSize, isTVShowLibrary });
      
      if (!serverConnection || !currentToken || !activeLibraryKey) {
        throw new Error('No server connection, token, or library selected');
      }

      const client = createPlexClient({
        baseURL: serverConnection.uri,
        token: currentToken,
      });

      const manager = createLibraryManager(client);
      const result = await manager.getLibraryItems(activeLibraryKey, {
        offset: pageParam,
        limit: pageSize,
        // For TV show libraries, only fetch shows (type 2)
        ...(isTVShowLibrary ? { type: 2 } : {}),
      });
      
      console.log('[LibraryView] Page fetched:', {
        offset: pageParam,
        itemsReceived: result.items.length,
        totalSize: result.totalSize,
        isTVShowLibrary,
        firstItem: result.items[0],
      });
      
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedItems = allPages.reduce((sum, page) => sum + page.items.length, 0);
      const hasMore = loadedItems < lastPage.totalSize;
      return hasMore ? loadedItems : undefined;
    },
    enabled: !!serverConnection && !!currentToken && !!activeLibraryKey,
    initialPageParam: 0,
  });

  // Flatten all pages into single items array
  const allItems = data?.pages.flatMap((page) => page.items) || [];
  const totalSize = data?.pages[0]?.totalSize || 0;

  // Check cache status for items
  useEffect(() => {
    const checkCacheStatus = async () => {
      if (!allItems.length) return;

      const statusMap = new Map<string, { isCached: boolean; isDirty: boolean }>();
      
      for (const item of allItems) {
        const record = await db.metadata.get(item.ratingKey);
        statusMap.set(item.ratingKey, {
          isCached: !!record,
          isDirty: record?.dirty || false,
        });
      }
      
      setCachedItems(statusMap);
    };

    checkCacheStatus();
  }, [allItems]);

  // Helper function to get cache status
  const getCacheStatus = (ratingKey: string) => {
    return cachedItems.get(ratingKey) || { isCached: false, isDirty: false };
  };

  // Handle alphabet jump
  const handleJumpToLetter = (letter: string) => {
    if (gridRef.current) {
      gridRef.current.scrollToLetter(letter);
    }
  };

  if (!activeLibraryKey) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            No library selected
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a library from the sidebar to get started
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="mt-2 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="mt-1 h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Failed to load library
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {(error as Error).message}
          </p>
        </div>
      </div>
    );
  }

  if (!data || allItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            No items found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This library is empty
          </p>
        </div>
      </div>
    );
  }

  // Scroll handler for infinite scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight;
    
    // Load more when scrolled 80% down
    if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
      console.log('[LibraryView] Loading next page at', allItems.length, 'items');
      fetchNextPage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {selectedLibrary?.title || 'Library'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {totalSize} items
            {allItems.length < totalSize && (
              <span className="ml-2 text-secondary-500 dark:text-secondary-400">
                • Loaded {allItems.length}
              </span>
            )}
            {selectedItems.size > 0 && (
              <span className="ml-2 text-primary-600 dark:text-primary-400">
                • {selectedItems.size} selected
              </span>
            )}
          </p>
        </div>

        {/* View Toggle and Column Selector */}
        <div className="flex items-center space-x-4">
          {/* Selection Actions */}
          {selectedItems.size > 0 && (
            <>
              <button
                onClick={() => {
                  const itemsToRefresh = allItems.filter((item) => selectedItems.has(item.ratingKey));
                  if (itemsToRefresh.length > 0) {
                    setShowRefreshModal(true);
                  }
                }}
                className="px-3 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Metadata ({selectedItems.size})
              </button>
              <button
                onClick={() => setSelectedItems(new Set())}
                className="px-3 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded transition-colors"
              >
                Clear Selection
              </button>
            </>
          )}

          {/* Select All / Deselect All */}
          {viewMode === 'list' && (
            <button
              onClick={() => {
                if (selectedItems.size === allItems.length) {
                  setSelectedItems(new Set());
                } else {
                  setSelectedItems(new Set(allItems.map((item) => item.ratingKey)));
                }
              }}
              className="px-3 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded transition-colors flex items-center gap-2"
              title={selectedItems.size === allItems.length ? 'Deselect All' : 'Select All'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {selectedItems.size === allItems.length ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              {selectedItems.size === allItems.length ? 'Deselect All' : 'Select All'}
            </button>
          )}

          {/* Poster Size Slider (only in grid view) */}
          {viewMode === 'grid' && (
            <div className="flex items-center gap-3 px-3 py-2 bg-secondary-100 dark:bg-secondary-800 rounded-md">
              <svg className="w-4 h-4 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="range"
                min="80"
                max="320"
                step="20"
                value={posterSize}
                onChange={(e) => setPosterSize(parseInt(e.target.value))}
                className="w-32 h-2 bg-secondary-300 dark:bg-secondary-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
                aria-label="Poster size"
              />
              <span className="text-xs text-secondary-600 dark:text-secondary-400 w-12">
                {posterSize}px
              </span>
            </div>
          )}

          {viewMode === 'list' && (
            <ColumnSelector columns={columns} onColumnsChange={setColumns} />
          )}
          
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${
              viewMode === 'grid'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            aria-label="Grid view"
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
            className={`p-2 rounded-md ${
              viewMode === 'list'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            aria-label="List view"
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
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex">
        {selectedItem ? (
          <ResizablePanes
            leftPane={
              isTVShowLibrary ? (
                // TV Show Tree View
                <TVShowTreeView
                  items={allItems}
                  serverUrl={serverConnection?.uri || ''}
                  token={currentToken || ''}
                  onItemClick={(item) => setSelectedItem(item)}
                  selectedItem={selectedItem}
                  selectedItems={selectedItems}
                  onSelectionChange={setSelectedItems}
                  getCacheStatus={getCacheStatus}
                  onScroll={handleScroll}
                />
              ) : viewMode === 'grid' ? (
                <div className="h-full overflow-hidden relative">
                  <VirtualGrid
                    ref={gridRef}
                    items={allItems}
                    serverUrl={serverConnection?.uri || ''}
                    token={currentToken || ''}
                    onItemClick={(item) => setSelectedItem(item)}
                    getCacheStatus={getCacheStatus}
                    columns={columns_grid}
                    gap={8}
                    posterSize={posterSize}
                    estimatedItemHeight={Math.round(posterSize * 1.5) + 120}
                    onScroll={handleScroll}
                  />
                  {/* Alphabet Jump List - only show in grid view */}
                  <AlphabetJumpList
                    items={allItems}
                    onJumpToLetter={handleJumpToLetter}
                  />
                  {/* Loading indicator */}
                  {isFetchingNextPage && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg">
                      Loading more...
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative h-full">
                  <TableListView
                    items={allItems}
                    columns={columns}
                    serverUrl={serverConnection?.uri || ''}
                    token={currentToken || ''}
                    onItemClick={(item) => setSelectedItem(item)}
                    selectedItem={selectedItem}
                    selectedItems={selectedItems}
                    onSelectionChange={setSelectedItems}
                    getCacheStatus={getCacheStatus}
                    estimatedItemHeight={56}
                    onScroll={handleScroll}
                  />
                </div>
              )
            }
            rightPane={
              <DetailPanel
                item={selectedItem}
                serverUrl={serverConnection?.uri || ''}
                token={currentToken || ''}
                onClose={() => setSelectedItem(null)}
              />
            }
            defaultLeftWidth={50}
            minLeftWidth={30}
            minRightWidth={25}
          />
        ) : (
          <div className="w-full h-full min-h-0 overflow-hidden relative">
            {isTVShowLibrary ? (
              // TV Show Tree View (no detail panel)
              <>
                <TVShowTreeView
                  items={allItems}
                  serverUrl={serverConnection?.uri || ''}
                  token={currentToken || ''}
                  onItemClick={(item) => setSelectedItem(item)}
                  selectedItem={selectedItem}
                  selectedItems={selectedItems}
                  onSelectionChange={setSelectedItems}
                  getCacheStatus={getCacheStatus}
                  onScroll={handleScroll}
                />
                {/* Loading indicator */}
                {isFetchingNextPage && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg z-10">
                    Loading more...
                  </div>
                )}
              </>
            ) : viewMode === 'grid' ? (
              <>
                <VirtualGrid
                  ref={gridRef}
                  items={allItems}
                  serverUrl={serverConnection?.uri || ''}
                  token={currentToken || ''}
                  onItemClick={(item) => setSelectedItem(item)}
                  getCacheStatus={getCacheStatus}
                  columns={columns_grid}
                  gap={8}
                  posterSize={posterSize}
                  estimatedItemHeight={Math.round(posterSize * 1.5) + 120}
                  onScroll={handleScroll}
                />
                {/* Alphabet Jump List - only show in grid view */}
                <AlphabetJumpList
                  items={allItems}
                  onJumpToLetter={handleJumpToLetter}
                />
                {/* Loading indicator */}
                {isFetchingNextPage && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg">
                    Loading more...
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="relative h-full">
                  <TableListView
                    items={allItems}
                    columns={columns}
                    serverUrl={serverConnection?.uri || ''}
                    token={currentToken || ''}
                    onItemClick={(item) => setSelectedItem(item)}
                    selectedItem={selectedItem}
                    selectedItems={selectedItems}
                    onSelectionChange={setSelectedItems}
                    getCacheStatus={getCacheStatus}
                    estimatedItemHeight={56}
                    onScroll={handleScroll}
                  />
                </div>
                {/* Loading indicator */}
                {isFetchingNextPage && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg z-10">
                    Loading more...
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Metadata Refresh Modal */}
      {showRefreshModal && (
        <MetadataRefreshModal
          items={allItems.filter((item) => selectedItems.has(item.ratingKey))}
          serverUrl={serverConnection?.uri || ''}
          token={currentToken || ''}
          onClose={() => setShowRefreshModal(false)}
          onComplete={() => {
            // Refetch library data
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

export default LibraryView;

