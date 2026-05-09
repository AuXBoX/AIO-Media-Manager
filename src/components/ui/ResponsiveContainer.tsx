import { useBreakpoint } from '@/hooks/useBreakpoint';
import { spacing } from '@/config/breakpoints';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
}

/**
 * Responsive container component with adaptive padding
 */
export function ResponsiveContainer({
  children,
  className = '',
  maxWidth = 'full',
  padding = true,
}: ResponsiveContainerProps) {
  const { isMobile, isTablet } = useBreakpoint();

  const maxWidthClass = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  }[maxWidth];

  const paddingValue = padding
    ? isMobile
      ? spacing.mobile.container
      : isTablet
      ? spacing.tablet.container
      : spacing.desktop.container
    : 0;

  return (
    <div
      className={`w-full mx-auto ${maxWidthClass} ${className}`}
      style={{ padding: padding ? `0 ${paddingValue}px` : undefined }}
    >
      {children}
    </div>
  );
}

/**
 * Responsive grid component with adaptive columns and gaps
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  minColumnWidth?: number;
  maxColumns?: number;
  gap?: 'sm' | 'md' | 'lg';
}

export function ResponsiveGrid({
  children,
  className = '',
  minColumnWidth = 200,
  maxColumns = 8,
  gap = 'md',
}: ResponsiveGridProps) {
  const { isMobile, isTablet } = useBreakpoint();

  const gapValue = {
    sm: isMobile ? spacing.mobile.grid : isTablet ? spacing.tablet.grid : spacing.desktop.grid,
    md: isMobile ? spacing.mobile.grid * 1.5 : isTablet ? spacing.tablet.grid * 1.5 : spacing.desktop.grid * 1.5,
    lg: isMobile ? spacing.mobile.grid * 2 : isTablet ? spacing.tablet.grid * 2 : spacing.desktop.grid * 2,
  }[gap];

  return (
    <div
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${minColumnWidth}px, 1fr))`,
        gap: `${gapValue}px`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Responsive section component with adaptive spacing
 */
interface ResponsiveSectionProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg';
}

export function ResponsiveSection({
  children,
  className = '',
  spacing: spacingSize = 'md',
}: ResponsiveSectionProps) {
  const { isMobile, isTablet } = useBreakpoint();

  const spacingValue = {
    sm: isMobile ? spacing.mobile.section * 0.5 : isTablet ? spacing.tablet.section * 0.5 : spacing.desktop.section * 0.5,
    md: isMobile ? spacing.mobile.section : isTablet ? spacing.tablet.section : spacing.desktop.section,
    lg: isMobile ? spacing.mobile.section * 1.5 : isTablet ? spacing.tablet.section * 1.5 : spacing.desktop.section * 1.5,
  }[spacingSize];

  return (
    <section
      className={className}
      style={{ marginBottom: `${spacingValue}px` }}
    >
      {children}
    </section>
  );
}
