import { useState, useRef, useEffect } from 'react';
import type { LibraryItem } from '@/managers/LibraryManager';
import { createPlexClient } from '@/api/plexClient';
import { AlphabetJumpList } from '@/components/library/AlphabetJumpList';

interface MusicTreeViewProps {
  items: LibraryItem[];
  serverUrl: string;
  token: string;
  onItemClick: (item: LibraryItem) => void;
  selectedItem: LibraryItem | null;
  selectedItems: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  getCacheStatus: (ratingKey: string) => { isCached: boolean; isDirty: boolean };
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  viewMode: 'artists' | 'albums';
}

interface ExpandedState {
  [key: string]: {
    isExpanded: boolean;
    children?: LibraryItem[];
    isLoading?: boolean;
  };
}

export function MusicTreeView({
  items,
  serverUrl,
  token,
  onItemClick,
  selectedItem,
  selectedItems,
  onSelectionChange,
  getCacheStatus,
  onScroll,
  viewMode,
}: MusicTreeViewProps) {
  const [expandedItems, setExpandedItems] = useState<ExpandedState>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const client = createPlexClient({ baseURL: serverUrl, token });

  // Debug: Log container dimensions
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      console.log('[MusicTreeView] Container dimensions:', {
        clientHeight: container.clientHeight,
        scrollHeight: container.scrollHeight,
        offsetHeight: container.offsetHeight,
        isScrollable: container.scrollHeight > container.clientHeight,
        itemCount: items.length,
      });
    }
  }, [items.length]);

  const fetchChildren = async (itemKey: string): Promise<LibraryItem[]> => {
    const response = await client.get(`/library/metadata/${itemKey}/children`);
    return response.MediaContainer?.Metadata || [];
  };

  const toggleExpand = async (item: LibraryItem) => {
    const isExpanded = expandedItems[item.ratingKey]?.isExpanded;

    if (isExpanded) {
      setExpandedItems((prev) => ({
        ...prev,
        [item.ratingKey]: { isExpanded: false },
      }));
    } else {
      if (!expandedItems[item.ratingKey]?.children) {
        setExpandedItems((prev) => ({
          ...prev,
          [item.ratingKey]: { isExpanded: true, isLoading: true },
        }));

        try {
          const children = await fetchChildren(item.ratingKey);
          setExpandedItems((prev) => ({
            ...prev,
            [item.ratingKey]: { isExpanded: true, children, isLoading: false },
          }));
        } catch (error) {
          console.error('Failed to fetch children:', error);
          setExpandedItems((prev) => ({
            ...prev,
            [item.ratingKey]: { isExpanded: false, isLoading: false },
          }));
        }
      } else {
        setExpandedItems((prev) => ({
          ...prev,
          [item.ratingKey]: { ...prev[item.ratingKey], isExpanded: true },
        }));
      }
    }
  };

  const toggleSelection = (ratingKey: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedItems);
    if (newSelected.has(ratingKey)) {
      newSelected.delete(ratingKey);
    } else {
      newSelected.add(ratingKey);
    }
    onSelectionChange(newSelected);
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleJumpToLetter = (letter: string) => {
    console.log('[MusicTreeView] Jump to letter:', letter);
    if (!scrollContainerRef.current) {
      console.log('[MusicTreeView] No scroll container ref');
      return;
    }

    const targetIndex = items.findIndex((item) => {
      const title = item.title || '';
      const firstChar = title.charAt(0).toUpperCase();
      if (letter === '#') {
        return /[0-9]/.test(firstChar);
      }
      return firstChar === letter;
    });

    console.log('[MusicTreeView] Target index:', targetIndex, 'for letter:', letter);
    if (targetIndex === -1) return;

    const itemElements = scrollContainerRef.current.querySelectorAll('[data-item-index]');
    console.log('[MusicTreeView] Found item elements:', itemElements.length);
    
    const targetElement = Array.from(itemElements).find(
      (el) => el.getAttribute('data-item-index') === String(targetIndex)
    );

    console.log('[MusicTreeView] Target element:', targetElement);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderItem = (item: LibraryItem, index: number, level: number = 0) => {
    const state = expandedItems[item.ratingKey];
    const isExpanded = state?.isExpanded || false;
    const children = state?.children || [];
    const isLoading = state?.isLoading || false;
    const cacheStatus = getCacheStatus(item.ratingKey);
    const hasChildren = item['childCount'] || item['leafCount'];
    
    // Determine if item should show expand button:
    // - Level 0: Always show (artists or albums depending on view mode)
    // - Level 1: Always show (albums when viewing artists)
    // - Level 2+: Only if has children (shouldn't happen in music)
    const showExpandButton = level <= 1 || hasChildren;

    return (
      <div key={item.ratingKey} className="mb-1" data-item-index={level === 0 ? index : undefined}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer ${
            selectedItem?.ratingKey === item.ratingKey
              ? 'bg-primary-100 dark:bg-primary-900/30'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          style={{ 
            marginLeft: `${level * 28}px`,
            contain: 'layout style paint'
          }}
          onClick={() => onItemClick(item)}
        >
          {showExpandButton ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(item);
              }}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-500 dark:text-gray-400"
            >
              {isLoading ? (
                <span className="text-xs">⋯</span>
              ) : isExpanded ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          ) : (
            <span className="w-8 text-sm text-gray-500 dark:text-gray-400 text-right flex-shrink-0">
              {item.index}
            </span>
          )}

          <input
            type="checkbox"
            checked={selectedItems.has(item.ratingKey)}
            onChange={(e) => toggleSelection(item.ratingKey, e as any)}
            className="flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          />

          {item.thumb && (
            <img
              src={`${serverUrl}${item.thumb}?X-Plex-Token=${token}`}
              alt={item.title}
              className="w-10 h-10 rounded object-cover flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`${hasChildren ? 'font-medium' : 'text-sm'} text-gray-900 dark:text-gray-100 truncate`}>
                {item.title}
              </span>
              {cacheStatus.isCached && <span className="text-xs text-green-600 dark:text-green-400">●</span>}
              {cacheStatus.isDirty && <span className="text-xs text-yellow-600 dark:text-yellow-400">⚠</span>}
            </div>
            {(item.parentTitle || item.year) && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {item.parentTitle && <span>{item.parentTitle}</span>}
                {item.year && <span>• {item.year}</span>}
              </div>
            )}
          </div>

          {item.duration ? (
            <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
              {formatDuration(item.duration)}
            </span>
          ) : hasChildren ? (
            <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
              {item['leafCount'] || item['childCount'] || 0} {item['childCount'] ? 'albums' : 'tracks'}
            </span>
          ) : null}
        </div>

        {isExpanded && children.length > 0 && (
          <div className="mt-1">
            {children.map((child, idx) => renderItem(child, idx, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-gray-900">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto p-2"
        style={{ 
          willChange: 'scroll-position',
          transform: 'translateZ(0)',
          WebkitOverflowScrolling: 'touch'
        }}
        onScroll={onScroll}
      >
        {items.map((item, index) => renderItem(item, index))}
      </div>
    </div>
  );
}
