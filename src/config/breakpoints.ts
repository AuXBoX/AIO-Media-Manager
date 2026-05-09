/**
 * Responsive breakpoints configuration
 * Follows Tailwind CSS default breakpoints with custom additions
 */

export const breakpoints = {
  // Mobile first breakpoints
  sm: 640,   // Small devices (landscape phones)
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (desktops)
  xl: 1280,  // Extra large devices (large desktops)
  '2xl': 1536, // 2X large devices (larger desktops)
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Media query strings for use in CSS-in-JS or matchMedia
 */
export const mediaQueries = {
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  
  // Max-width queries (for mobile-first approach)
  maxSm: `(max-width: ${breakpoints.sm - 1}px)`,
  maxMd: `(max-width: ${breakpoints.md - 1}px)`,
  maxLg: `(max-width: ${breakpoints.lg - 1}px)`,
  maxXl: `(max-width: ${breakpoints.xl - 1}px)`,
  
  // Touch device detection
  touch: '(hover: none) and (pointer: coarse)',
  mouse: '(hover: hover) and (pointer: fine)',
  
  // Orientation
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
} as const;

/**
 * Device type detection based on screen size
 */
export const deviceTypes = {
  mobile: mediaQueries.maxMd,
  tablet: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: mediaQueries.lg,
} as const;

/**
 * Responsive grid column configurations
 */
export const gridColumns = {
  mobile: {
    min: 1,
    max: 2,
    default: 2,
  },
  tablet: {
    min: 2,
    max: 4,
    default: 3,
  },
  desktop: {
    min: 3,
    max: 8,
    default: 5,
  },
} as const;

/**
 * Responsive spacing configurations
 */
export const spacing = {
  mobile: {
    container: 16,
    grid: 12,
    section: 24,
  },
  tablet: {
    container: 24,
    grid: 16,
    section: 32,
  },
  desktop: {
    container: 32,
    grid: 20,
    section: 48,
  },
} as const;

/**
 * Responsive font sizes
 */
export const fontSizes = {
  mobile: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
  },
  desktop: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '2rem',   // 32px
  },
} as const;
