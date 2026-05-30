import { LibraryItem } from '@/managers/LibraryManager';
import { useState, useEffect, useRef } from 'react';
import { Spinner } from '@/components/ui/Spinner';

interface MediaCardProps {
  item: LibraryItem;
  viewMode: 'grid' | 'list';
  serverUrl: string;
  token: string;
  onClick?: (item: LibraryItem) => void;
  isCached?: boolean;
  isDirty?: boolean;
  posterSize?: number;
  squarePosters?: boolean;
}

/**
 * MediaCard Component
 * Displays a media item in either grid or list view with lazy loading
 */
export function MediaCard({ item, viewMode, serverUrl, token, onClick, isCached = false, isDirty = false, posterSize = 180, squarePosters = false }: MediaCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    onClick?.(item);
  };

  // Use Plex image transcoding for smaller, faster-loading images
  const getTranscodedImageUrl = (thumbPath: string | undefined, width: number, height: number) => {
    if (!thumbPath) return null;
    
    // Use Plex's photo transcoder to resize images
    const encodedPath = encodeURIComponent(thumbPath);
    return `${serverUrl}/photo/:/transcode?url=${encodedPath}&width=${width}&height=${height}&minSize=1&upscale=0&X-Plex-Token=${token}`;
  };

  const imageUrl = viewMode === 'grid'
    ? getTranscodedImageUrl(item.thumb, Math.round(posterSize * 1.5), squarePosters ? Math.round(posterSize * 1.5) : Math.round(posterSize * 2.25)) // Square for music, 2:3 for video
    : getTranscodedImageUrl(item.thumb, squarePosters ? 128 : 128, squarePosters ? 128 : 192); // Square for music list view

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (viewMode === 'grid') {
    return (
      <div
        ref={cardRef}
        className="group cursor-pointer flex flex-col"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        style={{
          width: `${posterSize}px`,
        }}
      >
        {/* Card with hover elevation - Modern Plex Pro styling */}
        <div 
          className="relative bg-white rounded-md overflow-hidden border border-border shadow-soft group-hover:shadow-medium transition-all duration-200 group-hover:-translate-y-1 flex-shrink-0"
          style={{
            width: `${posterSize}px`,
            height: `${squarePosters ? posterSize : Math.round(posterSize * 1.5)}px`, // Square for music, 2:3 for video posters
          }}
        >
          {/* Poster Image */}
          <div className="absolute inset-0">
            {imageUrl && isVisible ? (
              <>
                {!imageLoaded && (
                  <div className="w-full h-full flex items-center justify-center bg-background-secondary">
                    <Spinner size="md" variant="primary" />
                  </div>
                )}
                <img
                  src={imageUrl}
                  alt={item.title}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  loading="lazy"
                />
              </>
            ) : !imageUrl ? (
              <div className="w-full h-full flex items-center justify-center bg-background-secondary">
                <svg
                  className="h-12 w-12 text-text-tertiary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-full h-full bg-background-secondary"></div>
            )}
            
            {/* Metadata overlay on hover - appears smoothly */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
              <h3 className="text-white text-sm font-semibold leading-tight mb-1 line-clamp-2">
                {item.title}
              </h3>
              <div className="flex flex-col gap-0.5">
                {item.parentTitle && (
                  <p className="text-white/90 text-xs truncate">
                    {item.parentTitle}
                  </p>
                )}
                <div className="flex items-center gap-2 text-white/80 text-xs">
                  {item.year && <span>{item.year}</span>}
                  {item.duration && (
                    <>
                      {item.year && <span>•</span>}
                      <span>{formatDuration(item.duration)}</span>
                    </>
                  )}
                </div>
                {item.viewCount !== undefined && item.viewCount > 0 && (
                  <p className="text-white/70 text-xs">
                    Played {item.viewCount}×
                  </p>
                )}
              </div>
            </div>
            
            {/* Cached data badge removed */}
          </div>
        </div>
        
        {/* Title below card (visible when not hovering) */}
        <div className="mt-3 min-h-0 group-hover:opacity-0 transition-opacity duration-200" style={{ width: `${posterSize}px` }}>
          <h3 className="text-sm font-medium text-text-primary truncate">
            {item.title}
          </h3>
          {item.parentTitle && (
            <p className="text-xs text-text-tertiary truncate mt-0.5">
              {item.parentTitle}
            </p>
          )}
          {item.year && (
            <p className="text-xs text-text-tertiary mt-0.5">{item.year}</p>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      ref={cardRef}
      className="flex items-center space-x-4 p-3 rounded-lg hover:bg-background-secondary cursor-pointer transition-colors"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex-shrink-0 w-16 h-16 bg-secondary-100 rounded overflow-hidden">
        {imageUrl && isVisible ? (
          <>
            {!imageLoaded && (
              <div className="w-full h-full flex items-center justify-center">
                <Spinner size="sm" variant="primary" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={item.title}
              className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
          </>
        ) : !imageUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="h-6 w-6 text-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        ) : (
          <div className="w-full h-full bg-secondary-200"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary truncate">
            {item.title}
          </h3>
        </div>
        {item.parentTitle && (
          <p className="text-xs text-text-tertiary truncate">
            {item.parentTitle}
          </p>
        )}
        <div className="flex items-center space-x-2 mt-1">
          {item.year && (
            <span className="text-xs text-text-tertiary">{item.year}</span>
          )}
          {item.duration && (
            <>
              <span className="text-xs text-text-tertiary">•</span>
              <span className="text-xs text-text-tertiary">
                {formatDuration(item.duration)}
              </span>
            </>
          )}
          {item.viewCount !== undefined && item.viewCount > 0 && (
            <>
              <span className="text-xs text-text-tertiary">•</span>
              <span className="text-xs text-text-tertiary">
                Played {item.viewCount} {item.viewCount === 1 ? 'time' : 'times'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Format duration from milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}
