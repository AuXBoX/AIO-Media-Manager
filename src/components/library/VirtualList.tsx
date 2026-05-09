import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LibraryItem } from '@/managers/LibraryManager';
import { MediaCard } from './MediaCard';

interface VirtualListProps {
  items: LibraryItem[];
  serverUrl: string;
  token: string;
  onItemClick?: (item: LibraryItem) => void;
  getCacheStatus?: (ratingKey: string) => { isCached: boolean; isDirty: boolean };
  estimatedItemHeight?: number;
}

/**
 * VirtualList Component
 * Implements virtual scrolling for list layout to efficiently render large lists
 * Only renders items visible in the viewport plus a small overscan
 */
export function VirtualList({
  items,
  serverUrl,
  token,
  onItemClick,
  getCacheStatus,
  estimatedItemHeight = 88, // Height of list item (64px image + padding)
}: VirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Create virtualizer
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan: 5, // Render 5 extra items above and below viewport
  });

  // Scroll to top when items change (e.g., new page loaded)
  useEffect(() => {
    rowVirtualizer.scrollToIndex(0, { align: 'start' });
  }, [items.length, rowVirtualizer]);

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto p-6"
      style={{
        contain: 'strict', // Performance optimization
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          if (!item) return null;
          const cacheStatus = getCacheStatus?.(item.ratingKey) || {
            isCached: false,
            isDirty: false,
          };

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MediaCard
                item={item}
                viewMode="list"
                serverUrl={serverUrl}
                token={token}
                onClick={onItemClick}
                isCached={cacheStatus.isCached}
                isDirty={cacheStatus.isDirty}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
