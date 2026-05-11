import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { LibraryItem } from '@/managers/LibraryManager';
import { createPlexClient } from '@/api/plexClient';
import { createMetadataManager } from '@/managers/MetadataManager';
import { createLocalMetadataManager } from '@/managers/LocalMetadataManager';
import { createProviderRegistry } from '@/providers/ProviderRegistry';
import type { ExternalMetadata, MediaType, SearchResult as PlexSearchResult } from '@/types';
import type {
  RefreshWorkflowStatus,
  RefreshOptions,
  RefreshProgress,
  EnhancedReviewItem,
  SearchResult as EnhancedSearchResult,
  MatchConfirmation,
  SelectableImage,
  FetchedTrailer,
  SelectableCastMember,
} from '@/types/metadata-refresh';
import { SearchMatchScreen, DetailedReviewScreen } from './metadata-refresh';

interface MetadataRefreshModalProps {
  items: LibraryItem[];
  serverUrl: string;
  token: string;
  onClose: () => void;
  onComplete: () => void;
}

export function MetadataRefreshModal({
  items,
  serverUrl,
  token,
  onClose,
  onComplete,
}: MetadataRefreshModalProps) {
  // Workflow state
  const [workflowStatus, setWorkflowStatus] = useState<RefreshWorkflowStatus>('options');
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(0);
  
  // Options
  const [options, setOptions] = useState<RefreshOptions>({
    refreshMetadata: true,
    refreshImages: true,
    refreshTrailers: true,
    refreshCast: true,
    refreshCrew: true,
    saveLocally: false,
    downloadImages: false,
    downloadTrailers: false,
    preferredTrailerQuality: '1080p',
    maxTrailersPerItem: 1,
  });

  // Progress tracking
  const [progress, setProgress] = useState<RefreshProgress>({
    status: 'options',
    currentStep: 0,
    totalSteps: items.length * 2,
    currentItem: '',
    currentItemIndex: 0,
    totalItems: items.length,
    errors: [],
    warnings: [],
  });

  // Review items with all fetched data
  const [reviewItems, setReviewItems] = useState<EnhancedReviewItem[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState<number>(0);

  // Helper to determine media type
  const getMediaType = (item: LibraryItem): MediaType => {
    if (item.type === 'show' || item.type === 'season' || item.type === 'episode') {
      return 'show';
    } else if (item.type === 'artist' || item.type === 'album' || item.type === 'track') {
      return item.type as MediaType;
    }
    return 'movie';
  };

  // Search Mutation - Get top 5 search results for each item
  const searchMutation = useMutation({
    mutationFn: async () => {
      const client = createPlexClient({ baseURL: serverUrl, token });
      const metadataManager = createMetadataManager(client);
      
      // Initialize provider registry - it will use fallback keys if no env keys provided
      const tmdbApiKey = import.meta.env.VITE_TMDB_API_KEY;
      console.log('[MetadataRefresh] Initializing provider registry:', {
        hasEnvKey: !!tmdbApiKey,
        envKeyLength: tmdbApiKey?.length,
        willUseFallback: !tmdbApiKey,
      });
      
      // Don't pass undefined config - let ProviderRegistry use fallback keys
      const providerRegistry = createProviderRegistry(client, tmdbApiKey ? {
        tmdb: { apiKey: tmdbApiKey },
      } : {});

      console.log('[MetadataRefresh] Available providers:', providerRegistry.getAvailableProviders());
      console.log('[MetadataRefresh] Has TMDB:', providerRegistry.hasProvider('tmdb'));

      setWorkflowStatus('searching');
      setProgress((prev) => ({ ...prev, status: 'searching', currentStep: 0 }));

      const searchResults: EnhancedReviewItem[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        
        try {
          setProgress((prev) => ({
            ...prev,
            currentStep: i + 1,
            currentItem: item.title,
            currentItemIndex: i,
          }));

          const mediaType = getMediaType(item);
          console.log('[MetadataRefresh] Searching for:', {
            title: item.title,
            year: item.year,
            mediaType,
          });

          // Get current metadata for comparison
          const currentMetadata = await metadataManager.getMetadata(item.ratingKey);

          // Search for matches (get top 5 results)
          let results: EnhancedSearchResult[] = [];
          
          if (providerRegistry.hasProvider('tmdb') && (mediaType === 'movie' || mediaType === 'show')) {
            try {
              console.log('[MetadataRefresh] Searching TMDB...');
              const tmdbResults = await providerRegistry.search(
                'tmdb',
                item.title,
                mediaType,
                item.year
              );
              
              console.log('[MetadataRefresh] TMDB results:', tmdbResults.length);
              
              // Convert PlexSearchResult to EnhancedSearchResult format
              results = tmdbResults.slice(0, 5).map((result) => ({
                externalId: result.externalId,
                title: result.title,
                originalTitle: result.originalTitle,
                year: result.year,
                rating: undefined, // Not available in PlexSearchResult
                summary: result.summary,
                poster: result.thumb, // PlexSearchResult uses 'thumb'
                backdrop: undefined, // Not available in PlexSearchResult
                provider: 'tmdb' as const,
                genres: [], // Not available in PlexSearchResult
              }));
              
              console.log('[MetadataRefresh] Converted results:', results.length);
            } catch (error) {
              console.error(`[MetadataRefresh] Failed to search TMDB for ${item.title}:`, error);
              setProgress((prev) => ({
                ...prev,
                warnings: [
                  ...prev.warnings,
                  { item: item.title, warning: `Failed to search TMDB: ${error instanceof Error ? error.message : 'Unknown error'}` },
                ],
              }));
            }
          } else {
            console.warn('[MetadataRefresh] TMDB not available or unsupported media type:', mediaType);
          }

          // Create initial review item with search results
          const reviewItem: EnhancedReviewItem = {
            item,
            searchResults: results,
            selectedResultIndex: 0,
            metadata: {
              title: currentMetadata.title,
              originalTitle: currentMetadata.originalTitle,
              sortTitle: currentMetadata.titleSort,
              year: currentMetadata.year,
              rating: currentMetadata.rating,
              contentRating: currentMetadata.contentRating,
              studio: currentMetadata.studio,
              tagline: currentMetadata.tagline,
              summary: currentMetadata.summary,
              runtime: currentMetadata.duration,
              genres: currentMetadata.genres?.map((g) => g.tag) || [],
              tags: currentMetadata.tags?.map((t: any) => t.tag) || [],
              directors: currentMetadata.directors?.map((d) => d.tag) || [],
              writers: currentMetadata.writers?.map((w) => w.tag) || [],
              producers: currentMetadata.producers?.map((p: any) => p.tag) || [],
            },
            originalMetadata: {
              title: currentMetadata.title,
              originalTitle: currentMetadata.originalTitle,
              sortTitle: currentMetadata.titleSort,
              year: currentMetadata.year,
              rating: currentMetadata.rating,
              contentRating: currentMetadata.contentRating,
              studio: currentMetadata.studio,
              tagline: currentMetadata.tagline,
              summary: currentMetadata.summary,
              runtime: currentMetadata.duration,
              genres: currentMetadata.genres?.map((g) => g.tag) || [],
              tags: currentMetadata.tags?.map((t: any) => t.tag) || [],
              directors: currentMetadata.directors?.map((d) => d.tag) || [],
              writers: currentMetadata.writers?.map((w) => w.tag) || [],
              producers: currentMetadata.producers?.map((p: any) => p.tag) || [],
            },
            images: {
              posters: [],
              backgrounds: [],
              logos: [],
              banners: [],
            },
            trailers: [],
            cast: [],
            crew: [],
            selected: true,
            hasChanges: false,
          };

          searchResults.push(reviewItem);
        } catch (error) {
          console.error(`Failed to search for ${item.title}:`, error);
          setProgress((prev) => ({
            ...prev,
            errors: [
              ...prev.errors,
              {
                item: item.title,
                error: error instanceof Error ? error.message : 'Unknown error',
                step: 'search',
              },
            ],
          }));
        }
      }

      setReviewItems(searchResults);
      setCurrentItemIndex(0);
      setWorkflowStatus('match-review');
      setProgress((prev) => ({ ...prev, status: 'match-review' }));
    },
  });

  // Match confirmation handlers
  const handleMatchConfirm = (confirmation: MatchConfirmation) => {
    // Update the selected result index
    setReviewItems((prev) =>
      prev.map((item, idx) =>
        idx === confirmation.itemIndex
          ? { ...item, selectedResultIndex: confirmation.selectedResultIndex }
          : item
      )
    );

    // Move to next item or start fetching details
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex((prev) => prev + 1);
    } else {
      // All matches confirmed, fetch details
      fetchDetailsMutation.mutate();
    }
  };

  const handleMatchSkip = () => {
    // Mark item as not selected
    setReviewItems((prev) =>
      prev.map((item, idx) =>
        idx === currentItemIndex ? { ...item, selected: false } : item
      )
    );

    // Move to next item or start fetching details
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex((prev) => prev + 1);
    } else {
      fetchDetailsMutation.mutate();
    }
  };

  const handleCustomSearch = async (query: string) => {
    const client = createPlexClient({ baseURL: serverUrl, token });
    const tmdbApiKey = import.meta.env.VITE_TMDB_API_KEY;
    
    // Don't pass undefined config - let ProviderRegistry use fallback keys
    const providerRegistry = createProviderRegistry(client, tmdbApiKey ? {
      tmdb: { apiKey: tmdbApiKey },
    } : {});

    const item = items[currentItemIndex];
    if (!item) return;

    const mediaType = getMediaType(item);

    try {
      console.log('[MetadataRefresh] Custom search:', { query, mediaType });
      const tmdbResults = await providerRegistry.search('tmdb', query, mediaType);
      console.log('[MetadataRefresh] Custom search results:', tmdbResults.length);

      const results: EnhancedSearchResult[] = tmdbResults.slice(0, 5).map((result) => ({
        externalId: result.externalId,
        title: result.title,
        originalTitle: result.originalTitle,
        year: result.year,
        rating: undefined,
        summary: result.summary,
        poster: result.thumb, // PlexSearchResult uses 'thumb'
        backdrop: undefined,
        provider: 'tmdb' as const,
        genres: [],
      }));

      // Update search results for current item
      setReviewItems((prev) =>
        prev.map((reviewItem, idx) =>
          idx === currentItemIndex
            ? { ...reviewItem, searchResults: results, selectedResultIndex: 0 }
            : reviewItem
        )
      );
    } catch (error) {
      console.error('Custom search failed:', error);
    }
  };

  // Fetch Details Mutation - Get full metadata, images, trailers, cast
  const fetchDetailsMutation = useMutation({
    mutationFn: async () => {
      const client = createPlexClient({ baseURL: serverUrl, token });
      const tmdbApiKey = import.meta.env.VITE_TMDB_API_KEY;
      const fanartApiKey = import.meta.env.VITE_FANART_API_KEY;
      
      // Don't pass undefined config - let ProviderRegistry use fallback keys
      const config: any = {};
      if (tmdbApiKey) config.tmdb = { apiKey: tmdbApiKey };
      if (fanartApiKey) config.fanart = { apiKey: fanartApiKey };
      
      const providerRegistry = createProviderRegistry(client, config);
      const youtubeProvider = providerRegistry.getYouTubeProvider();

      setWorkflowStatus('fetching-details');
      setProgress((prev) => ({
        ...prev,
        status: 'fetching-details',
        currentStep: items.length,
      }));

      const updatedItems: EnhancedReviewItem[] = [];

      for (let i = 0; i < reviewItems.length; i++) {
        const reviewItem = reviewItems[i];
        if (!reviewItem || !reviewItem.selected) {
          updatedItems.push(reviewItem);
          continue;
        }

        try {
          setProgress((prev) => ({
            ...prev,
            currentStep: items.length + i + 1,
            currentItem: reviewItem.item.title,
            currentItemIndex: i,
          }));

          const selectedResult = reviewItem.searchResults[reviewItem.selectedResultIndex];
          if (!selectedResult) {
            updatedItems.push(reviewItem);
            continue;
          }

          // Get full metadata from TMDB
          const externalMetadata = await providerRegistry.getDetails(
            'tmdb',
            selectedResult.externalId
          );

          // Update metadata with external data
          const updatedMetadata = {
            ...reviewItem.metadata,
            title: externalMetadata.title || reviewItem.metadata.title,
            originalTitle: externalMetadata.originalTitle || reviewItem.metadata.originalTitle,
            summary: externalMetadata.summary || reviewItem.metadata.summary,
            tagline: externalMetadata.tagline || reviewItem.metadata.tagline,
            rating: externalMetadata.rating || reviewItem.metadata.rating,
            year: externalMetadata.year || reviewItem.metadata.year,
            runtime: externalMetadata.runtime || reviewItem.metadata.runtime,
            genres: externalMetadata.genres || reviewItem.metadata.genres,
          };

          // Fetch images from multiple providers
          const allPosters: string[] = [];
          const allBackgrounds: string[] = [];
          const allLogos: string[] = [];
          const allBanners: string[] = [];

          // Add TMDB images
          if (externalMetadata.posters) allPosters.push(...externalMetadata.posters);
          if (externalMetadata.backdrops) allBackgrounds.push(...externalMetadata.backdrops);

          // Try to fetch from Fanart.tv if available
          if (providerRegistry.hasProvider('fanart')) {
            try {
              // Fanart.tv uses TMDB ID for movies and TVDB ID for TV shows
              // For now, we'll use the TMDB ID and let it fail gracefully for TV shows
              const fanartMetadata = await providerRegistry.getDetails('fanart', selectedResult.externalId);
              
              if (fanartMetadata.posters) allPosters.push(...fanartMetadata.posters);
              if (fanartMetadata.backdrops) allBackgrounds.push(...fanartMetadata.backdrops);
              if (fanartMetadata.logos) allLogos.push(...fanartMetadata.logos);
              if (fanartMetadata.banners) allBanners.push(...fanartMetadata.banners);
              
              console.log('[MetadataRefresh] Fanart.tv images fetched:', {
                posters: fanartMetadata.posters?.length || 0,
                backgrounds: fanartMetadata.backdrops?.length || 0,
                logos: fanartMetadata.logos?.length || 0,
                banners: fanartMetadata.banners?.length || 0,
              });
            } catch (error) {
              console.warn('[MetadataRefresh] Failed to fetch Fanart.tv images:', error);
              // Continue without Fanart.tv images
            }
          }

          // Remove duplicates (same URL from different providers)
          const uniquePosters = Array.from(new Set(allPosters));
          const uniqueBackgrounds = Array.from(new Set(allBackgrounds));
          const uniqueLogos = Array.from(new Set(allLogos));
          const uniqueBanners = Array.from(new Set(allBanners));

          console.log('[MetadataRefresh] Combined images:', {
            posters: uniquePosters.length,
            backgrounds: uniqueBackgrounds.length,
            logos: uniqueLogos.length,
            banners: uniqueBanners.length,
          });

          // Create image objects
          const images: typeof reviewItem.images = {
            posters: uniquePosters.map((url, idx) => ({
              url,
              selected: idx === 0,
              aspectRatio: '2:3',
            })),
            backgrounds: uniqueBackgrounds.map((url, idx) => ({
              url,
              selected: idx === 0,
              aspectRatio: '16:9',
            })),
            logos: uniqueLogos.map((url, idx) => ({
              url,
              selected: idx === 0,
              aspectRatio: '16:9',
            })),
            banners: uniqueBanners.map((url, idx) => ({
              url,
              selected: idx === 0,
              aspectRatio: '16:9',
            })),
          };

          // Fetch trailers from YouTube
          let trailers: FetchedTrailer[] = [];
          if (options.refreshTrailers && youtubeProvider) {
            try {
              const youtubeResults = await youtubeProvider.searchTrailers({
                query: reviewItem.item.title,
                year: reviewItem.item.year,
                maxResults: 10,
                preferredResolution: options.preferredTrailerQuality,
              });

              trailers = youtubeResults.slice(0, 10).map((trailer, idx) => ({
                id: trailer.id,
                title: trailer.title,
                url: trailer.url,
                thumbnail: trailer.thumbnail,
                duration: trailer.duration,
                quality: trailer.availableQualities && trailer.availableQualities.length > 0 
                  ? trailer.availableQualities 
                  : ['2160p', '1080p', '720p', '480p', '360p'], // Fallback qualities
                selectedQuality: trailer.availableQualities && trailer.availableQualities.length > 0
                  ? trailer.availableQualities[0]
                  : '1080p', // Default to 1080p
                channelName: trailer.channelName,
                publishedAt: trailer.publishedAt,
                viewCount: trailer.viewCount,
                isOfficial: trailer.isOfficial,
                isStudioChannel: trailer.isStudioChannel,
                score: trailer.score,
                selected: idx < options.maxTrailersPerItem,
              }));
            } catch (error) {
              console.error('Failed to fetch trailers:', error);
            }
          }

          // Get cast & crew
          const cast: SelectableCastMember[] = (externalMetadata.cast || []).map((member) => ({
            name: member.name,
            character: member.character,
            profilePath: member.profilePath,
            order: member.order,
            selected: true,
          }));

          const crew = (externalMetadata.crew || []).map((member) => ({
            name: member.name,
            job: member.job,
            department: member.department,
            profilePath: member.profilePath,
            selected: true,
          }));

          // Check if there are changes
          const hasChanges =
            JSON.stringify(updatedMetadata) !== JSON.stringify(reviewItem.originalMetadata);

          updatedItems.push({
            ...reviewItem,
            metadata: updatedMetadata,
            images,
            trailers,
            cast,
            crew,
            externalMetadata,
            hasChanges,
          });
        } catch (error) {
          console.error(`Failed to fetch details for ${reviewItem.item.title}:`, error);
          setProgress((prev) => ({
            ...prev,
            errors: [
              ...prev.errors,
              {
                item: reviewItem.item.title,
                error: error instanceof Error ? error.message : 'Unknown error',
                step: 'fetch-details',
              },
            ],
          }));
          updatedItems.push(reviewItem);
        }
      }

      setReviewItems(updatedItems);
      setCurrentReviewIndex(0);
      setWorkflowStatus('detail-review');
      setProgress((prev) => ({ ...prev, status: 'detail-review' }));
    },
  });

  // Apply Mutation - Apply selected changes to Plex
  const applyMutation = useMutation({
    mutationFn: async () => {
      const client = createPlexClient({ baseURL: serverUrl, token });
      const metadataManager = createMetadataManager(client);
      const localManager = createLocalMetadataManager(metadataManager);

      setWorkflowStatus('applying');
      setProgress((prev) => ({
        ...prev,
        status: 'applying',
        currentStep: 0,
      }));

      const selectedItems = reviewItems.filter((r) => r.selected && r.hasChanges);

      for (let i = 0; i < selectedItems.length; i++) {
        const reviewItem = selectedItems[i];
        if (!reviewItem) continue;

        try {
          setProgress((prev) => ({
            ...prev,
            currentStep: i + 1,
            totalSteps: selectedItems.length,
            currentItem: reviewItem.item.title,
            currentItemIndex: i,
          }));

          const { metadata, images, trailers, cast } = reviewItem;

          // Build update parameters
          const updateParams: any = {
            type: reviewItem.item.type === 'show' ? 2 : 1,
          };

          if (options.refreshMetadata) {
            if (metadata.title) updateParams.title = metadata.title;
            if (metadata.originalTitle) updateParams.originalTitle = metadata.originalTitle;
            if (metadata.sortTitle) updateParams.titleSort = metadata.sortTitle;
            if (metadata.summary) updateParams.summary = metadata.summary;
            if (metadata.tagline) updateParams.tagline = metadata.tagline;
            if (metadata.rating !== undefined) updateParams.rating = metadata.rating;
            if (metadata.year) updateParams.year = metadata.year;
            if (metadata.contentRating) updateParams.contentRating = metadata.contentRating;
            if (metadata.studio) updateParams.studio = metadata.studio;

            // Update genres
            if (metadata.genres) {
              metadata.genres.forEach((genre, index) => {
                updateParams[`genre[${index}].tag.tag`] = genre;
              });
            }

            // Update directors
            if (metadata.directors) {
              metadata.directors.forEach((director, index) => {
                updateParams[`director[${index}].tag.tag`] = director;
              });
            }

            // Update writers
            if (metadata.writers) {
              metadata.writers.forEach((writer, index) => {
                updateParams[`writer[${index}].tag.tag`] = writer;
              });
            }
          }

          // Update cast
          if (options.refreshCast && cast) {
            cast
              .filter((member) => member.selected)
              .forEach((member, index) => {
                updateParams[`role[${index}].tag.tag`] = member.name;
                if (member.character) updateParams[`role[${index}].tag.role`] = member.character;
                if (member.profilePath) updateParams[`role[${index}].tag.thumb`] = member.profilePath;
              });
          }

          // Apply updates to Plex
          await client.put(`/library/metadata/${reviewItem.item.ratingKey}`, null, {
            params: updateParams,
          });

          // Upload selected poster
          if (options.refreshImages && images.posters.length > 0) {
            const selectedPoster = images.posters.find((p) => p.selected);
            if (selectedPoster) {
              try {
                await client.post(`/library/metadata/${reviewItem.item.ratingKey}/posters`, null, {
                  params: { url: selectedPoster.url },
                });
              } catch (error) {
                console.error('Failed to update poster:', error);
              }
            }
          }

          // Upload selected background
          if (options.refreshImages && images.backgrounds.length > 0) {
            const selectedBackground = images.backgrounds.find((b) => b.selected);
            if (selectedBackground) {
              try {
                await client.post(`/library/metadata/${reviewItem.item.ratingKey}/arts`, null, {
                  params: { url: selectedBackground.url },
                });
              } catch (error) {
                console.error('Failed to update background:', error);
              }
            }
          }

          // Save locally if requested
          if (options.saveLocally) {
            try {
              // Get media file path
              const mediaPath = await localManager.getMediaFilePath(reviewItem.item.ratingKey);
              
              if (!mediaPath) {
                // For TV shows and seasons, we can't save locally yet
                if (reviewItem.item.type === 'show' || reviewItem.item.type === 'season') {
                  console.warn('[MetadataRefresh] Local saving not yet supported for TV shows/seasons');
                  setProgress((prev) => ({
                    ...prev,
                    warnings: [
                      ...prev.warnings,
                      { 
                        item: reviewItem.item.title, 
                        warning: 'Local metadata saving is not yet supported for TV shows and seasons. Only episodes can be saved locally.' 
                      },
                    ],
                  }));
                } else {
                  throw new Error('Could not determine media file path');
                }
              } else {
                console.log('[MetadataRefresh] Saving locally to:', mediaPath);

              // Download images if requested
              if (options.downloadImages) {
                // Download selected poster
                const selectedPoster = images.posters.find((p) => p.selected);
                if (selectedPoster) {
                  try {
                    const posterPath = localManager.getPosterPath(mediaPath);
                    console.log('[MetadataRefresh] Downloading poster to:', posterPath);
                    await localManager.downloadImage(selectedPoster.url, posterPath);
                    console.log('[MetadataRefresh] ✓ Poster downloaded');
                  } catch (error) {
                    console.error('[MetadataRefresh] Failed to download poster:', error);
                    setProgress((prev) => ({
                      ...prev,
                      warnings: [
                        ...prev.warnings,
                        { item: reviewItem.item.title, warning: `Failed to download poster: ${error instanceof Error ? error.message : 'Unknown error'}` },
                      ],
                    }));
                  }
                }

                // Download selected background
                const selectedBackground = images.backgrounds.find((b) => b.selected);
                if (selectedBackground) {
                  try {
                    const fanartPath = localManager.getFanartPath(mediaPath);
                    console.log('[MetadataRefresh] Downloading background to:', fanartPath);
                    await localManager.downloadImage(selectedBackground.url, fanartPath);
                    console.log('[MetadataRefresh] ✓ Background downloaded');
                  } catch (error) {
                    console.error('[MetadataRefresh] Failed to download background:', error);
                    setProgress((prev) => ({
                      ...prev,
                      warnings: [
                        ...prev.warnings,
                        { item: reviewItem.item.title, warning: `Failed to download background: ${error instanceof Error ? error.message : 'Unknown error'}` },
                      ],
                    }));
                  }
                }
              }

              // Download trailers if requested
              if (options.downloadTrailers) {
                const selectedTrailers = trailers.filter((t) => t.selected);
                console.log('[MetadataRefresh] Downloading', selectedTrailers.length, 'trailers');
                
                for (let trailerIndex = 0; trailerIndex < selectedTrailers.length; trailerIndex++) {
                  const trailer = selectedTrailers[trailerIndex];
                  if (!trailer) continue;
                  
                  try {
                    const quality = trailer.selectedQuality || trailer.quality[0] || '1080p';
                    const trailerPath = localManager.getTrailerPath(mediaPath, reviewItem.item.title, quality, trailerIndex);
                    
                    console.log('[MetadataRefresh] Downloading trailer', trailerIndex + 1, 'of', selectedTrailers.length);
                    console.log('[MetadataRefresh] Quality:', quality, 'Path:', trailerPath);
                    
                    // Update progress message
                    setProgress((prev) => ({
                      ...prev,
                      currentItem: `${reviewItem.item.title} (Downloading trailer ${trailerIndex + 1}/${selectedTrailers.length})`,
                    }));
                    
                    await localManager.downloadTrailer(
                      trailer.url,
                      trailerPath,
                      quality,
                      (percent) => {
                        console.log(`[MetadataRefresh] Trailer ${trailerIndex + 1} progress: ${percent}%`);
                      }
                    );
                    
                    console.log('[MetadataRefresh] ✓ Trailer', trailerIndex + 1, 'downloaded');
                  } catch (error) {
                    console.error(`[MetadataRefresh] Failed to download trailer ${trailerIndex + 1}:`, error);
                    setProgress((prev) => ({
                      ...prev,
                      warnings: [
                        ...prev.warnings,
                        { item: reviewItem.item.title, warning: `Failed to download trailer ${trailerIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}` },
                      ],
                    }));
                  }
                }
              }

              // Save NFO file with metadata
              console.log('[MetadataRefresh] Saving NFO file');
              await localManager.syncToLocal(reviewItem as any, {
                target: 'local',
                localFormat: 'nfo',
                createBackup: true,
                overwriteExisting: true,
              });
              console.log('[MetadataRefresh] ✓ NFO file saved');
            }
            } catch (error) {
              console.error('[MetadataRefresh] Failed to save locally:', error);
              setProgress((prev) => ({
                ...prev,
                errors: [
                  ...prev.errors,
                  {
                    item: reviewItem.item.title,
                    error: `Failed to save locally: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    step: 'save-local',
                  },
                ],
              }));
            }
          }
        } catch (error) {
          console.error(`Failed to apply changes for ${reviewItem.item.title}:`, error);
          setProgress((prev) => ({
            ...prev,
            errors: [
              ...prev.errors,
              {
                item: reviewItem.item.title,
                error: error instanceof Error ? error.message : 'Unknown error',
                step: 'apply',
              },
            ],
          }));
        }
      }

      setWorkflowStatus('completed');
      setProgress((prev) => ({ ...prev, status: 'completed' }));
    },
  });

  // Start the workflow
  const handleStart = () => {
    searchMutation.mutate();
  };

  // Handle item changes in detailed review
  const handleItemChange = (index: number, item: EnhancedReviewItem) => {
    setReviewItems((prev) => prev.map((r, i) => (i === index ? item : r)));
  };

  // Handle navigation in detailed review
  const handleNavigate = (direction: 'prev' | 'next') => {
    setCurrentReviewIndex((prev) => (direction === 'next' ? prev + 1 : prev - 1));
  };

  // Handle close
  const handleClose = () => {
    if (workflowStatus === 'searching' || workflowStatus === 'fetching-details' || workflowStatus === 'applying') {
      if (!confirm('Operation is in progress. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  };

  // Handle completion
  const handleComplete = () => {
    onComplete();
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-secondary-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-50">
            Enhanced Metadata Refresh
          </h2>
          <button
            onClick={handleClose}
            disabled={workflowStatus === 'searching' || workflowStatus === 'fetching-details' || workflowStatus === 'applying'}
            className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Options Screen */}
          {workflowStatus === 'options' && (
            <div className="p-6 space-y-6">
              <div>
                <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-4">
                  Refresh metadata for <strong>{items.length}</strong> selected {items.length === 1 ? 'item' : 'items'} from online sources.
                </p>
              </div>

              {/* Error Display */}
              {searchMutation.isError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-red-800 dark:text-red-200 mb-1">
                        Metadata Refresh Failed
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                        {searchMutation.error instanceof Error ? searchMutation.error.message : 'Unknown error occurred'}
                      </p>
                      {searchMutation.error instanceof Error && searchMutation.error.message.includes('429') && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Rate limit exceeded. The shared API key has reached its limit. Please wait a few seconds and try again, or get your own API key for unlimited requests.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50">
                  What to Change
                </h3>

                {/* Change All / Select Changes Toggle */}
                <div className="bg-secondary-50 dark:bg-secondary-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-secondary-900 dark:text-secondary-50">
                      Change Mode
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOptions({
                          ...options,
                          refreshMetadata: true,
                          refreshImages: true,
                          refreshTrailers: true,
                          refreshCast: true,
                          refreshCrew: true,
                        })}
                        className="px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
                      >
                        Change All
                      </button>
                      <button
                        onClick={() => setOptions({
                          ...options,
                          refreshMetadata: false,
                          refreshImages: false,
                          refreshTrailers: false,
                          refreshCast: false,
                          refreshCrew: false,
                        })}
                        className="px-3 py-1.5 text-xs font-medium bg-secondary-600 hover:bg-secondary-700 text-white rounded transition-colors"
                      >
                        Select Changes
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-secondary-600 dark:text-secondary-400">
                    Choose "Change All" to refresh everything, or "Select Changes" to pick specific items below.
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.refreshMetadata}
                    onChange={(e) => setOptions({ ...options, refreshMetadata: e.target.checked })}
                    className="mt-1 w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-secondary-900 dark:text-secondary-50">
                      Refresh Metadata
                    </div>
                    <div className="text-xs text-secondary-600 dark:text-secondary-400">
                      Update titles, descriptions, ratings, release dates, genres, etc.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.refreshImages}
                    onChange={(e) => setOptions({ ...options, refreshImages: e.target.checked })}
                    className="mt-1 w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-secondary-900 dark:text-secondary-50">
                      Refresh Images
                    </div>
                    <div className="text-xs text-secondary-600 dark:text-secondary-400">
                      Download latest posters and background artwork
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.refreshTrailers}
                    onChange={(e) => setOptions({ ...options, refreshTrailers: e.target.checked })}
                    className="mt-1 w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-secondary-900 dark:text-secondary-50">
                      Refresh Trailers
                    </div>
                    <div className="text-xs text-secondary-600 dark:text-secondary-400">
                      Fetch available trailers from YouTube (no API key required)
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.refreshCast}
                    onChange={(e) => setOptions({ ...options, refreshCast: e.target.checked })}
                    className="mt-1 w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-secondary-900 dark:text-secondary-50">
                      Refresh Cast & Crew
                    </div>
                    <div className="text-xs text-secondary-600 dark:text-secondary-400">
                      Update actor information and download actor photos
                    </div>
                  </div>
                </label>
              </div>

              {/* Save Locally Section - At Bottom */}
              <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6 mt-6">
                <h3 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-4">
                  Save to Local Folder
                </h3>
                
                <div className="bg-secondary-50 dark:bg-secondary-800 rounded-lg p-4 space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.saveLocally}
                      onChange={(e) => setOptions({ 
                        ...options, 
                        saveLocally: e.target.checked,
                        downloadImages: e.target.checked,
                        downloadTrailers: e.target.checked,
                      })}
                      className="mt-1 w-5 h-5 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-1">
                        Save All to Local Folder
                      </div>
                      <div className="text-xs text-secondary-600 dark:text-secondary-400 space-y-1">
                        <p>Save everything to the movie/show folder alongside the media file:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li><strong>NFO file</strong> - Metadata (title, year, summary, genres, cast, etc.)</li>
                          <li><strong>Images</strong> - poster.jpg, fanart.jpg (selected images)</li>
                          <li><strong>Trailers</strong> - trailer.mp4, trailer2.mp4 (selected trailers with chosen quality)</li>
                          <li><strong>Cast photos</strong> - Saved in NFO file references</li>
                        </ul>
                        <p className="mt-2 text-secondary-500 dark:text-secondary-400 italic">
                          Compatible with Plex, Kodi, Emby, and Jellyfin
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Start Button */}
              <div className="flex justify-end pt-4 border-t border-secondary-200 dark:border-secondary-700">
                <button
                  onClick={handleStart}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors font-medium"
                >
                  Start Refresh
                </button>
              </div>
            </div>
          )}

          {/* Progress Screen - Searching */}
          {workflowStatus === 'searching' && (
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full mb-4">
                  <svg className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Searching for Matches
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  {progress.currentItem}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  {progress.currentStep} of {progress.totalItems}
                </p>
              </div>
            </div>
          )}

          {/* Match Review Screen */}
          {workflowStatus === 'match-review' && items[currentItemIndex] && reviewItems[currentItemIndex] && (
            <div className="p-6">
              <SearchMatchScreen
                item={items[currentItemIndex]!}
                itemIndex={currentItemIndex}
                totalItems={items.length}
                searchResults={reviewItems[currentItemIndex]!.searchResults}
                onConfirm={handleMatchConfirm}
                onSkip={handleMatchSkip}
                onSearchAgain={handleCustomSearch}
              />
            </div>
          )}

          {/* Progress Screen - Fetching Details */}
          {workflowStatus === 'fetching-details' && (
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full mb-4">
                  <svg className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Fetching Details
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Getting metadata, images, trailers, and cast information...
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  {progress.currentItem}
                </p>
              </div>
            </div>
          )}

          {/* Detailed Review Screen */}
          {workflowStatus === 'detail-review' && reviewItems.length > 0 && (
            <DetailedReviewScreen
              reviewItems={reviewItems}
              currentIndex={currentReviewIndex}
              serverUrl={serverUrl}
              token={token}
              onItemChange={handleItemChange}
              onNavigate={handleNavigate}
              onApply={() => applyMutation.mutate()}
              onCancel={handleClose}
            />
          )}

          {/* Progress Screen - Applying */}
          {workflowStatus === 'applying' && (
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full mb-4">
                  <svg className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Applying Changes
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  {progress.currentItem}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  {progress.currentStep} of {progress.totalSteps}
                </p>
              </div>
            </div>
          )}

          {/* Completion Screen */}
          {workflowStatus === 'completed' && (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Refresh Complete!
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Successfully updated {reviewItems.filter((r) => r.selected && r.hasChanges).length} items
                </p>
              </div>

              {/* Errors */}
              {progress.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                    Errors ({progress.errors.length})
                  </h4>
                  <ul className="space-y-1 text-xs text-red-700 dark:text-red-300">
                    {progress.errors.map((error, idx) => (
                      <li key={idx}>
                        <strong>{error.item}:</strong> {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {progress.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    Warnings ({progress.warnings.length})
                  </h4>
                  <ul className="space-y-1 text-xs text-yellow-700 dark:text-yellow-300">
                    {progress.warnings.map((warning, idx) => (
                      <li key={idx}>
                        <strong>{warning.item}:</strong> {warning.warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Done Button */}
              <div className="flex justify-end pt-4 border-t border-secondary-200 dark:border-secondary-700">
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
