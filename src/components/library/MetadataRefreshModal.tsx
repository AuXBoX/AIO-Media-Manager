import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { LibraryItem } from '@/managers/LibraryManager';
import { createPlexClient } from '@/api/plexClient';
import { createMetadataManager } from '@/managers/MetadataManager';
import { createLocalMetadataManager } from '@/managers/LocalMetadataManager';
import { createProviderRegistry } from '@/providers/ProviderRegistry';
import { PlexOnlineProvider } from '@/providers/PlexOnlineProvider';
import type { ExternalMetadata, MediaType, SearchResult as PlexSearchResult, ExternalProvider } from '@/types';
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
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getSettingsManager } from '@/managers/SettingsManager';

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
  // Check if items are music type
  const isMusicLibrary = items.some(i => i.type === 'artist' || i.type === 'album' || i.type === 'track');
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
    matchMode: 'confirm',
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
      
      // Initialize provider registry - uses settings + env + fallback keys
      const settingsManager = getSettingsManager();
      const settings = await settingsManager.getSettings();
      
      const tmdbApiKey = import.meta.env['VITE_TMDB_API_KEY'];
      const lastfmApiKey = settings.lastfmApiKey || import.meta.env['VITE_LASTFM_API_KEY'];
      console.log('[MetadataRefresh] Initializing provider registry:', {
        hasEnvKey: !!tmdbApiKey,
        envKeyLength: tmdbApiKey?.length,
        willUseFallback: !tmdbApiKey,
        hasLastFm: !!lastfmApiKey,
      });
      
      // Don't pass undefined config - let ProviderRegistry use fallback keys
      const config: any = {};
      if (tmdbApiKey) config.tmdb = { apiKey: tmdbApiKey };
      if (lastfmApiKey) config.lastfm = { apiKey: lastfmApiKey };
      
      const providerRegistry = createProviderRegistry(client, config);

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
          
          // Determine providers based on media type
          const isTVContent = mediaType === 'show' || item.type === 'season' || item.type === 'episode';
          const isMusicContent = mediaType === 'artist' || mediaType === 'album' || mediaType === 'track';
          const isCollectionItem = item.type === 'collection';
          
          if (isCollectionItem) {
            // For collections: Use TMDB collection search
            console.log('[MetadataRefresh] Searching for collection:', item.title);
            try {
              const collectionResults = await providerRegistry.searchCollection(item.title);
              console.log('[MetadataRefresh] Collection search results:', collectionResults.length);
              
              results = collectionResults.slice(0, 5).map((result) => ({
                externalId: result.externalId,
                title: result.title,
                originalTitle: result.originalTitle,
                year: result.year,
                rating: undefined,
                summary: result.summary,
                poster: result.thumb,
                backdrop: undefined,
                provider: 'tmdb',
                genres: [],
              }));
            } catch (error) {
              console.error(`[MetadataRefresh] Failed to search collection for ${item.title}:`, error);
              setProgress((prev) => ({
                ...prev,
                warnings: [
                  ...prev.warnings,
                  { item: item.title, warning: `Failed to search collection: ${error instanceof Error ? error.message : 'Unknown error'}` },
                ],
              }));
            }
          } else if (isMusicContent) {
            // For music: Search ALL available providers and combine results
            const musicProviders: ExternalProvider[] = ['lastfm', 'musicbrainz', 'itunes', 'albumartexchange', 'plex'];
            
            for (const provider of musicProviders) {
              if (!providerRegistry.hasProvider(provider)) continue;
              try {
                console.log(`[MetadataRefresh] Searching ${provider.toUpperCase()}...`);
                const searchQuery = item.type === 'album' && item.parentTitle
                  ? `${item.parentTitle} ${item.title}`.trim()
                  : item.title;
                const providerResults = await providerRegistry.search(
                  provider as any,
                  searchQuery,
                  mediaType,
                  item.year
                );
                console.log(`[MetadataRefresh] ${provider.toUpperCase()} results:`, providerResults.length);
                
                // Add results with provider tag, avoiding duplicates by title+year
                for (const result of providerResults.slice(0, 3)) {
                  const isDuplicate = results.some(
                    r => r.title.toLowerCase() === result.title.toLowerCase() && r.year === result.year
                  );
                  if (!isDuplicate) {
                    results.push({
                      externalId: result.externalId,
                      title: result.title,
                      originalTitle: result.originalTitle,
                      year: result.year,
                      rating: undefined,
                      summary: result.summary,
                      poster: result.thumb,
                      backdrop: undefined,
                      provider: provider,
                      genres: [],
                    });
                  }
                }
              } catch (error) {
                console.warn(`[MetadataRefresh] Failed to search ${provider.toUpperCase()}:`, error);
              }
            }
            
            console.log('[MetadataRefresh] Combined music results:', results.length);
          } else {
            // For movies and TV: Use provider array with fallback chain
            const searchProviders: ExternalProvider[] = isTVContent
              ? ['tvdb', 'tmdb', 'plex']
              : ['tmdb', 'plex'];
          
            console.log('[MetadataRefresh] Search params:', {
              originalTitle: item.title,
              searchTitle: item.title,
              itemType: item.type,
              searchProviders,
            });
            
            // Try each provider in order until we get results
            for (const provider of searchProviders) {
              if (results.length > 0) break;
              if (!providerRegistry.hasProvider(provider)) {
                console.log(`[MetadataRefresh] Provider ${provider.toUpperCase()} not available, skipping`);
                continue;
              }
              try {
                console.log(`[MetadataRefresh] Searching ${provider.toUpperCase()}...`);
                const providerResults = await providerRegistry.search(
                  provider as any,
                  item.title,
                  mediaType,
                  item.year
                );
                
                console.log(`[MetadataRefresh] ${provider.toUpperCase()} results:`, providerResults.length);
                
                results = providerResults.slice(0, 5).map((result) => ({
                  externalId: result.externalId,
                  title: result.title,
                  originalTitle: result.originalTitle,
                  year: result.year,
                  rating: undefined,
                  summary: result.summary,
                  poster: result.thumb,
                  backdrop: undefined,
                  provider: provider,
                  genres: [],
                }));
                
                console.log('[MetadataRefresh] Converted results:', results.length);
              } catch (error) {
                console.error(`[MetadataRefresh] Failed to search ${provider.toUpperCase()} for ${item.title}:`, error);
                setProgress((prev) => ({
                  ...prev,
                  warnings: [
                    ...prev.warnings,
                    { item: item.title, warning: `Failed to search ${provider.toUpperCase()}: ${error instanceof Error ? error.message : 'Unknown error'}` },
                  ],
                }));
              }
            }
          }
          
          if (results.length === 0) {
            console.warn('[MetadataRefresh] No results found from any provider for:', item.title);
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

      if (options.matchMode === 'auto') {
        // Auto mode: skip match-review, use first (best) result for all items
        console.log('[MetadataRefresh] Auto-match mode: using best match for all items');
        fetchDetailsMutation.mutate(searchResults);
      } else {
        // Confirm mode: let user review each match
        setWorkflowStatus('match-review');
        setProgress((prev) => ({ ...prev, status: 'match-review' }));
      }
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
      fetchDetailsMutation.mutate(undefined);
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
      fetchDetailsMutation.mutate(undefined);
    }
  };

  const handleCustomSearch = async (query: string) => {
    const client = createPlexClient({ baseURL: serverUrl, token });
    const tmdbApiKey = import.meta.env['VITE_TMDB_API_KEY'];
    
    // Don't pass undefined config - let ProviderRegistry use fallback keys
    const providerRegistry = createProviderRegistry(client, tmdbApiKey ? {
      tmdb: { apiKey: tmdbApiKey },
    } : {});

    const item = items[currentItemIndex];
    if (!item) return;

    const mediaType = getMediaType(item);

    try {
      console.log('[MetadataRefresh] Custom search:', { query, mediaType, isCollection: item.type === 'collection' });
      let searchResults;
      if (item.type === 'collection') {
        searchResults = await providerRegistry.searchCollection(query);
      } else {
        searchResults = await providerRegistry.search('tmdb', query, mediaType);
      }
      console.log('[MetadataRefresh] Custom search results:', searchResults.length);

      const results: EnhancedSearchResult[] = searchResults.slice(0, 5).map((result) => ({
        externalId: result.externalId,
        title: result.title,
        originalTitle: result.originalTitle,
        year: result.year,
        rating: undefined,
        summary: result.summary,
        poster: result.thumb,
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
    mutationFn: async (itemsOverride?: EnhancedReviewItem[]) => {
      const client = createPlexClient({ baseURL: serverUrl, token });
      const tmdbApiKey = import.meta.env['VITE_TMDB_API_KEY'];
      const fanartApiKey = import.meta.env['VITE_FANART_API_KEY'];
      
      // Don't pass undefined config - let ProviderRegistry use fallback keys
      const config: any = {};
      if (tmdbApiKey) config.tmdb = { apiKey: tmdbApiKey };
      if (fanartApiKey) config.fanart = { apiKey: fanartApiKey };
      
      const providerRegistry = createProviderRegistry(client, config);
      const youtubeProvider = providerRegistry.getYouTubeProvider();

      const currentReviewItems = itemsOverride || reviewItems;

      setWorkflowStatus('fetching-details');
      setProgress((prev) => ({
        ...prev,
        status: 'fetching-details',
        currentStep: items.length,
      }));

      const updatedItems: EnhancedReviewItem[] = [];

      for (let i = 0; i < currentReviewItems.length; i++) {
        const reviewItem = currentReviewItems[i];
        if (!reviewItem || !reviewItem.selected) {
          if (reviewItem) updatedItems.push(reviewItem);
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

          // Get full metadata from the provider that was used for search
          let externalId = selectedResult.externalId;
          
          // For seasons and episodes, append the season/episode number to the external ID
          if (reviewItem.item.type === 'season' && reviewItem.item.index !== undefined) {
            // Append season number: series-123 -> series-123-season-2
            if (selectedResult.provider === 'tvdb') {
              externalId = `${externalId}-season-${reviewItem.item.index}`;
            } else if (selectedResult.provider === 'tmdb') {
              externalId = `${externalId}-season-${reviewItem.item.index}`;
            }
            console.log('[MetadataRefresh] Fetching season-specific details:', externalId);
          } else if (reviewItem.item.type === 'episode' && reviewItem.item.index !== undefined && reviewItem.item.parentIndex !== undefined) {
            // Append season and episode numbers: series-123 -> series-123-season-2-episode-5
            if (selectedResult.provider === 'tvdb') {
              externalId = `${externalId}-season-${reviewItem.item.parentIndex}-episode-${reviewItem.item.index}`;
            } else if (selectedResult.provider === 'tmdb') {
              externalId = `${externalId}-season-${reviewItem.item.parentIndex}-episode-${reviewItem.item.index}`;
            }
            console.log('[MetadataRefresh] Fetching episode-specific details:', externalId);
          }
          
          const externalMetadata = await providerRegistry.getDetails(
            selectedResult.provider,
            externalId
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

          // Add primary provider images (TVDB or TMDB)
          if (externalMetadata.posters) allPosters.push(...externalMetadata.posters);
          if (externalMetadata.backdrops) allBackgrounds.push(...externalMetadata.backdrops);

          // Try to fetch from Fanart.tv if available (skip for collections)
          const isCollectionItem = reviewItem.item.type === 'collection';
          if (!isCollectionItem && providerRegistry.hasProvider('fanart')) {
            try {
              // Extract ID for Fanart.tv
              let fanartId = selectedResult.externalId;
              
              // Fanart.tv uses different ID formats:
              // - For TV shows: TVDB ID (numeric)
              // - For movies: TMDB ID (numeric)
              if (selectedResult.provider === 'tvdb') {
                // TVDB format: "series-123" -> extract "123"
                fanartId = selectedResult.externalId.replace('series-', '');
              } else if (selectedResult.provider === 'tmdb') {
                // TMDB format: "movie-123" or "tv-456" -> extract "123" or "456"
                fanartId = selectedResult.externalId.replace(/^(movie|tv)-/, '');
              }
              
              console.log('[MetadataRefresh] Fetching Fanart.tv with ID:', fanartId);
              const fanartMetadata = await providerRegistry.getDetails('fanart', fanartId);
              
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

          // Try to fetch from Plex Discover if available (skip for collections)
          if (!isCollectionItem && providerRegistry.hasProvider('plex')) {
            try {
              const plexProvider = providerRegistry.getProvider('plex') as PlexOnlineProvider | undefined;
              if (plexProvider) {
                let plexId: string | null = null;

                if (selectedResult.provider === 'plex') {
                  // Already a Plex result, use its ID directly
                  plexId = selectedResult.externalId.replace('plex-', '');
                } else {
                  // Search Plex for the item to get its ID
                  const plexResults = await providerRegistry.search('plex', reviewItem.item.title, getMediaType(reviewItem.item), reviewItem.item.year);
                  if (plexResults.length > 0 && plexResults[0]) {
                    plexId = plexResults[0].externalId.replace('plex-', '');
                  }
                }

                if (plexId) {
                  console.log('[MetadataRefresh] Fetching Plex images for ID:', plexId);
                  const plexImages = await plexProvider.getImages(plexId);
                  allPosters.push(...plexImages.posters);
                  allBackgrounds.push(...plexImages.backdrops);
                  console.log('[MetadataRefresh] Plex images fetched:', {
                    posters: plexImages.posters.length,
                    backgrounds: plexImages.backdrops.length,
                  });
                }
              }
            } catch (error) {
              console.warn('[MetadataRefresh] Failed to fetch Plex images:', error);
            }
          }

          // For music items, fetch images from Last.fm and AlbumArtExchange
          const isMusicItem = reviewItem.item.type === 'artist' || reviewItem.item.type === 'album' || reviewItem.item.type === 'track';
          if (isMusicItem) {
            // Determine media type for music searches
            const musicMediaType: MediaType = reviewItem.item.type === 'artist' ? 'artist' 
              : reviewItem.item.type === 'album' ? 'album' 
              : 'track';
            
            // Fetch from Last.fm if available (and not already used as primary provider)
            if (providerRegistry.hasProvider('lastfm') && (selectedResult.provider as string) !== 'lastfm') {
              try {
                console.log('[MetadataRefresh] Fetching Last.fm images for:', reviewItem.item.title);
                const lastfmSearchQuery = reviewItem.item.type === 'album' 
                  ? `${reviewItem.item.parentTitle || ''} ${reviewItem.item.title}`.trim()
                  : reviewItem.item.title;
                const lastfmResults = await providerRegistry.search('lastfm', lastfmSearchQuery, musicMediaType);
                if (lastfmResults.length > 0 && lastfmResults[0]) {
                  const lastfmMeta = await providerRegistry.getDetails('lastfm' as any, lastfmResults[0].externalId);
                  if (lastfmMeta.posters) allPosters.push(...lastfmMeta.posters);
                  console.log('[MetadataRefresh] Last.fm images fetched:', lastfmMeta.posters?.length || 0);
                }
              } catch (error) {
                console.warn('[MetadataRefresh] Failed to fetch Last.fm images:', error);
              }
            }

            // Fetch from AlbumArtExchange for album artwork
            if (providerRegistry.hasProvider('albumartexchange')) {
              try {
                console.log('[MetadataRefresh] Fetching AlbumArtExchange for:', reviewItem.item.title);
                const aaeQuery = reviewItem.item.type === 'album'
                  ? `${reviewItem.item.parentTitle || ''} ${reviewItem.item.title}`.trim()
                  : reviewItem.item.title;
                const aaeResults = await providerRegistry.search('albumartexchange' as any, aaeQuery, musicMediaType);
                if (aaeResults.length > 0 && aaeResults[0]) {
                  const aaeMeta = await providerRegistry.getDetails('albumartexchange' as any, aaeResults[0].externalId);
                  if (aaeMeta.posters) allPosters.push(...aaeMeta.posters);
                  console.log('[MetadataRefresh] AlbumArtExchange images fetched:', aaeMeta.posters?.length || 0);
                }
              } catch (error) {
                console.warn('[MetadataRefresh] Failed to fetch AlbumArtExchange images:', error);
              }
            }

            // Fetch from iTunes for high-quality album artwork
            if (providerRegistry.hasProvider('itunes') && (selectedResult.provider as string) !== 'itunes') {
              try {
                console.log('[MetadataRefresh] Fetching iTunes artwork for:', reviewItem.item.title);
                const itunesQuery = reviewItem.item.type === 'album'
                  ? `${reviewItem.item.parentTitle || ''} ${reviewItem.item.title}`.trim()
                  : reviewItem.item.title;
                const itunesResults = await providerRegistry.search('itunes', itunesQuery, musicMediaType);
                if (itunesResults.length > 0 && itunesResults[0]) {
                  const itunesMeta = await providerRegistry.getDetails('itunes', itunesResults[0].externalId);
                  if (itunesMeta.posters) allPosters.push(...itunesMeta.posters);
                  console.log('[MetadataRefresh] iTunes artwork fetched:', itunesMeta.posters?.length || 0);
                }
              } catch (error) {
                console.warn('[MetadataRefresh] Failed to fetch iTunes artwork:', error);
              }
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
          const isCollectionItem = reviewItem.item.type === 'collection';

          // Build update parameters (Plex type: 1=movie, 2=show, 18=collection)
          const updateParams: any = {
            type: isCollectionItem ? 18 : reviewItem.item.type === 'show' ? 2 : 1,
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
  
  const isProcessing = workflowStatus === 'searching' || workflowStatus === 'fetching-details' || workflowStatus === 'applying';

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title="Metadata Refresh"
      subtitle={`Refresh metadata for ${items.length} selected ${items.length === 1 ? 'item' : 'items'}`}
      maxWidth="4xl"
      showCloseButton={!isProcessing}
      closeOnBackdropClick={!isProcessing}
      className="max-h-[90vh]"
    >
      <div className="space-y-6">
          {/* Options Screen */}
          {workflowStatus === 'options' && (
            <div className="space-y-6">
              {/* Error Display */}
              {searchMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-red-800 mb-1">
                        Metadata Refresh Failed
                      </p>
                      <p className="text-sm text-red-700 mb-2">
                        {searchMutation.error instanceof Error ? searchMutation.error.message : 'Unknown error occurred'}
                      </p>
                      {searchMutation.error instanceof Error && searchMutation.error.message.includes('429') && (
                        <p className="text-xs text-red-600">
                          Rate limit exceeded. The shared API key has reached its limit. Please wait a few seconds and try again, or get your own API key for unlimited requests.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-text-primary mb-4">
                    What to Change
                  </h3>

                  {/* Change All / Select Changes Toggle */}
                  <div className="bg-primary-50 rounded-xl p-4 space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary">
                        Change Mode
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="small"
                          variant="primary"
                          onClick={() => setOptions({
                            ...options,
                            refreshMetadata: true,
                            refreshImages: true,
                            refreshTrailers: true,
                            refreshCast: true,
                            refreshCrew: true,
                          })}
                        >
                          Change All
                        </Button>
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() => setOptions({
                            ...options,
                            refreshMetadata: false,
                            refreshImages: false,
                            refreshTrailers: false,
                            refreshCast: false,
                            refreshCrew: false,
                          })}
                        >
                          Select Changes
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-text-tertiary">
                      Choose "Change All" to refresh everything, or "Select Changes" to pick specific items below.
                    </p>
                  </div>
                </div>

                {/* Match Mode */}
                {items.length > 1 && (
                  <div>
                    <h3 className="text-base font-semibold text-text-primary mb-4">
                      Match Mode
                    </h3>
                    <div className="bg-primary-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary">
                          How to Match
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="small"
                            variant={options.matchMode === 'auto' ? 'primary' : 'secondary'}
                            onClick={() => setOptions({ ...options, matchMode: 'auto' })}
                          >
                            Auto-Pick Best
                          </Button>
                          <Button
                            size="small"
                            variant={options.matchMode === 'confirm' ? 'primary' : 'secondary'}
                            onClick={() => setOptions({ ...options, matchMode: 'confirm' })}
                          >
                            Confirm Each
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-text-tertiary">
                        {options.matchMode === 'auto'
                          ? 'Automatically uses the top search result for each item. Fastest option.'
                          : 'Review and confirm the best match for each item before applying changes.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Checkbox Options */}
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={options.refreshMetadata}
                      onChange={(e) => setOptions({ ...options, refreshMetadata: e.target.checked })}
                      className="mt-1 w-4 h-4 accent-primary-500 border-slate-300 rounded focus:ring-primary-500 focus:ring-offset-0 transition-colors"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary group-hover:text-primary-600 transition-colors">
                        Refresh Metadata
                      </div>
                      <div className="text-xs text-text-tertiary mt-0.5">
                        Update titles, descriptions, ratings, release dates, genres, etc.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={options.refreshImages}
                      onChange={(e) => setOptions({ ...options, refreshImages: e.target.checked })}
                      className="mt-1 w-4 h-4 accent-primary-500 border-slate-300 rounded focus:ring-primary-500 focus:ring-offset-0 transition-colors"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary group-hover:text-primary-600 transition-colors">
                        Refresh Images
                      </div>
                      <div className="text-xs text-text-tertiary mt-0.5">
                        Download latest posters and background artwork
                      </div>
                    </div>
                  </label>

                  {/* Hide trailers and cast for music items */}
                  {!items.every(item => item.type === 'artist' || item.type === 'album' || item.type === 'track') && (
                    <>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={options.refreshTrailers}
                          onChange={(e) => setOptions({ ...options, refreshTrailers: e.target.checked })}
                          className="mt-1 w-4 h-4 accent-primary-500 border-slate-300 rounded focus:ring-primary-500 focus:ring-offset-0 transition-colors"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary group-hover:text-primary-600 transition-colors">
                            Refresh Trailers
                          </div>
                          <div className="text-xs text-text-tertiary mt-0.5">
                            Fetch available trailers from YouTube (no API key required)
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={options.refreshCast}
                          onChange={(e) => setOptions({ ...options, refreshCast: e.target.checked })}
                          className="mt-1 w-4 h-4 accent-primary-500 border-slate-300 rounded focus:ring-primary-500 focus:ring-offset-0 transition-colors"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary group-hover:text-primary-600 transition-colors">
                            Refresh Cast & Crew
                          </div>
                          <div className="text-xs text-text-tertiary mt-0.5">
                            Update actor information and download actor photos
                          </div>
                        </div>
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Save Locally Section */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-base font-semibold text-text-primary mb-4">
                  Save to Local Folder
                </h3>
                
                <div className="bg-slate-50 rounded-xl p-5 space-y-4 border border-slate-200">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={options.saveLocally}
                      onChange={(e) => setOptions({ 
                        ...options, 
                        saveLocally: e.target.checked,
                        downloadImages: e.target.checked,
                        downloadTrailers: e.target.checked,
                      })}
                      className="mt-1 w-5 h-5 accent-primary-500 border-slate-300 rounded focus:ring-primary-500 focus:ring-offset-0 transition-colors"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-text-primary mb-2 group-hover:text-primary-600 transition-colors">
                        Save All to Local Folder
                      </div>
                      <div className="text-xs text-text-tertiary space-y-2">
                        <p>Save everything to the movie/show folder alongside the media file:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li><strong className="font-medium text-text-secondary">NFO file</strong> - Metadata (title, year, summary, genres, cast, etc.)</li>
                          <li><strong className="font-medium text-text-secondary">Images</strong> - poster.jpg, fanart.jpg (selected images)</li>
                          <li><strong className="font-medium text-text-secondary">Trailers</strong> - trailer.mp4, trailer2.mp4 (selected trailers with chosen quality)</li>
                          <li><strong className="font-medium text-text-secondary">Cast photos</strong> - Saved in NFO file references</li>
                        </ul>
                        <p className="mt-3 text-text-tertiary italic pt-2 border-t border-slate-200">
                          Compatible with Plex, Kodi, Emby, and Jellyfin
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Start Button */}
              <div className="flex justify-end pt-6 border-t border-slate-200">
                <Button
                  variant="primary"
                  size="medium"
                  onClick={handleStart}
                >
                  Start Refresh
                </Button>
              </div>
            </div>
          )}

          {/* Progress Screen - Searching */}
          {workflowStatus === 'searching' && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-50 rounded-full mb-6">
                  <svg className="w-10 h-10 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">
                  Searching for Matches
                </h3>
                <p className="text-sm text-text-secondary mb-2">
                  {progress.currentItem}
                </p>
                <p className="text-xs text-text-tertiary">
                  {progress.currentStep} of {progress.totalItems}
                </p>
              </div>
            </div>
          )}

          {/* Match Review Screen */}
          {workflowStatus === 'match-review' && items[currentItemIndex] && reviewItems[currentItemIndex] && (
            <div>
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
            <div className="space-y-6 py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-50 rounded-full mb-6">
                  <svg className="w-10 h-10 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">
                  Fetching Details
                </h3>
                <p className="text-sm text-text-secondary mb-2">
                  {isMusicLibrary
                    ? 'Getting metadata and images...'
                    : 'Getting metadata, images, trailers, and cast information...'}
                </p>
                <p className="text-xs text-text-tertiary">
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
            <div className="space-y-6 py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-50 rounded-full mb-6">
                  <svg className="w-10 h-10 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">
                  Applying Changes
                </h3>
                <p className="text-sm text-text-secondary mb-2">
                  {progress.currentItem}
                </p>
                <p className="text-xs text-text-tertiary">
                  {progress.currentStep} of {progress.totalSteps}
                </p>
              </div>
            </div>
          )}

          {/* Completion Screen */}
          {workflowStatus === 'completed' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-full mb-6">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">
                  Refresh Complete!
                </h3>
                <p className="text-sm text-text-secondary">
                  Successfully updated {reviewItems.filter((r) => r.selected && r.hasChanges).length} items
                </p>
              </div>

              {/* Errors */}
              {progress.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-red-800 mb-3">
                    Errors ({progress.errors.length})
                  </h4>
                  <ul className="space-y-2 text-xs text-red-700">
                    {progress.errors.map((error, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-medium">{error.item}:</span>
                        <span>{error.error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {progress.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-3">
                    Warnings ({progress.warnings.length})
                  </h4>
                  <ul className="space-y-2 text-xs text-yellow-700">
                    {progress.warnings.map((warning, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-medium">{warning.item}:</span>
                        <span>{warning.warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Done Button */}
              <div className="flex justify-end pt-6 border-t border-slate-200">
                <Button
                  variant="primary"
                  size="medium"
                  onClick={handleComplete}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
  );
}
