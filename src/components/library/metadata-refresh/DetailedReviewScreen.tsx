import { useState } from 'react';
import type { EnhancedReviewItem } from '@/types/metadata-refresh';
import { MetadataEditor } from './MetadataEditor';
import { ImageSelector } from './ImageSelector';
import { TrailerSelector } from './TrailerSelector';

interface DetailedReviewScreenProps {
  reviewItems: EnhancedReviewItem[];
  currentIndex: number;
  serverUrl: string;
  token: string;
  onItemChange: (index: number, item: EnhancedReviewItem) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onApply: () => void;
  onCancel: () => void;
}

type TabType = 'metadata' | 'images' | 'trailers' | 'cast';

/**
 * DetailedReviewScreen Component
 * 
 * Main review UI with tabs for metadata, images, trailers, and cast
 */
export function DetailedReviewScreen({
  reviewItems,
  currentIndex,
  serverUrl,
  token,
  onItemChange,
  onNavigate,
  onApply,
  onCancel,
}: DetailedReviewScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('metadata');
  const currentItem = reviewItems[currentIndex];

  if (!currentItem) {
    return null;
  }

  const selectedCount = reviewItems.filter((item) => item.selected).length;
  const hasChanges = reviewItems.some((item) => item.hasChanges);

  const handleMetadataChange = (metadata: typeof currentItem.metadata) => {
    const hasMetadataChanges = JSON.stringify(metadata) !== JSON.stringify(currentItem.originalMetadata);
    onItemChange(currentIndex, {
      ...currentItem,
      metadata,
      hasChanges: hasMetadataChanges,
    });
  };

  const handlePosterSelection = (selectedIndex: number) => {
    const updatedPosters = currentItem.images.posters.map((poster, idx) => ({
      ...poster,
      selected: idx === selectedIndex,
    }));
    onItemChange(currentIndex, {
      ...currentItem,
      images: { ...currentItem.images, posters: updatedPosters },
      hasChanges: true,
    });
  };

  const handleBackgroundSelection = (selectedIndex: number) => {
    const updatedBackgrounds = currentItem.images.backgrounds.map((bg, idx) => ({
      ...bg,
      selected: idx === selectedIndex,
    }));
    onItemChange(currentIndex, {
      ...currentItem,
      images: { ...currentItem.images, backgrounds: updatedBackgrounds },
      hasChanges: true,
    });
  };

  const handleLogoSelection = (selectedIndex: number) => {
    if (!currentItem.images.logos) return;
    const updatedLogos = currentItem.images.logos.map((logo, idx) => ({
      ...logo,
      selected: idx === selectedIndex,
    }));
    onItemChange(currentIndex, {
      ...currentItem,
      images: { ...currentItem.images, logos: updatedLogos },
      hasChanges: true,
    });
  };

  const handleBannerSelection = (selectedIndex: number) => {
    if (!currentItem.images.banners) return;
    const updatedBanners = currentItem.images.banners.map((banner, idx) => ({
      ...banner,
      selected: idx === selectedIndex,
    }));
    onItemChange(currentIndex, {
      ...currentItem,
      images: { ...currentItem.images, banners: updatedBanners },
      hasChanges: true,
    });
  };

  const handleTrailerSelection = (index: number, selected: boolean) => {
    const updatedTrailers = currentItem.trailers.map((trailer, idx) =>
      idx === index ? { ...trailer, selected } : trailer
    );
    onItemChange(currentIndex, {
      ...currentItem,
      trailers: updatedTrailers,
      hasChanges: true,
    });
  };

  const handleTrailerQualityChange = (index: number, quality: string) => {
    const updatedTrailers = currentItem.trailers.map((trailer, idx) =>
      idx === index ? { ...trailer, selectedQuality: quality } : trailer
    );
    onItemChange(currentIndex, {
      ...currentItem,
      trailers: updatedTrailers,
      hasChanges: true,
    });
  };

  const handleToggleItemSelection = () => {
    onItemChange(currentIndex, {
      ...currentItem,
      selected: !currentItem.selected,
    });
  };

  // Detect if this is a music item
  const isMusicItem = currentItem.item.type === 'artist' || currentItem.item.type === 'album' || currentItem.item.type === 'track';

  const allTabs: Array<{ id: TabType; label: string; icon: JSX.Element; count?: number }> = [
    {
      id: 'metadata',
      label: 'Metadata',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'images',
      label: 'Images',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      count: currentItem.images.posters.length + currentItem.images.backgrounds.length + (currentItem.images.logos?.length || 0),
    },
    {
      id: 'trailers',
      label: 'Trailers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      count: currentItem.trailers.length,
    },
    {
      id: 'cast',
      label: 'Cast & Crew',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      count: currentItem.cast.length,
    },
  ];

  // Filter tabs based on item type - hide trailers and cast for music items
  const tabs = allTabs.filter(tab => {
    if (isMusicItem && (tab.id === 'trailers' || tab.id === 'cast')) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-secondary-200 dark:border-secondary-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-secondary-900 dark:text-secondary-50">
              {currentItem.item.title}
              {currentItem.item.year && (
                <span className="ml-2 text-secondary-500 dark:text-secondary-400">
                  ({currentItem.item.year})
                </span>
              )}
            </h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
              Item {currentIndex + 1} of {reviewItems.length}
              {currentItem.hasChanges && (
                <span className="ml-2 text-green-600 dark:text-green-400">• Has changes</span>
              )}
            </p>
          </div>

          {/* Include in Apply Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentItem.selected}
              onChange={handleToggleItemSelection}
              className="w-5 h-5 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
              Include in update
            </span>
          </label>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-secondary-200 dark:bg-secondary-700">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'metadata' && (
          <MetadataEditor
            metadata={currentItem.metadata}
            originalMetadata={currentItem.originalMetadata}
            onChange={handleMetadataChange}
          />
        )}

        {activeTab === 'images' && (
          <ImageSelector
            posters={currentItem.images.posters}
            backgrounds={currentItem.images.backgrounds}
            logos={currentItem.images.logos || []}
            banners={currentItem.images.banners || []}
            onPosterChange={handlePosterSelection}
            onBackgroundChange={handleBackgroundSelection}
            onLogoChange={handleLogoSelection}
            onBannerChange={handleBannerSelection}
            serverUrl={serverUrl}
            token={token}
          />
        )}

        {activeTab === 'trailers' && (
          <TrailerSelector
            trailers={currentItem.trailers}
            onSelectionChange={handleTrailerSelection}
            onQualityChange={handleTrailerQualityChange}
            maxSelection={3}
          />
        )}

        {activeTab === 'cast' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-3">
                Cast ({currentItem.cast.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentItem.cast.slice(0, 20).map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg"
                  >
                    {member.profilePath ? (
                      <img
                        src={member.profilePath}
                        alt={member.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-secondary-200 dark:bg-secondary-700 flex items-center justify-center">
                        <svg className="w-6 h-6 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-secondary-900 dark:text-secondary-50 truncate">
                        {member.name}
                      </p>
                      {member.character && (
                        <p className="text-sm text-secondary-600 dark:text-secondary-400 truncate">
                          as {member.character}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-secondary-200 dark:border-secondary-700 p-6">
        <div className="flex items-center justify-between">
          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('prev')}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <button
              onClick={() => onNavigate('next')}
              disabled={currentIndex === reviewItems.length - 1}
              className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onApply}
              disabled={selectedCount === 0}
              className="px-6 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-300 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Apply Changes ({selectedCount})
            </button>
          </div>
        </div>

        {/* Summary */}
        {hasChanges && (
          <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
            <p className="text-sm text-primary-800 dark:text-primary-200">
              <strong>{selectedCount}</strong> items selected for update.
              {hasChanges && ' Some items have changes.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
