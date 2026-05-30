import { useState } from 'react';
import { ExternalProvider, MediaType } from '@/types';
import { SearchResults } from './SearchResults';
import { MetadataPreview } from './MetadataPreview';
import { ProviderRegistry } from '@/providers/ProviderRegistry';
import { SearchResult, ExternalMetadata } from '@/types';

interface ExternalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerRegistry: ProviderRegistry;
  ratingKey: string;
  mediaType: MediaType;
  currentTitle?: string;
  currentYear?: number;
}

/**
 * External Search Modal
 * 
 * Main modal for searching external metadata providers and importing metadata
 */
export function ExternalSearchModal({
  isOpen,
  onClose,
  providerRegistry,
  ratingKey,
  mediaType,
  currentTitle = '',
  currentYear,
}: ExternalSearchModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<ExternalProvider | null>(null);
  const [searchQuery, setSearchQuery] = useState(currentTitle);
  const [searchYear, setSearchYear] = useState<number | undefined>(currentYear);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [previewMetadata, setPreviewMetadata] = useState<ExternalMetadata | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Get available providers for this media type
  const availableProviders = providerRegistry
    .getAvailableProviders()
    .filter((provider) => {
      // Filter providers based on media type
      if (mediaType === 'movie' || mediaType === 'show') {
        return provider === 'tmdb' || provider === 'imdb';
      }
      if (mediaType === 'artist' || mediaType === 'album' || mediaType === 'track') {
        return provider === 'musicbrainz';
      }
      return false;
    });

  // Set default provider if not selected
  if (!selectedProvider && availableProviders.length > 0) {
    const firstProvider = availableProviders[0];
    if (firstProvider) {
      setSelectedProvider(firstProvider);
    }
  }

  const handleSearch = async () => {
    if (!selectedProvider || !searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResults([]);
    setSelectedResult(null);
    setPreviewMetadata(null);
    setImportSuccess(false);

    try {
      const results = await providerRegistry.search(
        selectedProvider,
        searchQuery.trim(),
        mediaType,
        searchYear
      );
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultSelect = async (result: SearchResult) => {
    if (!selectedProvider) return;

    setSelectedResult(result);
    setIsLoadingPreview(true);
    setError(null);

    try {
      const metadata = await providerRegistry.getDetails(selectedProvider, result.externalId);
      setPreviewMetadata(metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metadata preview');
      setPreviewMetadata(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleImport = async () => {
    if (!selectedProvider || !selectedResult) return;

    setIsImporting(true);
    setError(null);

    try {
      await providerRegistry.importMetadata(selectedProvider, ratingKey, selectedResult.externalId);
      setImportSuccess(true);
      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleBack = () => {
    setSelectedResult(null);
    setPreviewMetadata(null);
  };

  const handleClose = () => {
    // Reset state
    setSearchQuery(currentTitle);
    setSearchYear(currentYear);
    setSearchResults([]);
    setSelectedResult(null);
    setPreviewMetadata(null);
    setError(null);
    setImportSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              {selectedResult && (
                <button
                  onClick={handleBack}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  aria-label="Back to results"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedResult ? 'Metadata Preview' : 'Search External Metadata'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Success Message */}
            {importSuccess && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-green-400 mr-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Metadata imported successfully!
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-400 mr-3 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {!selectedResult ? (
              <>
                {/* Search Form */}
                <div className="space-y-4 mb-6">
                  {/* Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Provider
                    </label>
                    <div className="flex space-x-2">
                      {availableProviders.map((provider) => (
                        <button
                          key={provider}
                          onClick={() => setSelectedProvider(provider)}
                          className={`px-4 py-2 rounded-md font-medium transition-colors ${
                            selectedProvider === provider
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {provider.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Query */}
                  <div>
                    <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Search Query
                    </label>
                    <input
                      id="search-query"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Enter title to search..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Year Filter */}
                  <div>
                    <label htmlFor="search-year" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Year (optional)
                    </label>
                    <input
                      id="search-year"
                      type="number"
                      value={searchYear ?? ''}
                      onChange={(e) => setSearchYear(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Filter by year..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Search Button */}
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {/* Search Results */}
                <SearchResults
                  results={searchResults}
                  isLoading={isSearching}
                  onResultSelect={handleResultSelect}
                />
              </>
            ) : (
              <>
                {/* Metadata Preview */}
                <MetadataPreview
                  metadata={previewMetadata}
                  isLoading={isLoadingPreview}
                  onImport={handleImport}
                  isImporting={isImporting}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExternalSearchModal;
