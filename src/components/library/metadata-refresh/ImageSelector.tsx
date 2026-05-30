import { useState } from 'react';
import type { SelectableImage } from '@/types/metadata-refresh';

interface ImageSelectorProps {
  posters: SelectableImage[];
  backgrounds: SelectableImage[];
  logos: SelectableImage[];
  banners: SelectableImage[];
  onPosterChange: (selectedIndex: number) => void;
  onBackgroundChange: (selectedIndex: number) => void;
  onLogoChange: (selectedIndex: number) => void;
  onBannerChange: (selectedIndex: number) => void;
  serverUrl: string;
  token: string;
  isMusic?: boolean;
}

type ImageTab = 'posters' | 'backgrounds' | 'logos' | 'banners';

/**
 * ImageSelector Component
 * 
 * Displays a tabbed interface for selecting images by type
 */
export function ImageSelector({
  posters,
  backgrounds,
  logos,
  banners,
  onPosterChange,
  onBackgroundChange,
  onLogoChange,
  onBannerChange,
  serverUrl,
  token,
  isMusic = false,
}: ImageSelectorProps) {
  const [activeTab, setActiveTab] = useState<ImageTab>('posters');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const tabs = [
    { 
      id: 'posters' as ImageTab, 
      label: 'Posters', 
      count: posters.length, 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: 'backgrounds' as ImageTab, 
      label: 'Backgrounds', 
      count: backgrounds.length, 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    },
    { 
      id: 'logos' as ImageTab, 
      label: 'Logos', 
      count: logos.length, 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    { 
      id: 'banners' as ImageTab, 
      label: 'Banners', 
      count: banners.length, 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
  ];

  const getActiveImages = (): SelectableImage[] => {
    switch (activeTab) {
      case 'posters':
        return posters;
      case 'backgrounds':
        return backgrounds;
      case 'logos':
        return logos;
      case 'banners':
        return banners;
    }
  };

  const getActiveHandler = () => {
    switch (activeTab) {
      case 'posters':
        return onPosterChange;
      case 'backgrounds':
        return onBackgroundChange;
      case 'logos':
        return onLogoChange;
      case 'banners':
        return onBannerChange;
    }
  };

  const getAspectRatioClass = () => {
    switch (activeTab) {
      case 'posters':
        return isMusic ? 'aspect-square' : 'aspect-[2/3]'; // Square for music, portrait for movies/TV
      case 'backgrounds':
        return 'aspect-video'; // 16:9
      case 'logos':
        return 'aspect-[8/3]'; // Wide
      case 'banners':
        return 'aspect-[5.4/1]'; // Very wide
    }
  };

  const activeImages = getActiveImages();
  const activeHandler = getActiveHandler();

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="flex gap-2" aria-label="Image types">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-200 hover:border-secondary-300 dark:hover:border-secondary-600'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === tab.id
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeImages.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-16 w-16 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-4 text-sm text-secondary-500 dark:text-secondary-400">
            No {activeTab} available
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              Select one image to use
            </p>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-[500px] overflow-y-auto pr-2">
            {activeImages.map((image, index) => (
              <div key={index} className="relative">
                <button
                  onClick={() => activeHandler(index)}
                  className={`w-full relative group rounded-lg overflow-hidden border-2 transition-all ${
                    image.selected
                      ? 'border-primary-500 ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-secondary-900'
                      : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600'
                  }`}
                >
                  {/* Image */}
                  <div className={`${getAspectRatioClass()} bg-secondary-100 dark:bg-secondary-800 relative`}>
                    <img
                      src={image.url}
                      alt={`${activeTab} ${index + 1}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      {image.selected && (
                        <div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full p-1.5 shadow-lg">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  {(image.width || image.height) && (
                    <div className="p-2 bg-white dark:bg-secondary-900">
                      <p className="text-xs text-secondary-600 dark:text-secondary-400 text-center">
                        {image.width && image.height ? `${image.width} × ${image.height}` : 'Unknown size'}
                        {image.language && <span className="ml-1">• {image.language}</span>}
                      </p>
                    </div>
                  )}
                </button>
                
                {/* Preview button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(image.url);
                  }}
                  className="absolute top-2 left-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors z-10 shadow-lg"
                  title="Preview full size"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4"
          style={{ zIndex: 10100 }}
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-6xl max-h-[95vh] relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors backdrop-blur-sm"
              title="Close preview"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
