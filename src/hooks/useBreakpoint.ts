import { useState, useEffect } from 'react';
import { breakpoints, mediaQueries, type Breakpoint } from '@/config/breakpoints';

/**
 * Hook to detect current breakpoint and device type
 * Returns the current breakpoint and helper functions
 */
export function useBreakpoint() {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('lg');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;

      // Determine current breakpoint
      if (width >= breakpoints['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md');
      } else {
        setCurrentBreakpoint('sm');
      }

      // Determine device type
      setIsMobile(width < breakpoints.md);
      setIsTablet(width >= breakpoints.md && width < breakpoints.lg);
      setIsDesktop(width >= breakpoints.lg);

      // Check for touch device
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia(mediaQueries.touch).matches
      );
    };

    // Initial check
    updateBreakpoint();

    // Listen for resize events
    window.addEventListener('resize', updateBreakpoint);

    return () => {
      window.removeEventListener('resize', updateBreakpoint);
    };
  }, []);

  /**
   * Check if current breakpoint is at least the specified breakpoint
   */
  const isAtLeast = (breakpoint: Breakpoint): boolean => {
    const order: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = order.indexOf(currentBreakpoint);
    const targetIndex = order.indexOf(breakpoint);
    return currentIndex >= targetIndex;
  };

  /**
   * Check if current breakpoint is at most the specified breakpoint
   */
  const isAtMost = (breakpoint: Breakpoint): boolean => {
    const order: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = order.indexOf(currentBreakpoint);
    const targetIndex = order.indexOf(breakpoint);
    return currentIndex <= targetIndex;
  };

  return {
    currentBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    isAtLeast,
    isAtMost,
  };
}

/**
 * Hook to match a specific media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}
