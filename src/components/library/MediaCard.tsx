import { LibraryItem } from '@/managers/LibraryManager';
import { CachedDataBadge } from '@/components/offline/CachedDataBadge';
import { useState, useEffect, useRef } from 'react';

interface MediaCardProps {
  item: LibraryItem;
  viewMode: 'grid' | 'list';
  serverUrl: string;
  token: string;
  onClick?: (item: LibraryItem) => void;
  isCached?: boolean;
  isDirty?: boolean;
  posterSize?: number;
}

/**
 * MediaCard Component
 * Displays a media item in either grid or list view with lazy loading
 */
export function MediaCard({ item, viewMode, serverUrl, token, onClick, isCached = false, isDirty = false, posterSize = 180 }: MediaCardProps) {
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
    ? getTranscodedImageUrl(item.thumb, Math.round(posterSize * 1.5), Math.round(posterSize * 2.25)) // Request 1.5x size for retina
    : getTranscodedImageUrl(item.thumb, 128, 192); // Small size for list view

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
        <div 
          className="relative bg-gray-200 dark:bg-gray-700 rounded overflow-hidden shadow-md flex-shrink-0"
          style={{
            width: `${posterSize}px`,
            height: `${Math.round(posterSize * 1.5)}px`,
          }}
        >
          <div className="absolute inset-0">
            {imageUrl && isVisible ? (
              <>
                {!imageLoaded && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                )}
                <img
                  src={imageUrl}
                  alt={item.title}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  loading="lazy"
                />
              </>
            ) : !imageUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  className="h-12 w-12 text-gray-400"
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
              <div className="w-full h-full bg-gray-300 dark:bg-gray-600"></div>
            )}
            {/* Cached data badge */}
            <CachedDataBadge
              isCached={isCached}
              isDirty={isDirty}
              size="sm"
              position="top-right"
            />
          </div>
        </div>
        <div className="mt-2 min-h-0" style={{ width: `${posterSize}px` }}>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {item.title}
          </h3>
          {item.parentTitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {item.parentTitle}
            </p>
          )}
          {item.year && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.year}</p>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      ref={cardRef}
      className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
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
      <div className="flex-shrink-0 w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
        {imageUrl && isVisible ? (
          <>
            {!imageLoaded && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
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
              className="h-6 w-6 text-gray-400"
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
          <div className="w-full h-full bg-gray-300 dark:bg-gray-600"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {item.title}
          </h3>
          {/* Cached data badge inline */}
          <CachedDataBadge
            isCached={isCached}
            isDirty={isDirty}
            size="sm"
            position="inline"
          />
        </div>
        {item.parentTitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {item.parentTitle}
          </p>
        )}
        <div className="flex items-center space-x-2 mt-1">
          {item.year && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{item.year}</span>
          )}
          {item.duration && (
            <>
              <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDuration(item.duration)}
              </span>
            </>
          )}
          {item.viewCount !== undefined && item.viewCount > 0 && (
            <>
              <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
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
