import { FC, useEffect, useState, useRef } from 'react';
import { SkeletonCard } from './Skeleton';

export interface GridLoadingStateProps {
  /**
   * Number of skeleton cards to display
   */
  items?: number;
  /**
   * Number of columns
   */
  columns?: number;
  /**
   * Gap between items (px)
   */
  gap?: number;
  /**
   * Card width
   */
  cardWidth?: number;
  /**
   * Card height
   */
  cardHeight?: number;
  /**
   * Show title below cards
   */
  showTitle?: boolean;
  /**
   * Show subtitle below title
   */
  showSubtitle?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * GridLoadingState Component
 * 
 * Loading state for grid views with skeleton cards.
 * Matches the VirtualGrid component structure.
 * 
 * @example
 * ```tsx
 * // Basic grid loading state
 * <GridLoadingState />
 * 
 * // Custom configuration
 * <GridLoadingState items={12} columns={6} />
 * 
 * // Custom card size
 * <GridLoadingState cardWidth={200} cardHeight={300} />
 * ```
 */
export const GridLoadingState: FC<GridLoadingStateProps> = ({
  items = 15,
  columns = 5,
  gap = 24,
  cardWidth = 180,
  cardHeight = 270,
  showTitle = true,
  showSubtitle = false,
  className,
}) => {
  return (
    <div className="h-full w-full overflow-hidden p-6">
      <div
        className={className}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
          gap: `${gap}px`,
        }}
      >
        {Array.from({ length: items }).map((_, index) => (
          <SkeletonCard
            key={index}
            width={cardWidth}
            height={cardHeight}
            showTitle={showTitle}
            showSubtitle={showSubtitle}
          />
        ))}
      </div>
    </div>
  );
};

export interface GridLoadingStateResponsiveProps {
  /**
   * Number of skeleton cards to display
   */
  items?: number;
  /**
   * Gap between items (px)
   */
  gap?: number;
  /**
   * Card width
   */
  cardWidth?: number;
  /**
   * Card height
   */
  cardHeight?: number;
  /**
   * Show title below cards
   */
  showTitle?: boolean;
  /**
   * Show subtitle below title
   */
  showSubtitle?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * GridLoadingStateResponsive Component
 * 
 * Responsive loading state for grid views that calculates columns based on container width.
 * Matches the VirtualGrid component's responsive behavior.
 * 
 * @example
 * ```tsx
 * // Responsive grid loading state
 * <GridLoadingStateResponsive />
 * 
 * // Custom configuration
 * <GridLoadingStateResponsive items={20} cardWidth={200} />
 * ```
 */
export const GridLoadingStateResponsive: FC<GridLoadingStateResponsiveProps> = ({
  items = 15,
  gap = 24,
  cardWidth = 180,
  cardHeight = 270,
  showTitle = true,
  showSubtitle = false,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(5);

  // Calculate columns based on container width
  useEffect(() => {
    const updateColumns = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 48; // Subtract padding
        const columnsCount = Math.floor((containerWidth + gap) / (cardWidth + gap));
        setColumns(Math.max(1, columnsCount));
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [cardWidth, gap]);

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden p-6">
      <div
        className={className}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
          gap: `${gap}px`,
        }}
      >
        {Array.from({ length: items }).map((_, index) => (
          <SkeletonCard
            key={index}
            width={cardWidth}
            height={cardHeight}
            showTitle={showTitle}
            showSubtitle={showSubtitle}
          />
        ))}
      </div>
    </div>
  );
};
