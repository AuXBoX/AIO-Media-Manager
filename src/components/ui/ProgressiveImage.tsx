import { useState, useEffect } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderSrc?: string;
  lowQualitySrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Progressive image component with responsive loading
 * - Mobile: Loads low-quality placeholder first, then full image
 * - Desktop: Loads full image directly
 */
export function ProgressiveImage({
  src,
  alt,
  className = '',
  placeholderSrc,
  lowQualitySrc,
  onLoad,
  onError,
}: ProgressiveImageProps) {
  const { isMobile } = useBreakpoint();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Use low quality image on mobile if available
  const imageSrc = isMobile && lowQualitySrc ? lowQualitySrc : src;
  
  const { src: loadedSrc, isLoading: imageLoading } = useProgressiveImage(
    imageSrc,
    placeholderSrc || imageSrc
  );

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-secondary-100 dark:bg-secondary-800 ${className}`}
      >
        <span className="text-secondary-400 dark:text-secondary-600 text-sm">
          Failed to load image
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder/blur */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
      )}

      {/* Actual image */}
      <img
        src={loadedSrc}
        alt={alt}
        className={`
          w-full h-full object-cover transition-all duration-300
          ${imageLoading ? 'blur-sm scale-105' : 'blur-0 scale-100'}
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}

/**
 * Responsive image with srcset for different screen sizes
 */
interface ResponsiveImageProps {
  src: string;
  srcSet?: {
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  };
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function ResponsiveImage({
  src,
  srcSet,
  alt,
  className = '',
  onLoad,
  onError,
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-secondary-100 dark:bg-secondary-800 ${className}`}
      >
        <span className="text-secondary-400 dark:text-secondary-600 text-sm">
          Failed to load image
        </span>
      </div>
    );
  }

  // Build srcSet string
  const srcSetString = srcSet
    ? Object.entries(srcSet)
        .map(([size, url]) => {
          const width = {
            sm: '640w',
            md: '768w',
            lg: '1024w',
            xl: '1280w',
          }[size];
          return `${url} ${width}`;
        })
        .join(', ')
    : undefined;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
      )}

      <img
        src={src}
        srcSet={srcSetString}
        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        alt={alt}
        className={`
          w-full h-full object-cover transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}
