import { useState, useEffect } from 'react';

interface UseResponsiveColumnsOptions {
  minColumnWidth?: number;
  maxColumns?: number;
  gap?: number;
}

/**
 * Hook to calculate responsive grid columns based on container width
 * Automatically adjusts column count as window resizes
 */
export function useResponsiveColumns({
  minColumnWidth = 200,
  maxColumns = 8,
  gap = 16,
}: UseResponsiveColumnsOptions = {}) {
  const [columns, setColumns] = useState(5);

  useEffect(() => {
    const calculateColumns = () => {
      // Get the viewport width (or use a container ref if needed)
      const width = window.innerWidth;
      
      // Account for sidebar (assuming 256px) and padding
      const availableWidth = width - 256 - 48; // sidebar + padding
      
      // Calculate how many columns fit
      const calculatedColumns = Math.floor(
        (availableWidth + gap) / (minColumnWidth + gap)
      );
      
      // Clamp between 1 and maxColumns
      const finalColumns = Math.max(1, Math.min(maxColumns, calculatedColumns));
      
      setColumns(finalColumns);
    };

    // Calculate on mount
    calculateColumns();

    // Recalculate on resize
    window.addEventListener('resize', calculateColumns);
    
    return () => {
      window.removeEventListener('resize', calculateColumns);
    };
  }, [minColumnWidth, maxColumns, gap]);

  return columns;
}
