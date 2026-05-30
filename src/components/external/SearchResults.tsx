import { SearchResult } from '@/types';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  onResultSelect: (result: SearchResult) => void;
}

/**
 * Search Results Component
 * 
 * Displays search results from external metadata providers
 */
export function SearchResults({ results, isLoading, onResultSelect }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Searching...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-5xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Results
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Try adjusting your search query or year filter
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {results.length} {results.length === 1 ? 'result' : 'results'} found
      </h3>
      <div className="space-y-3">
        {results.map((result) => (
          <button
            key={result.externalId}
            onClick={() => onResultSelect(result)}
            className="w-full flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            {/* Thumbnail */}
            <div className="flex-shrink-0">
              {result.thumb ? (
                <img
                  src={result.thumb}
                  alt={result.title}
                  className="w-16 h-24 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-24 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400 text-2xl">🎬</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-medium text-gray-900 dark:text-white truncate">
                {result.title}
              </h4>
              {result.originalTitle && result.originalTitle !== result.title && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {result.originalTitle}
                </p>
              )}
              {result.year && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {result.year}
                </p>
              )}
              {result.summary && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                  {result.summary}
                </p>
              )}
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                  {result.provider.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 self-center">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
