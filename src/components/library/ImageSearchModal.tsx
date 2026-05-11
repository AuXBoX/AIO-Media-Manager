import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { LibraryItem } from '@/managers/LibraryManager';
import { createPlexClient } from '@/api/plexClient';
import { createMetadataManager } from '@/managers/MetadataManager';
import { createProviderRegistry } from '@/providers/ProviderRegistry';
import { getSettingsManager } from '@/managers/SettingsManager';
import type { SearchResult } from '@/types';

interface ImageSearchModalProps {
  item: LibraryItem;
  serverUrl: string;
  token: string;
  onClose: () => void;
  onImageSelected: () => void;
}

interface ImageResult {
  url: string;
  width: number;
  height: number;
  type: 'poster' | 'background';
  provider?: string;
}

// Helper to load image and get dimensions
const loadImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
};

type Step = 'search' | 'images';

export function ImageSearchModal({
  item,
  serverUrl,
  token,
  onClose,
  onImageSelected,
}: ImageSearchModalProps) {
  const [step, setStep] = useState<Step>('search');
  const [selectedMatch, setSelectedMatch] = useState<SearchResult | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['poster', 'background']));
  const [selectedPoster, setSelectedPoster] = useState<ImageResult | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<ImageResult | null>(null);
  const [saveTarget, setSaveTarget] = useState<'plex' | 'local' | 'both'>('plex');
  const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());

  const client = createPlexClient({ baseURL: serverUrl, token });
  const manager = createMetadataManager(client);
  
  const isMovie = item.type === 'movie';
  const isTVShow = item.type === 'show' || item.type === 'season' || item.type === 'episode';
  const mediaType = isMovie ? 'movie' : 'show';

  // Load image dimensions when an image loads
  const handleImageLoad = (url: string, event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageDimensions(prev => new Map(prev).set(url, {
      width: img.naturalWidth,
      height: img.naturalHeight,
    }));
  };

  // Get dimensions for an image
  const getDimensions = (url: string) => {
    return imageDimensions.get(url) || { width: 0, height: 0 };
  };

  // Toggle type selection
  const toggleType = (type: string) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      if (newTypes.size > 1) { // Keep at least one selected
        newTypes.delete(type);
      }
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };

  // Search for matches from providers
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['image-search-matches', item.ratingKey, item.type],
    queryFn: async () => {
      try {
        console.log('[ImageSearch] Searching for matches...', { 
          type: item.type, 
          title: item.title,
          year: item.year,
        });
        
        // Get API keys from settings
        const settingsManager = getSettingsManager();
        const settings = await settingsManager.getSettings();
        
        // Create provider registry (will use fallback keys if user keys not set)
        const config: any = {};
        if (settings.tmdbApiKey) config.tmdb = { apiKey: settings.tmdbApiKey };
        if (settings.fanartApiKey) config.fanart = { apiKey: settings.fanartApiKey };
        if (settings.tvdbApiKey) config.tvdb = { apiKey: settings.tvdbApiKey };
        
        const providerRegistry = createProviderRegistry(client, config);
        
        console.log('[ImageSearch] Available providers:', providerRegistry.getAvailableProviders());
        
        // For TV shows: Try TVDB first (if available), then TMDB
        // For movies: Use TMDB
        const providers = isTVShow 
          ? ['tvdb', 'tmdb'] 
          : ['tmdb'];
        
        let results: SearchResult[] = [];
        
        // Try providers in order
        for (const provider of providers) {
          if (providerRegistry.hasProvider(provider as any)) {
            try {
              console.log(`[ImageSearch] Searching ${provider}...`);
              results = await providerRegistry.search(provider as any, item.title, mediaType, item.year);
              console.log(`[ImageSearch] ${provider} results:`, results.length);
              
              if (results.length > 0) {
                break; // Stop if we found results
              }
            } catch (error) {
              console.error(`[ImageSearch] ${provider} search failed:`, error);
            }
          } else {
            console.log(`[ImageSearch] ${provider} provider not available (no API key configured)`);
          }
        }
        
        return results;
      } catch (error) {
        console.error('[ImageSearch] Error searching:', error);
        return [];
      }
    },
    enabled: step === 'search',
  });

  // Fetch images from external sources using selected match
  const { data: images, isLoading: isLoadingImages, refetch } = useQuery({
    queryKey: ['image-search-images', selectedMatch?.externalId, Array.from(selectedTypes).sort().join(',')],
    queryFn: async () => {
      if (!selectedMatch) return [];
      
      try {
        console.log('[ImageSearch] Fetching images for match...', selectedMatch);
        
        // Get API keys from settings
        const settingsManager = getSettingsManager();
        const settings = await settingsManager.getSettings();
        
        // Create provider registry
        const config: any = {};
        if (settings.tmdbApiKey) config.tmdb = { apiKey: settings.tmdbApiKey };
        if (settings.fanartApiKey) config.fanart = { apiKey: settings.fanartApiKey };
        if (settings.tvdbApiKey) config.tvdb = { apiKey: settings.tvdbApiKey };
        
        const providerRegistry = createProviderRegistry(client, config);
        
        // Extract ID from externalId (format: "movie-123", "tv-456", "series-789")
        let tmdbId: string | null = null;
        let tvdbId: string | null = null;
        
        if (selectedMatch.provider === 'tmdb') {
          // TMDB format: "movie-123" or "tv-456"
          tmdbId = selectedMatch.externalId.replace(/^(movie|tv)-/, '');
        } else if (selectedMatch.provider === 'tvdb') {
          // TVDB format: "series-123"
          tvdbId = selectedMatch.externalId.replace(/^series-/, '');
          
          // For TV shows from TVDB, also search TMDB to get TMDB ID for additional images
          if (isTVShow && providerRegistry.hasProvider('tmdb')) {
            try {
              console.log('[ImageSearch] Searching TMDB for additional images...');
              const tmdbResults = await providerRegistry.search('tmdb', selectedMatch.title, mediaType, selectedMatch.year);
              if (tmdbResults.length > 0) {
                // Extract TMDB ID from first result
                tmdbId = tmdbResults[0].externalId.replace(/^(movie|tv)-/, '');
                console.log('[ImageSearch] Found TMDB ID:', tmdbId);
              }
            } catch (error) {
              console.warn('[ImageSearch] Could not find TMDB ID:', error);
            }
          }
        }
        
        console.log('[ImageSearch] Using IDs:', { tmdbId, tvdbId, provider: selectedMatch.provider });
        
        // Fetch images from providers
        const allPosters: ImageResult[] = [];
        const allBackgrounds: ImageResult[] = [];
        
        // For TV shows, prioritize TVDB
        if (isTVShow && providerRegistry.hasProvider('tvdb') && tvdbId) {
          try {
            console.log('[ImageSearch] Fetching from TVDB with ID:', tvdbId);
            const tvdbExternalId = tvdbId.startsWith('series-') ? tvdbId : `series-${tvdbId}`;
            const tvdbMetadata = await providerRegistry.getDetails('tvdb', tvdbExternalId);
            
            if (tvdbMetadata.posters) {
              tvdbMetadata.posters.forEach((url: string) => {
                allPosters.push({
                  url,
                  width: 0, // Will be detected on load
                  height: 0, // Will be detected on load
                  type: 'poster',
                  provider: 'TVDB',
                });
              });
            }
            
            if (tvdbMetadata.backdrops) {
              tvdbMetadata.backdrops.forEach((url: string) => {
                allBackgrounds.push({
                  url,
                  width: 0, // Will be detected on load
                  height: 0, // Will be detected on load
                  type: 'background',
                  provider: 'TVDB',
                });
              });
            }
            
            console.log('[ImageSearch] TVDB images:', {
              posters: tvdbMetadata.posters?.length || 0,
              backgrounds: tvdbMetadata.backdrops?.length || 0,
            });
          } catch (error) {
            console.error('[ImageSearch] TVDB fetch failed:', error);
          }
        }
        
        // Fetch from TMDB (for movies, or as fallback for TV shows)
        if (providerRegistry.hasProvider('tmdb') && tmdbId) {
          try {
            console.log('[ImageSearch] Fetching from TMDB with ID:', tmdbId);
            const tmdbExternalId = isMovie ? `movie-${tmdbId}` : `tv-${tmdbId}`;
            const tmdbMetadata = await providerRegistry.getDetails('tmdb', tmdbExternalId);
            
            if (tmdbMetadata.posters) {
              tmdbMetadata.posters.forEach((url: string) => {
                allPosters.push({
                  url,
                  width: 0,
                  height: 0,
                  type: 'poster',
                  provider: 'TMDB',
                });
              });
            }
            
            if (tmdbMetadata.backdrops) {
              tmdbMetadata.backdrops.forEach((url: string) => {
                allBackgrounds.push({
                  url,
                  width: 0,
                  height: 0,
                  type: 'background',
                  provider: 'TMDB',
                });
              });
            }
            
            console.log('[ImageSearch] TMDB images:', {
              posters: tmdbMetadata.posters?.length || 0,
              backgrounds: tmdbMetadata.backdrops?.length || 0,
            });
          } catch (error) {
            console.error('[ImageSearch] TMDB fetch failed:', error);
          }
        }
        
        // Fetch from Fanart.tv (uses TVDB ID for TV shows, TMDB ID for movies)
        if (providerRegistry.hasProvider('fanart')) {
          try {
            const fanartId = isTVShow ? (tvdbId || tmdbId) : tmdbId;
            
            if (fanartId) {
              console.log('[ImageSearch] Fetching from Fanart.tv with ID:', fanartId);
              const fanartMetadata = await providerRegistry.getDetails('fanart', fanartId);
              
              if (fanartMetadata.posters) {
                fanartMetadata.posters.forEach((url: string) => {
                  allPosters.push({
                    url,
                    width: 0,
                    height: 0,
                    type: 'poster',
                    provider: 'Fanart.tv',
                  });
                });
              }
              
              if (fanartMetadata.backdrops) {
                fanartMetadata.backdrops.forEach((url: string) => {
                  allBackgrounds.push({
                    url,
                    width: 0,
                    height: 0,
                    type: 'background',
                    provider: 'Fanart.tv',
                  });
                });
              }
              
              console.log('[ImageSearch] Fanart.tv images:', {
                posters: fanartMetadata.posters?.length || 0,
                backgrounds: fanartMetadata.backdrops?.length || 0,
              });
            }
          } catch (error) {
            console.error('[ImageSearch] Fanart.tv fetch failed:', error);
          }
        }
        
        // Filter by selected types
        const filtered: ImageResult[] = [];
        if (selectedTypes.has('poster')) filtered.push(...allPosters);
        if (selectedTypes.has('background')) filtered.push(...allBackgrounds);
        
        console.log('[ImageSearch] Total images found:', filtered.length);
        
        return filtered;
      } catch (error) {
        console.error('[ImageSearch] Error fetching images:', error);
        return [];
      }
    },
    enabled: step === 'images' && !!selectedMatch,
    staleTime: 0,
  });

  // Separate images by type
  const posters = images?.filter((img: ImageResult) => img.type === 'poster') || [];
  const backgrounds = images?.filter((img: ImageResult) => img.type === 'background') || [];

  // Apply selected images mutation
  const applyImageMutation = useMutation({
    mutationFn: async () => {
      const imagesToApply: ImageResult[] = [];
      if (selectedPoster) imagesToApply.push(selectedPoster);
      if (selectedBackground) imagesToApply.push(selectedBackground);

      if (imagesToApply.length === 0) {
        throw new Error('No images selected');
      }

      // Save to Plex
      if (saveTarget === 'plex' || saveTarget === 'both') {
        for (const image of imagesToApply) {
          if (image.type === 'poster') {
            await client.post(`/library/metadata/${item.ratingKey}/posters`, null, {
              params: { url: image.url },
            });
          } else {
            await client.post(`/library/metadata/${item.ratingKey}/arts`, null, {
              params: { url: image.url },
            });
          }
        }
      }

      // Save locally
      if (saveTarget === 'local' || saveTarget === 'both') {
        if (!window.electron) {
          throw new Error('Local save is only available in desktop app');
        }

        // Get media file path
        const fullMetadata = await client.get(`/library/metadata/${item.ratingKey}`);
        const metadata = fullMetadata.MediaContainer?.Metadata?.[0];
        
        let mediaPath: string | null = null;
        
        // For movies and episodes, get file path
        if (metadata?.Media?.[0]?.Part?.[0]?.file) {
          mediaPath = metadata.Media[0].Part[0].file;
        }
        // For TV shows, get directory path
        else if (metadata?.Location?.[0]?.path) {
          mediaPath = metadata.Location[0].path;
        }

        if (!mediaPath) {
          throw new Error('Could not determine media file path');
        }

        // Download and save each image
        for (const image of imagesToApply) {
          try {
            // Download image
            const response = await fetch(image.url);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            
            // Convert to base64 for Electron IPC
            const base64 = btoa(String.fromCharCode(...buffer));

            // Determine file extension from URL or content type
            let ext = 'jpg';
            const urlExt = image.url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i);
            if (urlExt) {
              ext = urlExt[1].toLowerCase();
              if (ext === 'jpeg') ext = 'jpg';
            }

            // Determine target filename based on image type and media path
            let targetPath: string;
            const isFile = /\.[^.\\\/]+$/.test(mediaPath);
            
            if (isFile) {
              // Extract directory and base filename
              const lastSlash = Math.max(mediaPath.lastIndexOf('/'), mediaPath.lastIndexOf('\\'));
              const directory = mediaPath.substring(0, lastSlash);
              const filename = mediaPath.substring(lastSlash + 1);
              const lastDot = filename.lastIndexOf('.');
              const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename;
              
              if (image.type === 'poster') {
                targetPath = `${directory}\\${nameWithoutExt}-poster.${ext}`;
              } else {
                targetPath = `${directory}\\${nameWithoutExt}-fanart.${ext}`;
              }
            } else {
              // Directory path (for TV shows)
              const showName = mediaPath.split(/[\\\/]/).pop() || 'show';
              if (image.type === 'poster') {
                targetPath = `${mediaPath}\\${showName}-poster.${ext}`;
              } else {
                targetPath = `${mediaPath}\\${showName}-fanart.${ext}`;
              }
            }

            // Write file using Electron (base64 encoded)
            await window.electron.writeFile(targetPath, base64);
            console.log(`[ImageSearch] Saved ${image.type} locally:`, targetPath);
          } catch (error) {
            console.error(`[ImageSearch] Failed to save ${image.type} locally:`, error);
            throw new Error(`Failed to save ${image.type} locally: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    },
    onSuccess: () => {
      onImageSelected();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {step === 'search' ? 'Select Match' : 'Search Images'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {step === 'search' 
                ? `${item.title} • Confirm the correct ${mediaType}`
                : `${selectedMatch?.title} • Sources: ${isTVShow ? 'TVDB, TMDB, Fanart.tv' : 'TMDB, Fanart.tv'}`
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step 1: Search Results */}
        {step === 'search' && (
          <div className="flex-1 overflow-auto p-6">
            {isSearching ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Searching {isTVShow ? 'TVDB and TMDB' : 'TMDB'}...</p>
                </div>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedMatch(result)}
                    className={`flex gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedMatch?.externalId === result.externalId
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-400'
                    }`}
                  >
                    {result.thumb && (
                      <img
                        src={result.thumb}
                        alt={result.title}
                        className="w-20 h-30 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {result.title}
                        {result.year && <span className="text-gray-500 ml-2">({result.year})</span>}
                      </h3>
                      {result.summary && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {result.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                          {result.provider?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {selectedMatch?.externalId === result.externalId && (
                      <div className="flex items-center">
                        <div className="bg-primary-600 text-white rounded-full p-2">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>No matches found for "{item.title}"</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Image Selection */}
        {step === 'images' && (
          <>
            {/* Type Selector */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <button
                  onClick={() => toggleType('poster')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    selectedTypes.has('poster')
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Posters {selectedTypes.has('poster') && `(${posters.length})`}
                </button>
                <button
                  onClick={() => toggleType('background')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    selectedTypes.has('background')
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Backgrounds {selectedTypes.has('background') && `(${backgrounds.length})`}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStep('search');
                    setSelectedPoster(null);
                    setSelectedBackground(null);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  ← Back to Search
                </button>
                <button
                  onClick={() => refetch()}
                  disabled={isLoadingImages}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                  title="Refresh images from sources"
                >
                  <svg className={`w-4 h-4 ${isLoadingImages ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {/* Image Grid */}
            <div className="flex-1 overflow-auto p-6">
              {isLoadingImages ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading images from {isTVShow ? 'TVDB, TMDB, Fanart.tv' : 'TMDB, Fanart.tv'}...</p>
                  </div>
                </div>
              ) : images && images.length > 0 ? (
                <div className="space-y-8">
                  {/* Posters Section */}
                  {selectedTypes.has('poster') && posters.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Posters ({posters.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {posters.map((image: ImageResult, index: number) => (
                          <div
                            key={`poster-${index}`}
                            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                              selectedPoster?.url === image.url
                                ? 'border-primary-600 shadow-lg ring-2 ring-primary-600'
                                : 'border-gray-200 dark:border-gray-700 hover:border-primary-400'
                            }`}
                            onClick={() => setSelectedPoster(image)}
                          >
                            <img
                              src={image.url}
                              alt={`Poster ${index + 1}`}
                              className="w-full h-auto aspect-[2/3] object-cover"
                              loading="lazy"
                              onLoad={(e) => handleImageLoad(image.url, e)}
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-xs p-2">
                              {(() => {
                                const dims = getDimensions(image.url);
                                return dims.width > 0 ? (
                                  <div>{dims.width} × {dims.height}</div>
                                ) : (
                                  <div>Loading...</div>
                                );
                              })()}
                              {image.provider && <div className="font-medium">{image.provider}</div>}
                            </div>
                            {selectedPoster?.url === image.url && (
                              <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full p-1">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Backgrounds Section */}
                  {selectedTypes.has('background') && backgrounds.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Backgrounds ({backgrounds.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {backgrounds.map((image: ImageResult, index: number) => (
                          <div
                            key={`background-${index}`}
                            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                              selectedBackground?.url === image.url
                                ? 'border-primary-600 shadow-lg ring-2 ring-primary-600'
                                : 'border-gray-200 dark:border-gray-700 hover:border-primary-400'
                            }`}
                            onClick={() => setSelectedBackground(image)}
                          >
                            <img
                              src={image.url}
                              alt={`Background ${index + 1}`}
                              className="w-full h-auto aspect-video object-cover"
                              loading="lazy"
                              onLoad={(e) => handleImageLoad(image.url, e)}
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-xs p-2">
                              {(() => {
                                const dims = getDimensions(image.url);
                                return dims.width > 0 ? (
                                  <div>{dims.width} × {dims.height}</div>
                                ) : (
                                  <div>Loading...</div>
                                );
                              })()}
                              {image.provider && <div className="font-medium">{image.provider}</div>}
                            </div>
                            {selectedBackground?.url === image.url && (
                              <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full p-1">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>No images found</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex flex-col gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {/* Selected images info */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {step === 'search' && selectedMatch && (
              <span>Selected: {selectedMatch.title} ({selectedMatch.year})</span>
            )}
            {step === 'images' && (selectedPoster || selectedBackground) && (
              <div className="flex flex-col gap-1">
                {selectedPoster && (
                  <div>
                    Poster: {(() => {
                      const dims = getDimensions(selectedPoster.url);
                      return dims.width > 0 ? `${dims.width} × ${dims.height}` : 'Loading...';
                    })()}
                    {selectedPoster.provider && ` • ${selectedPoster.provider}`}
                  </div>
                )}
                {selectedBackground && (
                  <div>
                    Background: {(() => {
                      const dims = getDimensions(selectedBackground.url);
                      return dims.width > 0 ? `${dims.width} × ${dims.height}` : 'Loading...';
                    })()}
                    {selectedBackground.provider && ` • ${selectedBackground.provider}`}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center justify-between">
            {/* Save target selector (only show in images step) */}
            {step === 'images' && (
              <select
                value={saveTarget}
                onChange={(e) => setSaveTarget(e.target.value as 'plex' | 'local' | 'both')}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="plex">Save to Plex</option>
                <option value="local">Save Locally</option>
                <option value="both">Save to Both</option>
              </select>
            )}
            
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              {step === 'search' ? (
                <button
                  onClick={() => {
                    if (selectedMatch) {
                      setStep('images');
                    }
                  }}
                  disabled={!selectedMatch}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Images →
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (selectedPoster || selectedBackground) {
                      applyImageMutation.mutate();
                    }
                  }}
                  disabled={(!selectedPoster && !selectedBackground) || applyImageMutation.isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {applyImageMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Applying...
                    </>
                  ) : (
                    `Apply Selected ${selectedPoster && selectedBackground ? 'Images' : 'Image'}`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

