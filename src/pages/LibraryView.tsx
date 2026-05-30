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
import { DetailPanel } from '@/components/library/DetailPanel';
import { ColumnSelector } from '@/components/library/ColumnSelector';
import { MetadataRefreshModal } from '@/components/library/MetadataRefreshModal';
import { AlphabetJumpList } from '@/components/library/AlphabetJumpList';
import { getColumnDefinitions } from '@/components/library/columnDefinitions';
import { useResponsiveColumns } from '@/hooks/useResponsiveColumns';
import { useColumnSettings } from '@/hooks/useColumnSettings';
import { ResizablePanes } from '@/components/ui/ResizablePanes';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { TableLoadingState } from '@/components/ui/TableLoadingState';
import { GridLoadingState } from '@/components/ui/GridLoadingState';
import { LibraryEmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { db } from '@/db/database';

type ViewMode = 'grid' | 'list';
type MusicViewMode = 'artists' | 'albums';

/**
 * LibraryView Component
 * Main page for displaying library content
 */
export function LibraryView() {
  const { libraryKey } = useParams<{ libraryKey: string }>();
  const { serverConnection, currentToken, selectedLibrary } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [musicViewMode, setMusicViewMode] = useState<MusicViewMode>('artists');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [cachedItems, setCachedItems] = useState<Map<string, { isCached: boolean; isDirty: boolean }>>(new Map());
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [posterSize, setPosterSize] = useState<number>(180); // Default 180px
  const pageSize = 200; // Page size for infinite scroll
  const gridRef = useRef<{ scrollToLetter: (letter: string) => void } | null>(null);
  const pendingScrollIndex = useRef<number | null>(null);
  
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

  // Clear selected item when library changes so the detail panel hides
  useEffect(() => {
    setSelectedItem(null);
    setSelectedItems(new Set());
  }, [activeLibraryKey]);
  
  // Check if this is a TV show library or music library
  const isTVShowLibrary = libraryType === 'show';
  const isMusicLibrary = libraryType === 'artist';

  // Get default columns for this library type
  const defaultColumns = getColumnDefinitions(libraryType);
  
  // Use persistent column settings
  const [columns, setColumns] = useColumnSettings(libraryType, defaultColumns);

  // Debug logging removed to prevent performance issues

  // Fetch ALL item titles for alphabet navigation (lightweight query)
  const { data: allTitles, isLoading: isLoadingTitles } = useQuery({
    queryKey: queryKeys.libraryItems(activeLibraryKey || '', { titlesOnly: true, musicViewMode }),
    queryFn: async () => {
      if (!serverConnection || !currentToken || !activeLibraryKey) {
        throw new Error('No server connection, token, or library selected');
      }

      const client = createPlexClient({
        baseURL: serverConnection.uri,
        token: currentToken,
      });

      // Fetch all titles directly with a large container size
      // Note: For movies, Plex doesn't return accurate totalSize with size=0, so we fetch directly
      const fullResponse = await client.get(`/library/sections/${activeLibraryKey}/all`, {
        params: {
          'X-Plex-Container-Size': 10000, // Large enough for most libraries
          sort: 'titleSort:asc',
          ...(isTVShowLibrary ? { type: 2 } : {}),
          ...(isMusicLibrary ? { type: musicViewMode === 'artists' ? 8 : 9 } : {}),
        },
      });

      const titles = fullResponse.MediaContainer?.Metadata || [];
      return titles;
    },
    enabled: !!serverConnection && !!currentToken && !!activeLibraryKey,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

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
      // For music libraries, fetch artists (type 8) or albums (type 9) based on view mode
      ...(isMusicLibrary ? { type: musicViewMode === 'artists' ? 8 : 9 } : {}),
    }),
    queryFn: async ({ pageParam = 0 }) => {
      if (!serverConnection || !currentToken || !activeLibraryKey) {
        throw new Error('No server connection, token, or library selected');
      }

      const client = createPlexClient({
        baseURL: serverConnection.uri,
        token: currentToken,
      });

      const manager = createLibraryManager(client);
      
      // Build filter params - all params go at the top level for Plex API
      const filterParams: any = {
        type: isTVShowLibrary ? 2 : isMusicLibrary ? (musicViewMode === 'artists' ? 8 : 9) : undefined,
        offset: pageParam,
        limit: pageSize,
        sort: 'titleSort:asc', // Sort alphabetically by title
      };
      
      const result = await manager.getLibraryItems(activeLibraryKey, filterParams);
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

  // Preload all items in the background for instant alphabet navigation
  useEffect(() => {
    let isCancelled = false;
    
    const preloadAllItems = async () => {
      // Only preload if we have items and more pages to load
      if (!allItems.length || !hasNextPage || isFetchingNextPage) return;
      
      // Wait a bit after initial load before starting background preload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (isCancelled) return;
      
      // Load all remaining pages in the background
      let pagesLoaded = 0;
      const maxPages = 100; // Safety limit to prevent infinite loops
      
      while (hasNextPage && !isFetchingNextPage && !isCancelled && pagesLoaded < maxPages) {
        try {
          await fetchNextPage();
          pagesLoaded++;
          // Small delay between requests to avoid blocking the UI
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          // Silently fail background preload
          break;
        }
      }
    };
    
    preloadAllItems();
    
    return () => {
      isCancelled = true;
    };
  }, [allItems.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  // Function to fetch children (seasons/episodes for TV, albums/tracks for Music)
  const getChildrenFn = async (item: LibraryItem): Promise<LibraryItem[]> => {
    if (!serverConnection || !currentToken) return [];
    const client = createPlexClient({ baseURL: serverConnection.uri, token: currentToken });
    
    try {
      if (isTVShowLibrary) {
        // Fetch seasons for a show
        const response = await client.get(`/library/metadata/${item.ratingKey}/children`, {
          params: { 'X-Plex-Container-Size': 100 },
        });
        const seasons = response.MediaContainer?.Metadata || [];
        return seasons.map((s: any) => ({
          ratingKey: s.ratingKey,
          key: s.key,
          guid: s.guid,
          type: s.type,
          title: s.title,
          parentTitle: s.parentTitle,
          index: s.index,
          thumb: s.thumb,
          year: s.year,
          duration: s.duration,
          rating: s.rating,
          userRating: s.userRating,
        }));
      } else if (isMusicLibrary) {
        // Fetch albums for an artist, or tracks for an album
        const response = await client.get(`/library/metadata/${item.ratingKey}/children`, {
          params: { 'X-Plex-Container-Size': 200 },
        });
        const children = response.MediaContainer?.Metadata || [];
        return children.map((c: any) => ({
          ratingKey: c.ratingKey,
          key: c.key,
          guid: c.guid,
          type: c.type,
          title: c.title,
          parentTitle: c.parentTitle,
          index: c.index,
          thumb: c.thumb,
          year: c.year,
          duration: c.duration,
          rating: c.rating,
          userRating: c.userRating,
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch children:', error);
      return [];
    }
  };

  // Effect to handle pending scroll after items are loaded
  useEffect(() => {
    const targetIndex = pendingScrollIndex.current;
    if (targetIndex === null || targetIndex < 0) return;
    if (targetIndex >= allItems.length) return; // Items not loaded yet
    
    // Clear the pending scroll
    pendingScrollIndex.current = null;
    
    // Wait for DOM to update then scroll
    requestAnimationFrame(() => {
      scrollToIndex(targetIndex);
    });
  }, [allItems.length]);

  // Handle alphabet jump - scroll to first item starting with letter
  const handleJumpToLetter = async (letter: string) => {
    // If titles are still loading, wait for them
    if (isLoadingTitles || !allTitles || allTitles.length === 0) {
      return;
    }
    
    // Find the first item starting with this letter in currently loaded items
    const targetLetter = letter === '#' ? '0' : letter.toUpperCase();
    const targetIndex = allItems.findIndex(item => {
      const title = (item.titleSort || item.title || '').toUpperCase();
      if (letter === '#') {
        return /^[0-9]/.test(title);
      } else {
        return title.startsWith(targetLetter);
      }
    });
    
    // If found in loaded items, scroll immediately
    if (targetIndex !== -1) {
      scrollToIndex(targetIndex);
      return;
    }
    
    // If not found in loaded items, find it in allTitles and load pages
    const targetIndexInAll = (allTitles || []).findIndex((item: any) => {
      const title = (item.titleSort || item.title || '').toUpperCase();
      if (letter === '#') {
        return /^[0-9]/.test(title);
      } else {
        return title.startsWith(targetLetter);
      }
    });
    
    if (targetIndexInAll === -1) {
      return;
    }
    
    // Set pending scroll so the effect will scroll after items load
    pendingScrollIndex.current = targetIndexInAll;
    
    // Load pages until we have the target item
    const pagesToLoad = Math.ceil((targetIndexInAll + 1 - allItems.length) / pageSize);
    for (let i = 0; i < pagesToLoad && hasNextPage; i++) {
      await fetchNextPage();
    }
  };
  
  // Helper function to scroll to a specific index
  const scrollToIndex = (index: number) => {
    // First try to use the grid ref if available (grid view)
    if (gridRef.current && viewMode === 'grid') {
      const targetItem = allItems[index];
      if (targetItem) {
        const firstChar = targetItem.title.charAt(0).toUpperCase();
        const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
        gridRef.current.scrollToLetter(letter);
        return;
      }
    }
    
    // For list view - use the virtualizer's scrollToIndex via the data-item-key
    const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto');
    
    if (scrollContainers.length === 0) return;
    
    const targetItem = allItems[index];
    if (!targetItem) return;
    
    // Find the correct scroll container (the one with virtualized content)
    scrollContainers.forEach((container: Element) => {
      const htmlContainer = container as HTMLElement;
      
      // Try to find the element by data-item-key attribute (most reliable for virtualized lists)
      const targetElement = container.querySelector(`[data-item-key="${targetItem.ratingKey}"]`);
      
      if (targetElement) {
        // Calculate the offset accounting for sticky header
        const containerRect = htmlContainer.getBoundingClientRect();
        const elementRect = (targetElement as HTMLElement).getBoundingClientRect();
        const stickyHeaderOffset = 48; // Height of the sticky table header (h-12 = 48px)
        const offset = elementRect.top - containerRect.top - stickyHeaderOffset;
        
        htmlContainer.scrollTo({
          top: htmlContainer.scrollTop + offset,
          behavior: 'auto'
        });
      } else {
        // Fallback: calculate position based on row height
        // Use the actual estimatedItemHeight passed to TableListView (56px)
        const itemHeight = 56;
        const scrollTop = index * itemHeight;
        htmlContainer.scrollTo({
          top: scrollTop,
          behavior: 'auto'
        });
      }
    });
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

  if (isLoading && !data) {
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

  if (!data || (allItems.length === 0 && !isLoading && !isFetchingNextPage)) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-background-primary">
        {/* Header / Toolbar with Glass Effect */}
        <div className="sticky top-0 z-50 h-16 px-6 bg-white/75 backdrop-blur-md border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between h-full gap-6">
            {/* Left Section: Title */}
            <div className="flex items-center gap-4 min-w-0">
              <h1 className="text-xl font-semibold text-text-primary tracking-tight whitespace-nowrap">
                {selectedLibrary?.title || 'Library'}
              </h1>
            </div>
          </div>
        </div>
        
        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <LibraryEmptyState libraryName={selectedLibrary?.title || 'library'} />
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
      fetchNextPage();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-fade-in">
      {/* Header / Toolbar with Glass Effect */}
      <div className="sticky top-0 z-50 h-16 px-6 bg-white/75 backdrop-blur-md border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between h-full gap-6">
          {/* Left Section: Title and Stats */}
          <div className="flex items-center gap-4 min-w-0">
            <h1 className="text-xl font-semibold text-text-primary tracking-tight whitespace-nowrap">
              {selectedLibrary?.title || 'Library'}
            </h1>
            <div className="flex items-center gap-2 text-sm text-text-tertiary">
              <span>{totalSize} items</span>
              {allItems.length < totalSize && (
                <>
                  <span>•</span>
                  <span className="text-secondary-500">
                    Loaded {allItems.length}
                  </span>
                </>
              )}
              {selectedItems.size > 0 && (
                <>
                  <span>•</span>
                  <span className="text-primary-600 font-medium">
                    {selectedItems.size} selected
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right Section: Actions and View Toggle */}
          <div className="flex items-center gap-3 flex-shrink-0">
          {/* Music View Mode Toggle (Artists/Albums) */}
          {isMusicLibrary && (
            <div className="inline-flex items-center gap-1 bg-background-secondary rounded-xl p-1">
              <button
                onClick={() => setMusicViewMode('artists')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                  musicViewMode === 'artists'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/50'
                }`}
              >
                Artists
              </button>
              <button
                onClick={() => setMusicViewMode('albums')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                  musicViewMode === 'albums'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/50'
                }`}
              >
                Albums
              </button>
            </div>
          )}

          {/* Selection Actions */}
          {selectedItems.size > 0 && (
            <>
              <Button
                variant="primary"
                size="small"
                onClick={() => {
                  const itemsToRefresh = allItems.filter((item) => selectedItems.has(item.ratingKey));
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

          {/* Select All / Deselect All */}
          {viewMode === 'list' && (
            <Button
              variant="ghost"
              size="small"
              onClick={() => {
                if (selectedItems.size === allItems.length) {
                  setSelectedItems(new Set());
                } else {
                  setSelectedItems(new Set(allItems.map((item) => item.ratingKey)));
                }
              }}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {selectedItems.size === allItems.length ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
              }
              title={selectedItems.size === allItems.length ? 'Deselect All' : 'Select All'}
            >
              {selectedItems.size === allItems.length ? 'Deselect All' : 'Select All'}
            </Button>
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

          {viewMode === 'list' && (
            <ColumnSelector columns={columns} onColumnsChange={setColumns} />
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex bg-background-primary" style={{ height: `calc(100vh - ${typeof window !== 'undefined' && (window as any).electron ? 160 : 128}px)` }}>
        {selectedItem ? (
          <ResizablePanes
            leftPane={
              <div className="h-full overflow-hidden relative">
                {viewMode === 'grid' ? (
                  <VirtualGrid
                    ref={gridRef}
                    items={allItems}
                    serverUrl={serverConnection?.uri || ''}
                    token={currentToken || ''}
                    onItemClick={(item) => setSelectedItem(item)}
                    getCacheStatus={getCacheStatus}
                    columns={columns_grid}
                    gap={24}
                    posterSize={posterSize}
                    estimatedItemHeight={Math.round(posterSize * 1.5) + 120}
                    onScroll={handleScroll}
                    squarePosters={isMusicLibrary}
                  />
                ) : (
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
                    isExpandable={isTVShowLibrary || isMusicLibrary}
                    getChildren={isTVShowLibrary || isMusicLibrary ? getChildrenFn : undefined}
                    squarePosters={isMusicLibrary}
                    isMusicLibrary={isMusicLibrary}
                  />
                )}
                {/* Alphabet Jump List - show for all views */}
                <AlphabetJumpList
                  items={allTitles || allItems}
                  onJumpToLetter={handleJumpToLetter}
                  isLoading={isLoadingTitles}
                />
                {/* Loading indicator */}
                {isFetchingNextPage && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg">
                    Loading more...
                  </div>
                )}
              </div>
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
          <div className="w-full h-full overflow-hidden relative flex flex-col">
            {viewMode === 'grid' ? (
              <div className="flex-1 min-h-0 relative flex flex-col">
                <div className="flex-1 min-h-0">
                  <VirtualGrid
                    ref={gridRef}
                    items={allItems}
                    serverUrl={serverConnection?.uri || ''}
                    token={currentToken || ''}
                    onItemClick={(item) => setSelectedItem(item)}
                    getCacheStatus={getCacheStatus}
                    columns={columns_grid}
                    gap={24}
                    posterSize={posterSize}
                    estimatedItemHeight={Math.round(posterSize * 1.5) + 120}
                    onScroll={handleScroll}
                    squarePosters={isMusicLibrary}
                  />
                </div>
                {/* Alphabet Jump List - only show in grid view */}
                <AlphabetJumpList
                  items={allTitles || allItems}
                  onJumpToLetter={handleJumpToLetter}
                  isLoading={isLoadingTitles}
                />
                {/* Loading indicator */}
                {isFetchingNextPage && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg">
                    Loading more...
                  </div>
                )}
              </div>
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
                    isExpandable={isTVShowLibrary || isMusicLibrary}
                    getChildren={isTVShowLibrary || isMusicLibrary ? getChildrenFn : undefined}
                    squarePosters={isMusicLibrary}
                    isMusicLibrary={isMusicLibrary}
                  />
                </div>
                {/* Alphabet Jump List */}
                <AlphabetJumpList
                  items={allTitles || allItems}
                  onJumpToLetter={handleJumpToLetter}
                  isLoading={isLoadingTitles}
                />
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
    </div>
  );
}

export default LibraryView;




