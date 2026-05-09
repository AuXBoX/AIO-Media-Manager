import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MetadataManager, ArtworkAsset, ArtworkType } from '@/managers/MetadataManager';
import { PlexClient } from '@/api/plexClient';
import { queryKeys } from '@/api/queryKeys';
import { ArtworkImage } from './ArtworkImage';

interface ArtworkGalleryProps {
  ratingKey: string;
  client: PlexClient;
  serverUrl: string;
  token: string;
  onUpload?: (type: ArtworkType) => void;
  onSelect?: (url: string, type: ArtworkType) => void;
  onDelete?: (type: ArtworkType) => void;
}

/**
 * ArtworkGallery Component
 * 
 * Displays all artwork for a metadata item in a grid layout.
 * Shows which artwork is currently selected and provides actions for upload, select, and delete.
 */
export const ArtworkGallery: React.FC<ArtworkGalleryProps> = ({
  ratingKey,
  client,
  serverUrl,
  token,
  onUpload,
  onSelect,
  onDelete,
}) => {
  const [previewArtwork, setPreviewArtwork] = useState<ArtworkAsset | null>(null);
  const manager = new MetadataManager(client);

  // Fetch artwork
  const { data: artwork, isLoading, error } = useQuery({
    queryKey: queryKeys.metadataArtwork(ratingKey),
    queryFn: () => manager.getArtwork(ratingKey),
  });

  const handlePreview = (asset: ArtworkAsset) => {
    setPreviewArtwork(asset);
  };

  const closePreview = () => {
    setPreviewArtwork(null);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading artwork...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 text-3xl mb-2">⚠️</div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {error instanceof Error ? error.message : 'Failed to load artwork'}
        </p>
      </div>
    );
  }

  if (!artwork || artwork.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 text-3xl mb-2">🖼️</div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">No artwork available</p>
        {onUpload && (
          <button
            onClick={() => onUpload('poster')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
          >
            Upload Artwork
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Artwork Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {artwork.map((asset, index) => (
          <div
            key={`${asset.type}-${index}`}
            className={`relative bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border-2 transition-all ${
              asset.selected
                ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                : 'border-gray-200 dark:border-gray-700'
            }`}
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
                <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Selected
                </span>
              </div>
            )}

            {/* Artwork Image */}
            <div
              className="cursor-pointer aspect-[2/3] relative"
              onClick={() => handlePreview(asset)}
            >
              <ArtworkImage
                serverUrl={serverUrl}
                imagePath={asset.url}
                token={token}
                alt={`${getArtworkTypeLabel(asset.type)} artwork`}
                size="medium"
                className="w-full h-full"
              />
            </div>

            {/* Actions */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => handlePreview(asset)}
                  className="flex-1 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Preview
                </button>
                {onSelect && !asset.selected && (
                  <button
                    onClick={() => onSelect(asset.url, asset.type)}
                    className="flex-1 px-3 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
                  >
                    Select
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(asset.type)}
                    className="px-3 py-1.5 text-sm text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                    aria-label="Delete artwork"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Button */}
      {onUpload && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => onUpload('poster')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span>Upload New Artwork</span>
          </button>
        </div>
      )}

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
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getArtworkTypeLabel(previewArtwork.type)}
                </h3>
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
  );
};
