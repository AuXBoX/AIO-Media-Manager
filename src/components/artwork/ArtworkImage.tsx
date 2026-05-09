import React from 'react';
import { useLazyProgressiveImage } from '@/hooks/useProgressiveImage';
import { getOptimizedImageUrl } from '@/utils/imageTranscoding';

interface ArtworkImageProps {
  serverUrl: string;
  imagePath: string;
  token: string;
  alt: string;
  className?: string;
  size?: 'thumbnail' | 'small' | 'medium' | 'large';
  lazy?: boolean;
  fallbackSrc?: string;
  rootMargin?: string;
  threshold?: number | number[];
}

/**
 * ArtworkImage Component
 * 
 * Displays artwork with progressive loading (low quality placeholder -> high quality)
 * and optional lazy loading using Intersection Observer
 * Uses Plex's image transcoding API for optimal image sizes
 */
export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  serverUrl,
  imagePath,
  token,
  alt,
  className = '',
  size = 'medium',
  lazy = true,
  fallbackSrc,
  rootMargin = '50px',
  threshold = 0.01,
}) => {
  // Generate URLs for low and high quality images
  const lowQualityUrl = getOptimizedImageUrl(serverUrl, imagePath, token, 'thumbnail');
  const highQualityUrl = getOptimizedImageUrl(serverUrl, imagePath, token, size);

  // Use lazy progressive loading hook
  const { ref, src, isLoading, error } = useLazyProgressiveImage(
    lowQualityUrl,
    highQualityUrl,
    {
      fallbackSrc,
      rootMargin,
      threshold,
    }
  );

  return (
    <div className={`relative ${className}`}>
      <img
        ref={lazy ? ref : undefined}
        src={lazy ? src : highQualityUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-50 blur-sm' : 'opacity-100'
        }`}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}
      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div className="text-white text-center p-4">
            <svg
              className="w-12 h-12 mx-auto mb-2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
};
