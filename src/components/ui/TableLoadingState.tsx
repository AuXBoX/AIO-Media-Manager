import { FC } from 'react';
import { SkeletonTable } from './Skeleton';

export interface TableLoadingStateProps {
  /**
   * Number of skeleton rows to display
   */
  rows?: number;
  /**
   * Number of columns to display
   */
  columns?: number;
  /**
   * Show poster thumbnail in first column
   */
  showPoster?: boolean;
  /**
   * Row height mode
   */
  rowHeight?: 'comfortable' | 'compact';
  /**
   * Show header row
   */
  showHeader?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * TableLoadingState Component
 * 
 * Loading state for table views with skeleton rows.
 * Matches the TableListView component structure.
 * 
 * @example
 * ```tsx
 * // Basic table loading state
 * <TableLoadingState />
 * 
 * // Custom configuration
 * <TableLoadingState rows={10} columns={5} showPoster />
 * 
 * // Compact mode
 * <TableLoadingState rowHeight="compact" />
 * ```
 */
export const TableLoadingState: FC<TableLoadingStateProps> = ({
  rows = 10,
  columns = 4,
  showPoster = true,
  rowHeight = 'comfortable',
  showHeader = true,
  className,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col bg-background-primary">
      {/* Table Header - Sticky */}
      {showHeader && (
        <div className="flex-shrink-0 bg-white border-b border-border sticky top-0 z-40">
          <div className="flex items-center h-12 px-4">
            {/* Checkbox column placeholder */}
            <div className="w-14 flex-shrink-0" />
            
            {/* Column headers */}
            {Array.from({ length: columns }).map((_, index) => (
              <div
                key={index}
                className="px-4"
                style={{
                  width: index === 0 ? '40%' : '20%',
                  minWidth: 100,
                }}
              >
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Body - Skeleton Rows */}
      <div className="flex-1 overflow-hidden">
        <SkeletonTable
          rows={rows}
          columns={columns}
          showPoster={showPoster}
          rowHeight={rowHeight}
          className={className}
        />
      </div>
    </div>
  );
};
