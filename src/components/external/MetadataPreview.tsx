import { ExternalMetadata } from '@/types';

interface MetadataPreviewProps {
  metadata: ExternalMetadata | null;
  isLoading: boolean;
  onImport: () => void;
  isImporting: boolean;
}

/**
 * Metadata Preview Component
 * 
 * Displays full metadata preview before importing
 */
export function MetadataPreview({
  metadata,
  isLoading,
  onImport,
  isImporting,
}: MetadataPreviewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading metadata...</p>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-5xl mb-4">📄</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Metadata Available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Failed to load metadata preview
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Artwork */}
      <div className="flex space-x-6">
        {/* Poster */}
        <div className="flex-shrink-0">
          {metadata.posters && metadata.posters.length > 0 ? (
            <img
              src={metadata.posters[0]}
              alt={metadata.title}
              className="w-48 h-72 object-cover rounded-lg shadow-lg"
            />
          ) : (
            <div className="w-48 h-72 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400 text-5xl">🎬</span>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {metadata.title}
          </h3>
          {metadata.originalTitle && metadata.originalTitle !== metadata.title && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
              {metadata.originalTitle}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
            {metadata.year && <span>{metadata.year}</span>}
            {metadata.runtime && <span>• {metadata.runtime} min</span>}
            {metadata.rating && (
              <span className="flex items-center">
                • ⭐ {metadata.rating.toFixed(1)}/10
              </span>
            )}
          </div>
          {metadata.tagline && (
            <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-4">
              "{metadata.tagline}"
            </p>
          )}
          {metadata.genres && metadata.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {metadata.genres.map((genre, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full text-sm"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4">
            <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              Source: {metadata.provider.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Summary */}
      {metadata.summary && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Summary
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {metadata.summary}
          </p>
        </div>
      )}

      {/* Cast */}
      {metadata.cast && metadata.cast.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Cast
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {metadata.cast.slice(0, 8).map((actor, index) => (
              <div key={index} className="text-center">
                {actor.profilePath ? (
                  <img
                    src={actor.profilePath}
                    alt={actor.name}
                    className="w-full aspect-[2/3] object-cover rounded-lg mb-2"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
                    <span className="text-gray-400 text-3xl">👤</span>
                  </div>
                )}
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {actor.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {actor.character}
                </p>
              </div>
            ))}
          </div>
          {metadata.cast.length > 8 && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-3">
              + {metadata.cast.length - 8} more cast members
            </p>
          )}
        </div>
      )}

      {/* Crew */}
      {metadata.crew && metadata.crew.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Crew
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Directors */}
            {metadata.crew.filter((c) => c.job === 'Director').length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-1">
                  Director{metadata.crew.filter((c) => c.job === 'Director').length > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {metadata.crew
                    .filter((c) => c.job === 'Director')
                    .map((c) => c.name)
                    .join(', ')}
                </p>
              </div>
            )}
            {/* Writers */}
            {metadata.crew.filter((c) => c.job === 'Writer' || c.job === 'Screenplay').length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-1">
                  Writer{metadata.crew.filter((c) => c.job === 'Writer' || c.job === 'Screenplay').length > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {metadata.crew
                    .filter((c) => c.job === 'Writer' || c.job === 'Screenplay')
                    .map((c) => c.name)
                    .join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrops */}
      {metadata.backdrops && metadata.backdrops.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Background Art
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {metadata.backdrops.slice(0, 4).map((backdrop, index) => (
              <img
                key={index}
                src={backdrop}
                alt={`Backdrop ${index + 1}`}
                className="w-full aspect-video object-cover rounded-lg"
              />
            ))}
          </div>
          {metadata.backdrops.length > 4 && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-3">
              + {metadata.backdrops.length - 4} more backdrops available
            </p>
          )}
        </div>
      )}

      {/* Import Button */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onImport}
          disabled={isImporting}
          className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isImporting ? 'Importing...' : 'Import This Metadata'}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-2">
          This will update the item's metadata in Plex
        </p>
      </div>
    </div>
  );
}
