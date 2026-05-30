import { useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { LibraryItem } from '@/managers/LibraryManager';
import type { ColumnDefinition } from './ColumnSelector';
import { formatCellValue } from './columnDefinitions';
import { useAudioPlayer, type AudioTrack } from '@/components/audio/AudioPlayer';

type RowHeightMode = 'comfortable' | 'compact';

interface TableListViewProps {
  items: LibraryItem[];
  columns: ColumnDefinition[];
  serverUrl: string;
  token: string;
  onItemClick: (item: LibraryItem) => void;
  selectedItem?: LibraryItem | null;
  selectedItems?: Set<string>;
  onSelectionChange?: (selectedItems: Set<string>) => void;
  getCacheStatus: (ratingKey: string) => { isCached: boolean; isDirty: boolean };
  estimatedItemHeight?: number;
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  rowHeightMode?: RowHeightMode;
  showPosters?: boolean;
  isExpandable?: boolean;
  getChildren?: (item: LibraryItem) => Promise<LibraryItem[]>;
  squarePosters?: boolean;
  isMusicLibrary?: boolean;
}

export function TableListView({
  items,
  columns,
  serverUrl,
  token,
  onItemClick,
  selectedItem,
  selectedItems,
  onSelectionChange,
  getCacheStatus,
  estimatedItemHeight,
  onSort,
  onScroll,
  rowHeightMode = 'comfortable',
  showPosters = true,
  isExpandable = false,
  getChildren,
  squarePosters = false,
  isMusicLibrary = false,
}: TableListViewProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const parentRef = useRef<HTMLDivElement>(null);
  const [expandedItems, setExpandedItems] = useState<Map<string, { children: LibraryItem[]; isLoading: boolean }>>(new Map());
  const { play, currentTrack, isPlaying, pause, resume } = useAudioPlayer();

  // Helper to create AudioTrack from LibraryItem
  const createAudioTrack = (item: LibraryItem): AudioTrack | null => {
    const media = item['Media']?.[0];
    const part = media?.['Part']?.[0];
    if (!part?.key) return null;
    
    return {
      ratingKey: item.ratingKey,
      title: item.title,
      artist: item.grandparentTitle || item['originalTitle'],
      album: item.parentTitle,
      albumArt: item.parentThumb ? `${serverUrl}${item.parentThumb}?X-Plex-Token=${token}` : 
               item.thumb ? `${serverUrl}${item.thumb}?X-Plex-Token=${token}` : null,
      duration: item.duration,
      streamUrl: `${serverUrl}${part.key}?X-Plex-Token=${token}`,
    };
  };

  // Handle play button click
  const handlePlayTrack = (item: LibraryItem) => {
    const track = createAudioTrack(item);
    if (track) {
      if (currentTrack?.ratingKey === track.ratingKey) {
        if (isPlaying) {
          pause();
        } else {
          resume();
        }
      } else {
        play(track);
      }
    }
  };

  // Build flat list of items with expanded children interleaved
  const flatItems = useCallback(() => {
    const result: { item: LibraryItem; depth: number; parentKey?: string }[] = [];
    for (const item of items) {
      result.push({ item, depth: 0 });
      const expanded = expandedItems.get(item.ratingKey);
      if (expanded && expanded.children.length > 0) {
        for (const child of expanded.children) {
          result.push({ item: child, depth: 1, parentKey: item.ratingKey });
          // Check if child is also expanded (for seasons -> episodes)
          const childExpanded = expandedItems.get(child.ratingKey);
          if (childExpanded && childExpanded.children.length > 0) {
            for (const grandchild of childExpanded.children) {
              result.push({ item: grandchild, depth: 2, parentKey: child.ratingKey });
            }
          }
        }
      }
    }
    return result;
  }, [items, expandedItems])();

  const toggleExpand = async (item: LibraryItem) => {
    const existing = expandedItems.get(item.ratingKey);
    if (existing) {
      // Collapse
      const newMap = new Map(expandedItems);
      newMap.delete(item.ratingKey);
      setExpandedItems(newMap);
    } else if (getChildren) {
      // Expand - load children
      const newMap = new Map(expandedItems);
      newMap.set(item.ratingKey, { children: [], isLoading: true });
      setExpandedItems(newMap);
      try {
        const children = await getChildren(item);
        const updatedMap = new Map(expandedItems);
        updatedMap.set(item.ratingKey, { children, isLoading: false });
        setExpandedItems(updatedMap);
      } catch (error) {
        console.error('Failed to load children:', error);
        const updatedMap = new Map(expandedItems);
        updatedMap.delete(item.ratingKey);
        setExpandedItems(updatedMap);
      }
    }
  };

  const visibleColumns = columns.filter((col) => col.visible);
  
  // Calculate row height based on mode (poster is 50px tall + padding for visual gap)
  const rowHeight = estimatedItemHeight || (rowHeightMode === 'comfortable' ? 70 : 62);
  
  // Helper to get poster thumbnail URL
  const getPosterUrl = (item: LibraryItem) => {
    if (!item.thumb) return null;
    const w = squarePosters ? 50 : 34;
    const h = 50;
    return `${serverUrl}/photo/:/transcode?url=${encodeURIComponent(item.thumb)}&width=${w}&height=${h}&X-Plex-Token=${token}`;
  };

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const handleSort = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId);
    if (!column?.sortable) return;

    const newDirection =
      sortColumn === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortColumn(columnId);
    setSortDirection(newDirection);
    
    if (onSort) {
      onSort(columnId, newDirection);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-background-primary">
      {/* Floating Bulk Actions Toolbar */}
      {selectedItems && selectedItems.size > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in-down">
          <div className="bg-white rounded-xl shadow-floating border border-border px-6 py-3 flex items-center gap-4">
            <span className="text-sm font-medium text-text-secondary">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
            <div className="h-6 w-px bg-border" />
            <button
              onClick={() => {
                // Bulk action placeholder
                console.log('Bulk action on:', Array.from(selectedItems));
              }}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Edit Metadata
            </button>
            <button
              onClick={() => {
                // Bulk action placeholder
                console.log('Bulk refresh on:', Array.from(selectedItems));
              }}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => onSelectionChange?.(new Set())}
              className="text-sm font-medium text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table Header - Sticky */}
      <div className="flex-shrink-0 bg-white border-b border-border sticky top-0 z-40 overflow-x-auto">
        <div className="flex items-center h-12 min-w-max">
          {/* Expand arrow column header spacer */}
          {isExpandable && <div className="w-8 flex-shrink-0" />}
          
          {/* Checkbox column */}
          {onSelectionChange && (
            <div className="px-4 w-14 flex-shrink-0 flex items-center justify-center">
              <input
                type="checkbox"
                checked={selectedItems?.size === items.length && items.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelectionChange(new Set(items.map((item) => item.ratingKey)));
                  } else {
                    onSelectionChange(new Set());
                  }
                }}
                className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
              />
            </div>
          )}
          
          {/* Data columns */}
          {visibleColumns.map((column) => (
            <div
              key={column.id}
              className={`px-4 text-xs font-semibold text-[#64748B] uppercase tracking-[0.05em] ${
                column.sortable ? 'cursor-pointer hover:text-text-secondary transition-colors duration-150' : ''
              }`}
              style={{ width: column.width || 'auto', minWidth: column.width || 140, flex: column.width ? '0 0 auto' : 1 }}
              onClick={() => column.sortable && handleSort(column.id)}
              title={column.label}
            >
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap">{column.label}</span>
                {column.sortable && sortColumn === column.id && (
                  <svg
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Body - Virtualized */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        onScroll={(e) => {
          onScroll?.(e);
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const flatItem = flatItems[virtualRow.index];
            if (!flatItem) return null; // Safety check
            
            const { item, depth } = flatItem;
            const cacheStatus = getCacheStatus(item.ratingKey);
            const isSelected = selectedItem?.ratingKey === item.ratingKey;
            const isChecked = selectedItems?.has(item.ratingKey) || false;
            const isExpanded = expandedItems.has(item.ratingKey);
            const expandState = expandedItems.get(item.ratingKey);
            const canExpand = isExpandable && depth < 2 && getChildren;

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="absolute top-0 left-0 w-full"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  data-item-key={item.ratingKey}
                  onClick={() => {
                    console.log('Item clicked:', item.title, item);
                    onItemClick(item);
                  }}
                  className={`group flex items-center border-b border-border cursor-pointer transition-all duration-150 min-w-max ${
                    isSelected 
                      ? 'bg-primary-50' 
                      : isChecked
                      ? 'bg-primary-50/50' 
                      : 'hover:bg-background-primary'
                  }`}
                  style={{ height: `${rowHeight}px` }}
                >
                  {/* Expand arrow column - only for expandable top-level items */}
                  {isExpandable && (
                    <div className="w-8 flex-shrink-0 flex items-center justify-center">
                      {canExpand && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(item);
                          }}
                          className="p-1 rounded hover:bg-secondary-200 transition-colors"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {expandState?.isLoading ? (
                            <svg className="w-4 h-4 text-text-tertiary animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg
                              className={`w-4 h-4 text-text-tertiary transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  
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
                            newSelection.add(item.ratingKey);
                          } else {
                            newSelection.delete(item.ratingKey);
                          }
                          onSelectionChange(newSelection);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
                      />
                    </div>
                  )}
                  
                  {/* Data columns */}
                  {visibleColumns.map((column) => {
                    // Get the formatted value - formatCellValue will extract nested data
                    const cellValue = formatCellValue(column.id, item[column.id], item);
                    // Only show posters for top-level items and seasons (depth < 2), not episodes
                    const showPoster = showPosters && column.id === 'title' && depth < 2;
                    const posterUrl = showPoster ? getPosterUrl(item) : null;
                    // Only apply indentation to the title column to keep other columns aligned
                    const indentStyle = column.id === 'title' && depth > 0 ? { paddingLeft: `${depth * 24}px` } : {};
                    
                    return (
                      <div
                        key={column.id}
                        className="px-4 text-sm text-text-primary"
                        style={{ width: column.width || 'auto', minWidth: column.width || 140, flex: column.width ? '0 0 auto' : 1 }}
                      >
                        <div className="flex items-center gap-3 min-w-0" style={indentStyle}>
                          {/* Poster thumbnail for title column - 34x50px or 50x50px for music */}
                          {showPoster && posterUrl && (
                            <div className={`flex-shrink-0 ${squarePosters ? 'w-[50px] h-[50px]' : 'w-[34px] h-[50px]'} rounded overflow-hidden bg-secondary-100 shadow-sm`}>
                              <img 
                                src={posterUrl} 
                                alt={item.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}
                          
                          {/* Cell content */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`truncate ${depth === 0 ? 'font-medium' : 'font-normal text-text-secondary'}`} title={cellValue}>
                              {cellValue}
                            </span>
                            
                            {/* Status indicators for title column */}
                            {column.id === 'title' && cacheStatus.isCached && (
                              <span className="flex-shrink-0" title="Cached locally">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )}
                            {column.id === 'title' && cacheStatus.isDirty && (
                              <span className="flex-shrink-0" title="Unsaved changes">
                                <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )}
                            
                            {/* Play button for music tracks */}
                            {column.id === 'title' && isMusicLibrary && item.type === 'track' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayTrack(item);
                                }}
                                className="flex-shrink-0 w-6 h-6 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                                title={currentTrack?.ratingKey === item.ratingKey && isPlaying ? "Pause" : "Play"}
                              >
                                {currentTrack?.ratingKey === item.ratingKey && isPlaying ? (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
