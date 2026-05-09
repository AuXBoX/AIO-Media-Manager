import { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { LibraryItem } from '@/managers/LibraryManager';
import type { ColumnDefinition } from './ColumnSelector';
import { formatCellValue } from './columnDefinitions';

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
  estimatedItemHeight = 48,
  onSort,
  onScroll,
}: TableListViewProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const parentRef = useRef<HTMLDivElement>(null);

  const visibleColumns = columns.filter((col) => col.visible);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
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
    <div className="absolute inset-0 flex flex-col">
      {/* Table Header */}
      <div className="flex-shrink-0 bg-secondary-100 dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center">
          {/* Checkbox column */}
          {onSelectionChange && (
            <div className="px-3 py-3 w-12 flex-shrink-0">
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
                className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
              />
            </div>
          )}
          
          {/* Data columns */}
          {visibleColumns.map((column) => (
            <div
              key={column.id}
              className={`px-3 py-3 text-xs font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider ${
                column.sortable ? 'cursor-pointer hover:bg-secondary-200 dark:hover:bg-secondary-700' : ''
              }`}
              style={{ width: column.width || 'auto', minWidth: column.width || 100, flex: column.width ? undefined : 1 }}
              onClick={() => column.sortable && handleSort(column.id)}
            >
              <div className="flex items-center gap-1">
                <span className="truncate">{column.label}</span>
                {column.sortable && sortColumn === column.id && (
                  <svg
                    className={`w-4 h-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
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
        className="absolute inset-0 top-[52px] bg-white dark:bg-secondary-900"
        style={{
          overflow: 'auto',
        }}
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
            const item = items[virtualRow.index];
            if (!item) return null; // Safety check
            
            const cacheStatus = getCacheStatus(item.ratingKey);

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
                  onClick={() => {
                    console.log('Item clicked:', item.title, item);
                    onItemClick(item);
                  }}
                  className={`flex items-center border-b border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-800 cursor-pointer transition-colors ${
                    selectedItem?.ratingKey === item.ratingKey ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  {/* Checkbox column */}
                  {onSelectionChange && (
                    <div className="px-3 py-2 w-12 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedItems?.has(item.ratingKey) || false}
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
                        className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                      />
                    </div>
                  )}
                  
                  {/* Data columns */}
                  {visibleColumns.map((column) => {
                    // Get the formatted value - formatCellValue will extract nested data
                    const cellValue = formatCellValue(column.id, item[column.id], item);
                    
                    return (
                      <div
                        key={column.id}
                        className="px-3 py-2 text-sm text-secondary-900 dark:text-secondary-100"
                        style={{ width: column.width || 'auto', minWidth: column.width || 100, flex: column.width ? undefined : 1 }}
                      >
                        <div className="truncate flex items-center gap-2" title={cellValue}>
                          {cellValue}
                          {column.id === 'title' && cacheStatus.isCached && (
                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                              <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                            </svg>
                          )}
                          {column.id === 'title' && cacheStatus.isDirty && (
                            <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          )}
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
