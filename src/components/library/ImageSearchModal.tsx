import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { LibraryItem } from '@/managers/LibraryManager';
import { createPlexClient } from '@/api/plexClient';
import { createMetadataManager } from '@/managers/MetadataManager';
import { createProviderRegistry } from '@/providers/ProviderRegistry';
import { TMDBProvider } from '@/providers/TMDBProvider';
import { PlexOnlineProvider } from '@/providers/PlexOnlineProvider';
import { getSettingsManager } from '@/managers/SettingsManager';
import type { SearchResult } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ImageSearchModalProps {
  item: LibraryItem;
  serverUrl: string;
  token: string;
  onClose: () => void;
  onImageSelected: () => void;
  isCollectionSearch?: boolean;
}

interface ImageResult {
  url: string;
  width: number;
  height: number;
  type: 'poster' | 'background';
  provider?: string;
}

type Step = 'search' | 'images';

export function ImageSearchModal({
  item,
  serverUrl,
  token,
  onClose,
  onImageSelected,
  isCollectionSearch = false,
}: ImageSearchModalProps) {
  const [step, setStep] = useState<Step>('search');
  const [selectedMatch, setSelectedMatch] = useState<SearchResult | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['poster', 'background']));
  const [selectedPoster, setSelectedPoster] = useState<ImageResult | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<ImageResult | null>(null);
  const [saveTarget, setSaveTarget] = useState<'plex' | 'local' | 'both'>('plex');
  const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());

  const client = createPlexClient({ baseURL: serverUrl, token });
  
  const isMovie = item.type === 'movie';
  const isTVShow = item.type === 'show' || item.type === 'season' || item.type === 'episode';
  const isMusic = item.type === 'artist' || item.type === 'album' || item.type === 'track';
  const mediaType: 'movie' | 'show' | 'artist' | 'album' | 'track' = isMovie 
    ? 'movie' 
    : isMusic 
    ? (item.type as 'artist' | 'album' | 'track')
    : 'show';

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
        // For seasons and episodes, use the parent/grandparent title (show name)
        let searchTitle = item.title;
        let searchYear = item.year;
        
        if (item.type === 'season' && item.parentTitle) {
          searchTitle = item.parentTitle;
          // Try to get year from parent if not available
          if (!searchYear && item.parentRatingKey) {
            try {
              const parentMetadata = await client.get(`/library/metadata/${item.parentRatingKey}`);
              searchYear = parentMetadata.MediaContainer?.Metadata?.[0]?.year;
            } catch (error) {
              console.warn('[ImageSearch] Could not fetch parent year:', error);
            }
          }
        } else if (item.type === 'episode' && item.grandparentTitle) {
          searchTitle = item.grandparentTitle;
          // Try to get year from grandparent if not available
          if (!searchYear && item.grandparentRatingKey) {
            try {
              const grandparentMetadata = await client.get(`/library/metadata/${item.grandparentRatingKey}`);
              searchYear = grandparentMetadata.MediaContainer?.Metadata?.[0]?.year;
            } catch (error) {
              console.warn('[ImageSearch] Could not fetch grandparent year:', error);
            }
          }
        } else if (item.type === 'album' && item.parentTitle) {
          // For albums: use "Artist - Album" format for better search results
          searchTitle = `${item.parentTitle} - ${item.title}`;
        } else if (item.type === 'track' && item.grandparentTitle) {
          // For tracks: use artist name for searching
          searchTitle = item.grandparentTitle;
        }
        
        console.log('[ImageSearch] Searching for matches...', { 
          type: item.type, 
          originalTitle: item.title,
          searchTitle,
          year: searchYear,
        });
        
        // Get API keys from settings
        const settingsManager = getSettingsManager();
        const settings = await settingsManager.getSettings();
        
        // Create provider registry (will use fallback keys if user keys not set)
        const config: any = {};
        if (settings.tmdbApiKey) config.tmdb = { apiKey: settings.tmdbApiKey };
        if (settings.fanartApiKey) config.fanart = { apiKey: settings.fanartApiKey };
        if (settings.tvdbApiKey) config.tvdb = { apiKey: settings.tvdbApiKey };
        
        // Add Last.fm for music (settings key takes priority over env)
        const lastfmApiKey = settings.lastfmApiKey || import.meta.env['VITE_LASTFM_API_KEY'];
        if (lastfmApiKey) config.lastfm = { apiKey: lastfmApiKey };
        
        const providerRegistry = createProviderRegistry(client, config);
        
        console.log('[ImageSearch] Available providers:', providerRegistry.getAvailableProviders());
        
        // Collection search: use TMDB /search/collection only
        // Plex Discover returns individual movies/shows, not collections, so it's not suitable here
        if (isCollectionSearch) {
          const tmdbProvider = providerRegistry.getProvider('tmdb') as TMDBProvider | undefined;
          if (!tmdbProvider) {
            console.error('[ImageSearch] TMDB provider not available for collection search');
            return [];
          }

          console.log('[ImageSearch] Searching TMDB collections for:', searchTitle);
          const collectionResults = await tmdbProvider.searchCollection(searchTitle);
          console.log('[ImageSearch] TMDB collection results:', collectionResults.length);
          return collectionResults;
        }
        
        // Determine providers based on content type
        let providers: string[];
        if (isMusic) {
          // Music: Use Last.fm, MusicBrainz, iTunes, AlbumArtExchange, Discogs, Plex
          providers = ['lastfm', 'itunes', 'albumartexchange', 'discogs', 'plex'];
        } else if (isTVShow) {
          // TV shows: Try TVDB first (if available), then TMDB, then Plex
          providers = ['tvdb', 'tmdb', 'plex'];
        } else {
          // Movies: Use TMDB, then Plex as fallback
          providers = ['tmdb', 'plex'];
        }
        
        let results: SearchResult[] = [];
        
        if (isMusic) {
          // For music: search ALL providers and combine results
          for (const provider of providers) {
            if (providerRegistry.hasProvider(provider as any)) {
              try {
                console.log(`[ImageSearch] Searching ${provider}...`);
                const providerResults = await providerRegistry.search(provider as any, searchTitle, mediaType, searchYear);
                console.log(`[ImageSearch] ${provider} results:`, providerResults.length);
                
                // Add results, avoiding duplicates by title+year
                for (const result of providerResults.slice(0, 3)) {
                  const isDuplicate = results.some(
                    r => r.title.toLowerCase() === result.title.toLowerCase() && r.year === result.year
                  );
                  if (!isDuplicate) {
                    results.push(result);
                  }
                }
              } catch (error) {
                console.error(`[ImageSearch] ${provider} search failed:`, error);
              }
            } else {
              console.log(`[ImageSearch] ${provider} provider not available (no API key configured)`);
            }
          }
        } else {
          // For movies/TV: try providers in order, stop at first with results
          for (const provider of providers) {
            if (providerRegistry.hasProvider(provider as any)) {
              try {
                console.log(`[ImageSearch] Searching ${provider}...`);
                results = await providerRegistry.search(provider as any, searchTitle, mediaType, searchYear);
                console.log(`[ImageSearch] ${provider} results:`, results.length);
                
                if (results.length > 0) {
                  break;
                }
              } catch (error) {
                console.error(`[ImageSearch] ${provider} search failed:`, error);
              }
            } else {
              console.log(`[ImageSearch] ${provider} provider not available (no API key configured)`);
            }
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
    queryKey: ['image-search-images', selectedMatch?.externalId, item.type, item.index, Array.from(selectedTypes).sort().join(',')],
    queryFn: async () => {
      if (!selectedMatch) return [];
      
      try {
        console.log('[ImageSearch] Fetching images for match...', { 
          match: selectedMatch,
          itemType: item.type,
          seasonNumber: item.index,
        });
        
        // Get API keys from settings
        const settingsManager = getSettingsManager();
        const settings = await settingsManager.getSettings();
        
        // Create provider registry
        const config: any = {};
        if (settings.tmdbApiKey) config.tmdb = { apiKey: settings.tmdbApiKey };
        if (settings.fanartApiKey) config.fanart = { apiKey: settings.fanartApiKey };
        if (settings.tvdbApiKey) config.tvdb = { apiKey: settings.tvdbApiKey };
        
        // Add Last.fm for music (settings key takes priority over env)
        const lastfmApiKey = settings.lastfmApiKey || import.meta.env['VITE_LASTFM_API_KEY'];
        if (lastfmApiKey) config.lastfm = { apiKey: lastfmApiKey };
        
        const providerRegistry = createProviderRegistry(client, config);
        
        // Collection images: use TMDB /collection/{id}/images endpoint
        if (isCollectionSearch && selectedMatch.externalId.startsWith('collection-')) {
          const tmdbProvider = providerRegistry.getProvider('tmdb') as TMDBProvider | undefined;
          if (!tmdbProvider) {
            console.error('[ImageSearch] TMDB provider not available for collection images');
            return [];
          }
          
          const collectionId = selectedMatch.externalId.replace('collection-', '');
          console.log('[ImageSearch] Fetching collection images for ID:', collectionId);
          const collectionImages = await tmdbProvider.getCollectionImages(collectionId);
          
          const allPosters: ImageResult[] = collectionImages.posters.map((url) => ({
            url,
            width: 0,
            height: 0,
            type: 'poster' as const,
            provider: 'TMDB',
          }));
          
          const allBackgrounds: ImageResult[] = collectionImages.backdrops.map((url) => ({
            url,
            width: 0,
            height: 0,
            type: 'background' as const,
            provider: 'TMDB',
          }));
          
          console.log('[ImageSearch] Collection images:', {
            posters: allPosters.length,
            backgrounds: allBackgrounds.length,
          });
          
          return [...allPosters, ...allBackgrounds];
        }

        // Plex Discover images: use Plex metadata provider for posters and backdrops
        if (selectedMatch.externalId.startsWith('plex-')) {
          const plexProvider = providerRegistry.getProvider('plex') as PlexOnlineProvider | undefined;
          if (!plexProvider) {
            console.error('[ImageSearch] Plex provider not available for image fetch');
            return [];
          }

          const plexId = selectedMatch.externalId.replace('plex-', '');
          console.log('[ImageSearch] Fetching Plex images for ID:', plexId);
          const plexImages = await plexProvider.getImages(plexId);

          const allPosters: ImageResult[] = plexImages.posters.map((url) => ({
            url,
            width: 0,
            height: 0,
            type: 'poster' as const,
            provider: 'Plex',
          }));

          const allBackgrounds: ImageResult[] = plexImages.backdrops.map((url) => ({
            url,
            width: 0,
            height: 0,
            type: 'background' as const,
            provider: 'Plex',
          }));

          console.log('[ImageSearch] Plex images:', {
            posters: allPosters.length,
            backgrounds: allBackgrounds.length,
          });

          return [...allPosters, ...allBackgrounds];
        }
        
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
            console.log('[ImageSearch] Fetching from TVDB with ID:', tvdbId, 'Type:', item.type, 'Season:', item.parentIndex, 'Episode:', item.index);
            let tvdbExternalId = tvdbId.startsWith('series-') ? tvdbId : `series-${tvdbId}`;
            
            // For seasons, append season number to fetch season-specific images
            if (item.type === 'season' && item.index !== undefined) {
              tvdbExternalId = `${tvdbExternalId}-season-${item.index}`;
            }
            // For episodes, append season and episode numbers
            else if (item.type === 'episode' && item.parentIndex !== undefined && item.index !== undefined) {
              tvdbExternalId = `${tvdbExternalId}-season-${item.parentIndex}-episode-${item.index}`;
            }
            
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
            console.log('[ImageSearch] Fetching from TMDB with ID:', tmdbId, 'Type:', item.type, 'Season:', item.parentIndex, 'Episode:', item.index);
            let tmdbExternalId = isMovie ? `movie-${tmdbId}` : `tv-${tmdbId}`;
            
            // For seasons, append season number to fetch season-specific images
            if (item.type === 'season' && item.index !== undefined) {
              tmdbExternalId = `${tmdbExternalId}-season-${item.index}`;
            }
            // For episodes, append season and episode numbers
            else if (item.type === 'episode' && item.parentIndex !== undefined && item.index !== undefined) {
              tmdbExternalId = `${tmdbExternalId}-season-${item.parentIndex}-episode-${item.index}`;
            }
            
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
            const rawId = isTVShow ? (tvdbId || tmdbId) : tmdbId;
            
            if (rawId) {
              // Remove any existing prefix from the ID
              const cleanId = rawId.replace(/^(movie|tv|series)-/, '');
              
              // Format the ID for Fanart.tv: "movie-{tmdbId}" or "tv-{tvdbId}"
              const fanartId = isTVShow ? `tv-${cleanId}` : `movie-${cleanId}`;
              
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
            // Fanart.tv errors are non-fatal - just log and continue
            // Common errors: invalid API key, CORS issues, or missing artwork
            console.warn('[ImageSearch] Fanart.tv fetch failed (non-fatal):', error instanceof Error ? error.message : error);
          }
        }
        
        // Fetch music images from Last.fm, iTunes, and AlbumArtExchange
        if (isMusic && selectedMatch) {
          const musicSearchQuery = item.type === 'album'
            ? `${item.parentTitle || ''} ${item.title}`.trim()
            : item.type === 'track'
            ? (item.grandparentTitle || item.title)
            : item.title;

          // Last.fm images
          if (providerRegistry.hasProvider('lastfm')) {
            try {
              console.log('[ImageSearch] Fetching Last.fm images for:', musicSearchQuery);
              const lastfmResults = await providerRegistry.search('lastfm', musicSearchQuery, mediaType, selectedMatch.year);
              if (lastfmResults.length > 0 && lastfmResults[0]) {
                const lastfmMeta = await providerRegistry.getDetails('lastfm', lastfmResults[0].externalId);
                if (lastfmMeta.posters) {
                  lastfmMeta.posters.forEach((url: string) => {
                    allPosters.push({ url, width: 0, height: 0, type: 'poster', provider: 'Last.fm' });
                  });
                }
                if (lastfmMeta.backdrops) {
                  lastfmMeta.backdrops.forEach((url: string) => {
                    allBackgrounds.push({ url, width: 0, height: 0, type: 'background', provider: 'Last.fm' });
                  });
                }
                console.log('[ImageSearch] Last.fm images:', { posters: lastfmMeta.posters?.length || 0 });
              }
            } catch (error) {
              console.warn('[ImageSearch] Last.fm image fetch failed:', error);
            }
          }

          // iTunes artwork
          if (providerRegistry.hasProvider('itunes')) {
            try {
              console.log('[ImageSearch] Fetching iTunes artwork for:', musicSearchQuery);
              const itunesResults = await providerRegistry.search('itunes', musicSearchQuery, mediaType, selectedMatch.year);
              if (itunesResults.length > 0 && itunesResults[0]) {
                const itunesMeta = await providerRegistry.getDetails('itunes', itunesResults[0].externalId);
                if (itunesMeta.posters) {
                  itunesMeta.posters.forEach((url: string) => {
                    allPosters.push({ url, width: 0, height: 0, type: 'poster', provider: 'iTunes' });
                  });
                }
                console.log('[ImageSearch] iTunes images:', { posters: itunesMeta.posters?.length || 0 });
              }
            } catch (error) {
              console.warn('[ImageSearch] iTunes image fetch failed:', error);
            }
          }

          // AlbumArtExchange artwork
          if (providerRegistry.hasProvider('albumartexchange')) {
            try {
              console.log('[ImageSearch] Fetching AlbumArtExchange for:', musicSearchQuery);
              const aaeResults = await providerRegistry.search('albumartexchange' as any, musicSearchQuery, mediaType, selectedMatch.year);
              if (aaeResults.length > 0 && aaeResults[0]) {
                const aaeMeta = await providerRegistry.getDetails('albumartexchange' as any, aaeResults[0].externalId);
                if (aaeMeta.posters) {
                  aaeMeta.posters.forEach((url: string) => {
                    allPosters.push({ url, width: 0, height: 0, type: 'poster', provider: 'AlbumArtExchange' });
                  });
                }
                console.log('[ImageSearch] AlbumArtExchange images:', { posters: aaeMeta.posters?.length || 0 });
              }
            } catch (error) {
              console.warn('[ImageSearch] AlbumArtExchange image fetch failed:', error);
            }
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

  // Sort state
  const [sortBy, setSortBy] = useState<'default' | 'size-desc' | 'size-asc'>('size-desc');

  // Preload image dimensions using Image() objects so we can sort before display
  useEffect(() => {
    if (!images || images.length === 0) return;

    const urlsToLoad = images
      .filter((img: ImageResult) => !imageDimensions.has(img.url))
      .map((img: ImageResult) => img.url);

    urlsToLoad.forEach((url: string) => {
      const img = new Image();
      img.onload = () => {
        setImageDimensions(prev => {
          if (prev.has(url)) return prev;
          const next = new Map(prev);
          next.set(url, { width: img.naturalWidth, height: img.naturalHeight });
          return next;
        });
      };
      img.src = url;
    });
  }, [images]);

  // Sorted image lists
  const sortedPosters = useMemo(() => {
    if (sortBy === 'default') return posters;
    return [...posters].sort((a, b) => {
      const dimsA = imageDimensions.get(a.url);
      const dimsB = imageDimensions.get(b.url);
      const areaA = dimsA ? dimsA.width * dimsA.height : 0;
      const areaB = dimsB ? dimsB.width * dimsB.height : 0;
      return sortBy === 'size-desc' ? areaB - areaA : areaA - areaB;
    });
  }, [posters, imageDimensions, sortBy]);

  const sortedBackgrounds = useMemo(() => {
    if (sortBy === 'default') return backgrounds;
    return [...backgrounds].sort((a, b) => {
      const dimsA = imageDimensions.get(a.url);
      const dimsB = imageDimensions.get(b.url);
      const areaA = dimsA ? dimsA.width * dimsA.height : 0;
      const areaB = dimsB ? dimsB.width * dimsB.height : 0;
      return sortBy === 'size-desc' ? areaB - areaA : areaA - areaB;
    });
  }, [backgrounds, imageDimensions, sortBy]);

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
              // File path (for movies/episodes)
              const lastSlash = Math.max(mediaPath.lastIndexOf('/'), mediaPath.lastIndexOf('\\'));
              const directory = mediaPath.substring(0, lastSlash);
              const filename = mediaPath.substring(lastSlash + 1);
              const lastDot = filename.lastIndexOf('.');
              const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename;
              
              // For episodes: Use filename.jpg (no suffix)
              // For movies: Use filename-poster.jpg / filename-fanart.jpg
              if (item.type === 'episode') {
                // Episode thumbnails: just the filename with .jpg extension
                // Only poster type makes sense for episodes (episode thumbnail)
                if (image.type === 'poster') {
                  targetPath = `${directory}\\${nameWithoutExt}.${ext}`;
                } else {
                  // Episodes don't typically have fanart, but if requested, save as filename-fanart.jpg
                  targetPath = `${directory}\\${nameWithoutExt}-fanart.${ext}`;
                }
              } else {
                // Movies: Use filename-poster.jpg / filename-fanart.jpg
                if (image.type === 'poster') {
                  targetPath = `${directory}\\${nameWithoutExt}-poster.${ext}`;
                } else {
                  targetPath = `${directory}\\${nameWithoutExt}-fanart.${ext}`;
                }
              }
            } else {
              // Directory path (for TV shows and seasons)
              if (item.type === 'season' && item.index !== undefined) {
                // Season posters are saved in the PARENT directory (show root), not in the season directory
                // Format: Season01.jpg, Season02.jpg, etc.
                const lastSlash = Math.max(mediaPath.lastIndexOf('/'), mediaPath.lastIndexOf('\\'));
                const parentDirectory = mediaPath.substring(0, lastSlash);
                const seasonNum = String(item.index).padStart(2, '0');
                
                if (image.type === 'poster') {
                  targetPath = `${parentDirectory}\\Season${seasonNum}.${ext}`;
                } else {
                  // Seasons typically share the show's fanart in the parent directory
                  targetPath = `${parentDirectory}\\fanart.${ext}`;
                }
              } else {
                // TV shows: Use poster.jpg / fanart.jpg in the show directory
                if (image.type === 'poster') {
                  targetPath = `${mediaPath}\\poster.${ext}`;
                } else {
                  targetPath = `${mediaPath}\\fanart.${ext}`;
                }
              }
            }

            // Download directly via Electron main process (bypasses CORS)
            await window.electron.downloadFile(image.url, targetPath);
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={step === 'search' ? 'Select Match' : 'Search Images'}
      subtitle={
        step === 'search' 
          ? `${item.title} • Confirm the correct ${mediaType}`
          : `${selectedMatch?.title} • Searching multiple image sources`
      }
      maxWidth="4xl"
      className="max-h-[90vh]"
    >
      <div className="flex flex-col h-full -m-6">{/* Negative margin to extend to modal edges */}

        {/* Step 1: Search Results */}
        {step === 'search' && (
          <div className="flex-1 overflow-auto p-6">
            {isSearching ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                  <p className="text-slate-600">Searching {isTVShow ? 'TVDB and TMDB' : isMusic ? 'Last.fm, MusicBrainz, and iTunes' : 'TMDB'}...</p>
                </div>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedMatch(result)}
                    className={`flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedMatch?.externalId === result.externalId
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-slate-200 hover:border-primary-300 hover:shadow-sm'
                    }`}
                  >
                    {result.thumb && (
                      <img
                        src={result.thumb}
                        alt={result.title}
                        className={`${isMusic ? 'w-20 h-20' : 'w-20 h-30'} object-cover rounded-lg shadow-sm`}
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {result.title}
                        {result.year && <span className="text-slate-500 ml-2">({result.year})</span>}
                      </h3>
                      {result.summary && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {result.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-md font-medium">
                          {result.provider?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {selectedMatch?.externalId === result.externalId && (
                      <div className="flex items-center">
                        <div className="bg-primary-500 text-white rounded-full p-2">
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
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
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
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex gap-2">
                <Button
                  variant={selectedTypes.has('poster') ? 'primary' : 'secondary'}
                  size="medium"
                  onClick={() => toggleType('poster')}
                >
                  Posters {selectedTypes.has('poster') && `(${posters.length})`}
                </Button>
                <Button
                  variant={selectedTypes.has('background') ? 'primary' : 'secondary'}
                  size="medium"
                  onClick={() => toggleType('background')}
                >
                  Backgrounds {selectedTypes.has('background') && `(${backgrounds.length})`}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="medium"
                  onClick={() => {
                    setStep('search');
                    setSelectedPoster(null);
                    setSelectedBackground(null);
                  }}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  }
                >
                  Back to Search
                </Button>
                <Button
                  variant="ghost"
                  size="medium"
                  onClick={() => refetch()}
                  disabled={isLoadingImages}
                  loading={isLoadingImages}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                  title="Refresh images from sources"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {/* Image Grid */}
            <div className="flex-1 overflow-auto p-6">
              {isLoadingImages ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading images from {isTVShow ? 'TVDB, TMDB, Fanart.tv' : 'TMDB, Fanart.tv'}...</p>
                  </div>
                </div>
              ) : images && images.length > 0 ? (
                <div className="space-y-8">
                  {/* Sort Controls */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{images.length} images found</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sort by:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="size-desc">Largest first</option>
                        <option value="size-asc">Smallest first</option>
                        <option value="default">Default</option>
                      </select>
                    </div>
                  </div>

                  {/* Posters Section */}
                  {selectedTypes.has('poster') && sortedPosters.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        Posters ({sortedPosters.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {sortedPosters.map((image: ImageResult, index: number) => (
                          <div
                            key={`poster-${index}`}
                            className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all group ${
                              selectedPoster?.url === image.url
                                ? 'border-primary-500 shadow-lg ring-2 ring-primary-500 scale-105'
                                : 'border-slate-200 hover:border-primary-300 hover:shadow-md hover:scale-105'
                            }`}
                            onClick={() => setSelectedPoster(image)}
                          >
                            <img
                              src={image.url}
                              alt={`Poster ${index + 1}`}
                              className={`w-full h-auto ${isMusic ? 'aspect-square' : 'aspect-[2/3]'} object-cover`}
                              loading="lazy"
                              onLoad={(e) => handleImageLoad(image.url, e)}
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent text-white text-xs p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              {(() => {
                                const dims = getDimensions(image.url);
                                return dims.width > 0 ? (
                                  <div className="font-medium">{dims.width} × {dims.height}</div>
                                ) : (
                                  <div>Loading...</div>
                                );
                              })()}
                              {image.provider && <div className="font-semibold mt-1">{image.provider}</div>}
                            </div>
                            {selectedPoster?.url === image.url && (
                              <div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full p-1.5 shadow-lg">
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
                  {selectedTypes.has('background') && sortedBackgrounds.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        Backgrounds ({sortedBackgrounds.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedBackgrounds.map((image: ImageResult, index: number) => (
                          <div
                            key={`background-${index}`}
                            className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all group ${
                              selectedBackground?.url === image.url
                                ? 'border-primary-500 shadow-lg ring-2 ring-primary-500 scale-105'
                                : 'border-slate-200 hover:border-primary-300 hover:shadow-md hover:scale-105'
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
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent text-white text-xs p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              {(() => {
                                const dims = getDimensions(image.url);
                                return dims.width > 0 ? (
                                  <div className="font-medium">{dims.width} × {dims.height}</div>
                                ) : (
                                  <div>Loading...</div>
                                );
                              })()}
                              {image.provider && <div className="font-semibold mt-1">{image.provider}</div>}
                            </div>
                            {selectedBackground?.url === image.url && (
                              <div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full p-1.5 shadow-lg">
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
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
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
        <div className="flex flex-col gap-3 p-6 border-t border-slate-200 bg-slate-50">
          {/* Selected images info */}
          <div className="text-sm text-slate-600">
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
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="plex">Save to Plex</option>
                <option value="local">Save Locally</option>
                <option value="both">Save to Both</option>
              </select>
            )}
            
            <div className="flex items-center gap-3 ml-auto">
              <Button
                variant="secondary"
                size="medium"
                onClick={onClose}
              >
                Cancel
              </Button>
              {step === 'search' ? (
                <Button
                  variant="primary"
                  size="medium"
                  onClick={() => {
                    if (selectedMatch) {
                      setStep('images');
                    }
                  }}
                  disabled={!selectedMatch}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  }
                >
                  Continue to Images
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="medium"
                  onClick={() => {
                    if (selectedPoster || selectedBackground) {
                      applyImageMutation.mutate();
                    }
                  }}
                  disabled={(!selectedPoster && !selectedBackground) || applyImageMutation.isPending}
                  loading={applyImageMutation.isPending}
                >
                  {applyImageMutation.isPending 
                    ? 'Applying...'
                    : `Apply Selected ${selectedPoster && selectedBackground ? 'Images' : 'Image'}`
                  }
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

