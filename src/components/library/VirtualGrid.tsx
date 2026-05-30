import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LibraryItem } from '@/managers/LibraryManager';
import { MediaCard } from './MediaCard';

interface VirtualGridProps {
  items: LibraryItem[];
  serverUrl: string;
  token: string;
  onItemClick?: (item: LibraryItem) => void;
  getCacheStatus?: (ratingKey: string) => { isCached: boolean; isDirty: boolean };
  columns?: number;
  gap?: number;
  posterSize?: number;
  estimatedItemHeight?: number;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  squarePosters?: boolean;
}

export interface VirtualGridHandle {
  scrollToLetter: (letter: string) => void;
}

/**
 * VirtualGrid Component
 * Implements virtual scrolling for grid layout to efficiently render large lists
 * Only renders items visible in the viewport plus a small overscan
 */
export const VirtualGrid = forwardRef<VirtualGridHandle, VirtualGridProps>(({
  items,
  serverUrl,
  token,
  onItemClick,
  getCacheStatus,
  columns = 5,
  gap = 24, // Elegant spacing between grid items (updated from 20px)
  posterSize = 180,
  estimatedItemHeight = 300,
  onScroll,
  squarePosters = false,
}, ref) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [actualColumns, setActualColumns] = useState(columns);

  // Calculate actual columns based on container width and poster size
  useEffect(() => {
    const updateColumns = () => {
      if (parentRef.current) {
        const containerWidth = parentRef.current.clientWidth - 48; // Subtract padding
        const columnsCount = Math.floor((containerWidth + gap) / (posterSize + gap));
        setActualColumns(Math.max(1, columnsCount));
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [posterSize, gap]);

  // Calculate rows from items and actual columns
  const rows = Math.ceil(items.length / actualColumns);

  // Create virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan: 5, // Render 5 extra rows above and below viewport for smoother scrolling
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  // Expose scrollToLetter method via ref
  useImperativeHandle(ref, () => ({
    scrollToLetter: (letter: string) => {
      // Find the first item that starts with the given letter
      const targetIndex = items.findIndex((item) => {
        const firstChar = item.title.charAt(0).toUpperCase();
        if (letter === '#') {
          return /[0-9]/.test(firstChar);
        }
        return firstChar === letter;
      });

      if (targetIndex !== -1) {
        // Calculate which row this item is in
        const rowIndex = Math.floor(targetIndex / actualColumns);
        // Scroll to that row
        rowVirtualizer.scrollToIndex(rowIndex, { align: 'start', behavior: 'smooth' });
      }
    },
  }));

  return (
    <div
      ref={parentRef}
      className="h-full w-full overflow-y-auto overflow-x-hidden bg-background-primary"
      onScroll={onScroll}
      style={{
        overscrollBehavior: 'contain',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * actualColumns;
          const endIndex = Math.min(startIndex + actualColumns, items.length);
          const rowItems = items.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: '24px',
                right: '24px',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="flex flex-wrap"
                style={{
                  gap: `${gap}px`,
                }}
              >
                {rowItems.map((item) => {
                  const cacheStatus = getCacheStatus?.(item.ratingKey) || {
                    isCached: false,
                    isDirty: false,
                  };

                  return (
                    <MediaCard
                      key={item.ratingKey}
                      item={item}
                      viewMode="grid"
                      serverUrl={serverUrl}
                      token={token}
                      onClick={onItemClick}
                      isCached={cacheStatus.isCached}
                      isDirty={cacheStatus.isDirty}
                      posterSize={posterSize}
                      squarePosters={squarePosters}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
