/**
 * Image Transcoding Utility
 * Provides utilities for transcoding and optimizing images using Plex's image transcoding API
 */

export interface ImageTranscodeOptions {
  width?: number;
  height?: number;
  minSize?: boolean;
  upscale?: boolean;
  format?: 'jpg' | 'png';
  quality?: number;
}

/**
 * Generate a transcoded image URL using Plex's photo transcoding API
 * 
 * @param serverUrl - Base URL of the Plex server
 * @param imagePath - Path to the image (from thumb/art field)
 * @param token - Authentication token
 * @param options - Transcoding options
 * @returns Transcoded image URL
 */
export function getTranscodedImageUrl(
  serverUrl: string,
  imagePath: string,
  token: string,
  options: ImageTranscodeOptions = {}
): string {
  const params = new URLSearchParams();
  
  // Add image path
  params.append('url', imagePath);
  
  // Add dimensions
  if (options.width) {
    params.append('width', options.width.toString());
  }
  if (options.height) {
    params.append('height', options.height.toString());
  }
  
  // Add optional parameters
  if (options.minSize) {
    params.append('minSize', '1');
  }
  if (options.upscale) {
    params.append('upscale', '1');
  }
  if (options.format) {
    params.append('format', options.format);
  }
  if (options.quality) {
    params.append('quality', options.quality.toString());
  }
  
  // Add authentication token
  params.append('X-Plex-Token', token);
  
  return `${serverUrl}/photo/:/transcode?${params.toString()}`;
}

/**
 * Get optimized image URL for different display sizes
 * 
 * @param serverUrl - Base URL of the Plex server
 * @param imagePath - Path to the image
 * @param token - Authentication token
 * @param size - Predefined size preset
 * @returns Transcoded image URL
 */
export function getOptimizedImageUrl(
  serverUrl: string,
  imagePath: string,
  token: string,
  size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original'
): string {
  const sizeMap: Record<typeof size, ImageTranscodeOptions> = {
    thumbnail: { width: 150, height: 150 },
    small: { width: 300, height: 300 },
    medium: { width: 600, height: 600 },
    large: { width: 1200, height: 1200 },
    original: {},
  };
  
  const options = sizeMap[size];
  
  // For original size, return the direct URL
  if (size === 'original') {
    return `${serverUrl}${imagePath}?X-Plex-Token=${token}`;
  }
  
  return getTranscodedImageUrl(serverUrl, imagePath, token, options);
}

/**
 * Get composite image URL for playlists
 * 
 * @param serverUrl - Base URL of the Plex server
 * @param compositePath - Composite path from playlist
 * @param token - Authentication token
 * @returns Composite image URL
 */
export function getCompositeImageUrl(
  serverUrl: string,
  compositePath: string,
  token: string
): string {
  return `${serverUrl}${compositePath}?X-Plex-Token=${token}`;
}

/**
 * Preload an image by creating an Image object
 * 
 * @param url - Image URL to preload
 * @returns Promise that resolves when image is loaded
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Preload multiple images
 * 
 * @param urls - Array of image URLs to preload
 * @returns Promise that resolves when all images are loaded
 */
export async function preloadImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map(url => preloadImage(url)));
}

/**
 * Get srcset for responsive images
 * 
 * @param serverUrl - Base URL of the Plex server
 * @param imagePath - Path to the image
 * @param token - Authentication token
 * @param widths - Array of widths for srcset
 * @returns srcset string
 */
export function getResponsiveSrcSet(
  serverUrl: string,
  imagePath: string,
  token: string,
  widths: number[] = [300, 600, 900, 1200]
): string {
  return widths
    .map(width => {
      const url = getTranscodedImageUrl(serverUrl, imagePath, token, { width });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Calculate optimal image dimensions while maintaining aspect ratio
 * 
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param maxWidth - Maximum width
 * @param maxHeight - Maximum height
 * @returns Calculated dimensions
 */
export function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  let width = maxWidth;
  let height = maxWidth / aspectRatio;
  
  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}
