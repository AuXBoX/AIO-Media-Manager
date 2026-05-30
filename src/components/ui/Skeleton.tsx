import { FC, HTMLAttributes } from 'react';
import clsx from 'clsx';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Width of the skeleton (CSS value)
   */
  width?: string | number;
  /**
   * Height of the skeleton (CSS value)
   */
  height?: string | number;
  /**
   * Border radius variant
   * - none: No border radius
   * - sm: Small border radius (4px)
   * - md: Medium border radius (8px)
   * - lg: Large border radius (12px)
   * - full: Fully rounded (for circles)
   */
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /**
   * Animation variant
   * - pulse: Pulsing opacity animation (default)
   * - wave: Shimmer wave animation
   * - none: No animation
   */
  animation?: 'pulse' | 'wave' | 'none';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Skeleton Component
 * 
 * Loading placeholder that matches the Plex Pro design system.
 * Uses subtle animations to indicate loading state.
 * 
 * @example
 * ```tsx
 * // Basic skeleton
 * <Skeleton width="100%" height="20px" />
 * 
 * // Circle skeleton (avatar)
 * <Skeleton width="40px" height="40px" radius="full" />
 * 
 * // Card skeleton
 * <Skeleton width="200px" height="300px" radius="lg" />
 * 
 * // With wave animation
 * <Skeleton width="100%" height="20px" animation="wave" />
 * ```
 */
export const Skeleton: FC<SkeletonProps> = ({
  width,
  height,
  radius = 'md',
  animation = 'pulse',
  className,
  style,
  ...props
}) => {
  const radiusClasses = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]',
    none: '',
  };

  return (
    <div
      className={clsx(
        'bg-slate-200',
        radiusClasses[radius],
        animationClasses[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

/**
 * SkeletonText Component
 * 
 * Skeleton for text content with multiple lines.
 * 
 * @example
 * ```tsx
 * // Single line
 * <SkeletonText />
 * 
 * // Multiple lines
 * <SkeletonText lines={3} />
 * 
 * // Custom spacing
 * <SkeletonText lines={2} spacing="lg" />
 * ```
 */
export interface SkeletonTextProps {
  /**
   * Number of lines to display
   */
  lines?: number;
  /**
   * Spacing between lines
   * - sm: 8px
   * - md: 12px (default)
   * - lg: 16px
   */
  spacing?: 'sm' | 'md' | 'lg';
  /**
   * Width of the last line (percentage)
   */
  lastLineWidth?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SkeletonText: FC<SkeletonTextProps> = ({
  lines = 1,
  spacing = 'md',
  lastLineWidth = 80,
  className,
}) => {
  const spacingClasses = {
    sm: 'space-y-2',
    md: 'space-y-3',
    lg: 'space-y-4',
  };

  return (
    <div className={clsx(spacingClasses[spacing], className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? `${lastLineWidth}%` : '100%'}
          height="16px"
          radius="sm"
        />
      ))}
    </div>
  );
};

/**
 * SkeletonCard Component
 * 
 * Skeleton for media card (poster + title).
 * 
 * @example
 * ```tsx
 * // Default card
 * <SkeletonCard />
 * 
 * // Custom size
 * <SkeletonCard width={200} height={300} />
 * 
 * // Without title
 * <SkeletonCard showTitle={false} />
 * ```
 */
export interface SkeletonCardProps {
  /**
   * Width of the card
   */
  width?: number;
  /**
   * Height of the card
   */
  height?: number;
  /**
   * Show title skeleton below card
   */
  showTitle?: boolean;
  /**
   * Show subtitle skeleton below title
   */
  showSubtitle?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SkeletonCard: FC<SkeletonCardProps> = ({
  width = 180,
  height = 270,
  showTitle = true,
  showSubtitle = false,
  className,
}) => {
  return (
    <div className={clsx('flex flex-col', className)} style={{ width }}>
      {/* Poster skeleton */}
      <Skeleton width={width} height={height} radius="lg" />
      
      {/* Title skeleton */}
      {showTitle && (
        <div className="mt-3">
          <Skeleton width="100%" height="16px" radius="sm" />
        </div>
      )}
      
      {/* Subtitle skeleton */}
      {showSubtitle && (
        <div className="mt-2">
          <Skeleton width="60%" height="14px" radius="sm" />
        </div>
      )}
    </div>
  );
};

/**
 * SkeletonTable Component
 * 
 * Skeleton for table rows.
 * 
 * @example
 * ```tsx
 * // Default table skeleton
 * <SkeletonTable rows={5} />
 * 
 * // Custom columns
 * <SkeletonTable rows={3} columns={4} />
 * 
 * // With poster column
 * <SkeletonTable rows={5} showPoster />
 * ```
 */
export interface SkeletonTableProps {
  /**
   * Number of rows to display
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
   * Additional CSS classes
   */
  className?: string;
}

export const SkeletonTable: FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  showPoster = true,
  rowHeight = 'comfortable',
  className,
}) => {
  const height = rowHeight === 'comfortable' ? 56 : 48;

  return (
    <div className={clsx('space-y-0', className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center border-b border-border px-4"
          style={{ height: `${height}px` }}
        >
          {/* Poster column */}
          {showPoster && (
            <div className="flex-shrink-0 mr-3">
              <Skeleton width={40} height={60} radius="sm" />
            </div>
          )}
          
          {/* Data columns */}
          <div className="flex-1 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="flex-1"
                style={{ maxWidth: colIndex === 0 ? '40%' : '20%' }}
              >
                <Skeleton
                  width={colIndex === 0 ? '80%' : '60%'}
                  height="16px"
                  radius="sm"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * SkeletonGrid Component
 * 
 * Skeleton for grid layout (multiple cards).
 * 
 * @example
 * ```tsx
 * // Default grid
 * <SkeletonGrid />
 * 
 * // Custom columns and items
 * <SkeletonGrid columns={6} items={12} />
 * 
 * // Custom card size
 * <SkeletonGrid cardWidth={200} cardHeight={300} />
 * ```
 */
export interface SkeletonGridProps {
  /**
   * Number of items to display
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
   * Additional CSS classes
   */
  className?: string;
}

export const SkeletonGrid: FC<SkeletonGridProps> = ({
  items = 10,
  columns = 5,
  gap = 24,
  cardWidth = 180,
  cardHeight = 270,
  showTitle = true,
  className,
}) => {
  return (
    <div
      className={clsx('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonCard
          key={index}
          width={cardWidth}
          height={cardHeight}
          showTitle={showTitle}
        />
      ))}
    </div>
  );
};
