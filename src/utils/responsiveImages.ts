import { breakpoints } from '@/config/breakpoints';

/**
 * Generate responsive image URLs for different screen sizes
 */
export interface ResponsiveImageUrls {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  original: string;
}

/**
 * Generate responsive image URLs using Plex transcoding API
 */
export function generateResponsiveImageUrls(
  baseUrl: string,
  thumbPath: string,
  token: string
): ResponsiveImageUrls {
  const transcodeUrl = (width: number, height: number) => {
    const params = new URLSearchParams({
      url: thumbPath,
      width: width.toString(),
      height: height.toString(),
      minSize: '1',
      upscale: '0',
      'X-Plex-Token': token,
    });
    return `${baseUrl}/photo/:/transcode?${params.toString()}`;
  };

  return {
    sm: transcodeUrl(400, 600),    // Mobile
    md: transcodeUrl(600, 900),    // Tablet
    lg: transcodeUrl(800, 1200),   // Desktop
    xl: transcodeUrl(1200, 1800),  // Large desktop
    original: `${baseUrl}${thumbPath}?X-Plex-Token=${token}`,
  };
}

/**
 * Get optimal image size based on screen width
 */
export function getOptimalImageSize(screenWidth: number): keyof ResponsiveImageUrls {
  if (screenWidth < breakpoints.sm) {
    return 'sm';
  } else if (screenWidth < breakpoints.md) {
    return 'md';
  } else if (screenWidth < breakpoints.lg) {
    return 'lg';
  } else if (screenWidth < breakpoints.xl) {
    return 'xl';
  }
  return 'xl';
}

/**
 * Generate srcSet string for responsive images
 */
export function generateSrcSet(urls: ResponsiveImageUrls): string {
  return [
    `${urls.sm} 400w`,
    `${urls.md} 600w`,
    `${urls.lg} 800w`,
    `${urls.xl} 1200w`,
  ].join(', ');
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizes(options?: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
}): string {
  const {
    mobile = '100vw',
    tablet = '50vw',
    desktop = '33vw',
  } = options || {};

  return [
    `(max-width: ${breakpoints.sm}px) ${mobile}`,
    `(max-width: ${breakpoints.md}px) ${tablet}`,
    desktop,
  ].join(', ');
}

/**
 * Preload critical images for better performance
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Preload multiple images
 */
export async function preloadImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map(preloadImage));
}

/**
 * Get low-quality placeholder URL (blurred, small)
 */
export function getLowQualityPlaceholder(
  baseUrl: string,
  thumbPath: string,
  token: string
): string {
  const params = new URLSearchParams({
    url: thumbPath,
    width: '50',
    height: '75',
    blur: '20',
    'X-Plex-Token': token,
  });
  return `${baseUrl}/photo/:/transcode?${params.toString()}`;
}
