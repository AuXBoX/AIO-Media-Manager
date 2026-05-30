import React, { useState } from 'react';
import { ArtworkAsset, ArtworkType } from '@/managers/MetadataManager';
import { ArtworkImage } from './ArtworkImage';

interface ArtworkSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  artwork: ArtworkAsset[];
  serverUrl: string;
  token: string;
  onSelect: (url: string, type: ArtworkType) => Promise<void>;
  filterType?: ArtworkType;
}

/**
 * ArtworkSelector Component
 * 
 * Modal for selecting from available artwork options
 */
export const ArtworkSelector: React.FC<ArtworkSelectorProps> = ({
  isOpen,
  onClose,
  artwork,
  serverUrl,
  token,
  onSelect,
  filterType,
}) => {
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkAsset | null>(null);
  const [previewArtwork, setPreviewArtwork] = useState<ArtworkAsset | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectSuccess, setSelectSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter artwork by type if specified
  const filteredArtwork = filterType
    ? artwork.filter((asset) => asset.type === filterType)
    : artwork;

  const handleSelect = async (asset: ArtworkAsset) => {
    setIsSelecting(true);
    setError(null);
    setSelectedArtwork(asset);

    try {
      await onSelect(asset.url, asset.type);
      setSelectSuccess(true);

      // Close modal after a short delay
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Selection failed');
    } finally {
      setIsSelecting(false);
    }
  };

  const handlePreview = (asset: ArtworkAsset) => {
    setPreviewArtwork(asset);
  };

  const closePreview = () => {
    setPreviewArtwork(null);
  };

  const handleClose = () => {
    // Reset state
    setSelectedArtwork(null);
    setPreviewArtwork(null);
    setIsSelecting(false);
    setSelectSuccess(false);
    setError(null);

    onClose();
  };

  const getArtworkTypeLabel = (type: ArtworkType): string => {
    const labels: Record<ArtworkType, string> = {
      poster: 'Poster',
      background: 'Background',
      banner: 'Banner',
      thumb: 'Thumbnail',
    };
    return labels[type];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Select Artwork
              </h2>
              {filterType && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {getArtworkTypeLabel(filterType)} options
                </p>
              )}
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
            {selectSuccess && (
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
                    Artwork selected successfully!
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

            {/* No Artwork */}
            {filteredArtwork.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-5xl mb-4">🖼️</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Artwork Available
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {filterType
                    ? `No ${getArtworkTypeLabel(filterType).toLowerCase()} artwork found`
                    : 'No artwork available for this item'}
                </p>
              </div>
            )}

            {/* Artwork Grid */}
            {filteredArtwork.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredArtwork.map((asset, index) => (
                  <div
                    key={`${asset.type}-${index}`}
                    className={`relative bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border-2 transition-all cursor-pointer ${
                      asset.selected
                        ? 'border-primary-500 ring-2 ring-primary-500 ring-opacity-50'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => handlePreview(asset)}
                  >
                    {/* Artwork Type Label */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded">
                        {getArtworkTypeLabel(asset.type)}
                      </span>
                    </div>

                    {/* Selected Badge */}
                    {asset.selected && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="px-2 py-1 bg-primary-500 text-white text-xs rounded flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Current
                        </span>
                      </div>
                    )}

                    {/* Artwork Image */}
                    <div className="aspect-[2/3] relative">
                      <ArtworkImage
                        serverUrl={serverUrl}
                        imagePath={asset.url}
                        token={token}
                        alt={`${getArtworkTypeLabel(asset.type)} artwork`}
                        size="small"
                        className="w-full h-full"
                      />
                    </div>

                    {/* Select Button Overlay */}
                    {!asset.selected && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(asset);
                          }}
                          disabled={isSelecting}
                          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSelecting && selectedArtwork === asset ? 'Selecting...' : 'Select'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview Modal */}
          {previewArtwork && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
              onClick={closePreview}
            >
              <div
                className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={closePreview}
                  className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
                  aria-label="Close preview"
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

                {/* Preview Image */}
                <div className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {getArtworkTypeLabel(previewArtwork.type)}
                    </h3>
                    {!previewArtwork.selected && (
                      <button
                        onClick={() => handleSelect(previewArtwork)}
                        disabled={isSelecting}
                        className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSelecting && selectedArtwork === previewArtwork
                          ? 'Selecting...'
                          : 'Select This'}
                      </button>
                    )}
                  </div>
                  <img
                    src={`${serverUrl}${previewArtwork.url}?X-Plex-Token=${token}`}
                    alt={`${getArtworkTypeLabel(previewArtwork.type)} preview`}
                    className="max-w-full max-h-[70vh] mx-auto rounded"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
