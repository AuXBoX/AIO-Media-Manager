import { useState } from 'react';
import type { SearchResult, MatchConfirmation } from '@/types/metadata-refresh';
import type { LibraryItem } from '@/managers/LibraryManager';

interface SearchMatchScreenProps {
  item: LibraryItem;
  itemIndex: number;
  totalItems: number;
  searchResults: SearchResult[];
  onConfirm: (confirmation: MatchConfirmation) => void;
  onSkip: () => void;
  onSearchAgain: (query: string) => void;
}

/**
 * SearchMatchScreen Component
 * 
 * Shows search results for an item and allows user to confirm the match
 * or select a different result.
 */
export function SearchMatchScreen({
  item,
  itemIndex,
  totalItems,
  searchResults,
  onConfirm,
  onSkip,
  onSearchAgain,
}: SearchMatchScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customQuery, setCustomQuery] = useState('');
  const [showCustomSearch, setShowCustomSearch] = useState(false);

  // Check if this is a music item (for square poster display)
  const isMusic = item.type === 'artist' || item.type === 'album' || item.type === 'track';

  const handleConfirm = () => {
    onConfirm({
      itemIndex,
      selectedResultIndex: selectedIndex,
      confirmed: true,
      skipped: false,
    });
  };

  const handleCustomSearch = () => {
    if (customQuery.trim()) {
      onSearchAgain(customQuery.trim());
      setShowCustomSearch(false);
      setCustomQuery('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50">
            Confirm Match
          </h3>
          <span className="text-sm text-secondary-500 dark:text-secondary-400">
            Item {itemIndex + 1} of {totalItems}
          </span>
        </div>
        <p className="text-sm text-secondary-600 dark:text-secondary-400">
          Searching for: <strong>{item.title}</strong>
          {item.year && <span className="ml-2">({item.year})</span>}
        </p>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 ? (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {searchResults.map((result, index) => (
            <button
              key={`${result.provider}-${result.externalId}`}
              onClick={() => setSelectedIndex(index)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedIndex === index
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600'
              }`}
            >
              <div className="flex gap-4">
                {/* Poster */}
                {result.poster ? (
                  <img
                    src={result.poster}
                    alt={result.title}
                    className={`${isMusic ? 'w-20 h-20' : 'w-20 h-30'} object-cover rounded flex-shrink-0`}
                  />
                ) : (
                  <div className={`${isMusic ? 'w-20 h-20' : 'w-20 h-30'} bg-secondary-200 dark:bg-secondary-700 rounded flex items-center justify-center flex-shrink-0`}>
                    <svg className="w-8 h-8 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-secondary-900 dark:text-secondary-50">
                        {result.title}
                        {result.year && (
                          <span className="ml-2 text-secondary-600 dark:text-secondary-400">
                            ({result.year})
                          </span>
                        )}
                      </h4>
                      {result.originalTitle && result.originalTitle !== result.title && (
                        <p className="text-sm text-secondary-500 dark:text-secondary-400">
                          {result.originalTitle}
                        </p>
                      )}
                    </div>
                    
                    {/* Rating */}
                    {result.rating && (
                      <div className="flex items-center gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {result.rating.toFixed(1)}
                      </div>
                    )}
                  </div>

                  {/* Genres */}
                  {result.genres && result.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {result.genres.slice(0, 3).map((genre) => (
                        <span
                          key={genre}
                          className="px-2 py-0.5 text-xs rounded-full bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  {result.summary && (
                    <p className="mt-2 text-sm text-secondary-600 dark:text-secondary-400 line-clamp-2">
                      {result.summary}
                    </p>
                  )}

                  {/* Provider */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-secondary-500 dark:text-secondary-400">
                      Source: {result.provider.toUpperCase()}
                    </span>
                    {selectedIndex === index && (
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                        ✓ Selected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-50">
            No results found
          </h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Try searching with a different query
          </p>
        </div>
      )}

      {/* Custom Search */}
      {showCustomSearch && (
        <div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            Custom Search Query
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
              placeholder="Enter custom search query..."
              className="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
              autoFocus
            />
            <button
              onClick={handleCustomSearch}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
            >
              Search
            </button>
            <button
              onClick={() => {
                setShowCustomSearch(false);
                setCustomQuery('');
              }}
              className="px-4 py-2 bg-secondary-200 dark:bg-secondary-700 hover:bg-secondary-300 dark:hover:bg-secondary-600 text-secondary-700 dark:text-secondary-300 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-secondary-200 dark:border-secondary-700">
        <div className="flex gap-2">
          <button
            onClick={() => setShowCustomSearch(!showCustomSearch)}
            className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-md transition-colors"
          >
            Search Again
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-md transition-colors"
          >
            Skip Item
          </button>
        </div>

        <button
          onClick={handleConfirm}
          disabled={searchResults.length === 0}
          className="px-6 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-300 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center gap-2"
        >
          Use This Match
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
