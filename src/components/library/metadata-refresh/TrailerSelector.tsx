import type { FetchedTrailer } from '@/types/metadata-refresh';

interface TrailerSelectorProps {
  trailers: FetchedTrailer[];
  onSelectionChange: (index: number, selected: boolean) => void;
  onQualityChange?: (index: number, quality: string) => void;
  maxSelection?: number;
}

/**
 * TrailerSelector Component
 * 
 * Displays a list of trailers with checkboxes for selection
 */
export function TrailerSelector({
  trailers,
  onSelectionChange,
  onQualityChange,
  maxSelection = 3,
}: TrailerSelectorProps) {
  const selectedCount = trailers.filter((t) => t.selected).length;

  if (trailers.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">
          No trailers found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50">
          Available Trailers ({trailers.length})
        </h4>
        <span className="text-xs text-secondary-500 dark:text-secondary-400">
          {selectedCount} of {maxSelection} selected
        </span>
      </div>

      {/* Trailers List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {trailers.map((trailer, index) => (
          <div
            key={trailer.id}
            className={`p-4 rounded-lg border-2 transition-all ${
              trailer.selected
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-secondary-200 dark:border-secondary-700'
            }`}
          >
            <div className="flex gap-4">
              {/* Checkbox */}
              <div className="flex-shrink-0 pt-1">
                <input
                  type="checkbox"
                  checked={trailer.selected}
                  onChange={(e) => onSelectionChange(index, e.target.checked)}
                  disabled={!trailer.selected && selectedCount >= maxSelection}
                  className="w-5 h-5 text-primary-600 border-secondary-300 rounded focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Thumbnail */}
              <div className="flex-shrink-0">
                <div className="relative w-32 h-18 bg-secondary-200 dark:bg-secondary-700 rounded overflow-hidden">
                  {trailer.thumbnail ? (
                    <img
                      src={trailer.thumbnail}
                      alt={trailer.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Duration overlay */}
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {trailer.duration}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-secondary-900 dark:text-secondary-50 truncate">
                      {trailer.title}
                    </h5>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-0.5">
                      {trailer.channelName}
                    </p>
                  </div>

                  {/* Score Badge */}
                  <div className="flex-shrink-0">
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        trailer.score >= 100
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : trailer.score >= 50
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300'
                      }`}
                    >
                      Score: {trailer.score}
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {trailer.isOfficial && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                      ✓ Official
                    </span>
                  )}
                  {trailer.isStudioChannel && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                      Studio Channel
                    </span>
                  )}
                </div>

                {/* Quality Selection - only show for selected trailers */}
                {trailer.selected && trailer.quality.length > 0 && onQualityChange && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Download Quality:
                    </label>
                    <select
                      value={trailer.selectedQuality || trailer.quality[0]}
                      onChange={(e) => onQualityChange(index, e.target.value)}
                      className="text-sm border border-secondary-300 dark:border-secondary-600 rounded px-2 py-1 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100"
                    >
                      {trailer.quality.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mt-2 text-xs text-secondary-500 dark:text-secondary-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {trailer.viewCount.toLocaleString()} views
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {trailer.publishedAt}
                  </span>
                </div>

                {/* Watch Link */}
                <a
                  href={trailer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Watch on YouTube
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
