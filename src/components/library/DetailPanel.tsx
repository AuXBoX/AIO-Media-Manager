import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LibraryItem } from '@/managers/LibraryManager';
import { createPlexClient } from '@/api/plexClient';
import { createMetadataManager, type MetadataUpdate } from '@/managers/MetadataManager';
import { createLocalMetadataManager, type MetadataSaveMode } from '@/managers/LocalMetadataManager';
import { createSubtitleManager } from '@/managers/SubtitleManager';
import { createFFmpegManager } from '@/managers/FFmpegManager';
import { createProviderRegistry } from '@/providers/ProviderRegistry';
import { MetadataRefreshModal } from '@/components/library/MetadataRefreshModal';
import { SubtitleSearchModal } from '@/components/library/SubtitleSearchModal';
import { TrailerSearchModal } from '@/components/library/TrailerSearchModal';
import { ImageSearchModal } from '@/components/library/ImageSearchModal';
import { MusicVideoSearchModal } from '@/components/library/MusicVideoSearchModal';
import { Tabs, TabsList, Tab, TabPanel } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DetailPanelEmptyState } from '@/components/ui/EmptyState';
import { queryKeys } from '@/api/queryKeys';
import { db } from '@/db/database';
import { useAppStore } from '@/store/appStore';
import type { LocalSubtitle, PlexSubtitle } from '@/types/subtitle';

interface DetailPanelProps {
  item: LibraryItem | null;
  serverUrl: string;
  token: string;
  onClose?: () => void;
}

type TabType = 'details' | 'cast' | 'images' | 'theme' | 'files' | 'trailers' | 'subtitles' | 'musicvideos';

interface EditableField {
  value: string | number | undefined;
  isEditing: boolean;
  originalValue: string | number | undefined;
}

export function DetailPanel({ item, serverUrl, token, onClose }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isEditing] = useState(true); // Always in edit mode
  const [saveTarget, setSaveTarget] = useState<'plex' | 'local' | 'both'>('plex');
  const [hasLocalNfo, setHasLocalNfo] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [localTrailers, setLocalTrailers] = useState<string[]>([]);
  const [localSubtitles, setLocalSubtitles] = useState<LocalSubtitle[]>([]);
  const [plexSubtitles, setPlexSubtitles] = useState<PlexSubtitle[]>([]);
  const [localMusicVideos, setLocalMusicVideos] = useState<Array<{
    ratingKey: string;
    key: string;
    title: string;
    thumb?: string;
    duration?: number;
    file?: string;
  }>>([]);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [showSubtitleSearchModal, setShowSubtitleSearchModal] = useState(false);
  const [showTrailerSearch, setShowTrailerSearch] = useState(false);
  const [showImageSearchModal, setShowImageSearchModal] = useState(false);
  const [showMusicVideoSearch, setShowMusicVideoSearch] = useState(false);
  const [selectedSubtitlesForRemoval, setSelectedSubtitlesForRemoval] = useState<Set<string>>(new Set());
  const [isFetchingCast, setIsFetchingCast] = useState(false);
  const [castFetchResult, setCastFetchResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showCastReviewModal, setShowCastReviewModal] = useState(false);
  const [fetchedCastData, setFetchedCastData] = useState<{
    cast: Array<{ name: string; character?: string; profilePath?: string }>;
    directors: string[];
    writers: string[];
    provider: string;
  } | null>(null);
  const queryClient = useQueryClient();

  // Editable fields state
  const [editedFields, setEditedFields] = useState<Record<string, any>>({});

  // Fetch full metadata for the selected item
  const { data: fullMetadata, refetch } = useQuery({
    queryKey: queryKeys.metadata(item?.ratingKey || ''),
    queryFn: async () => {
      if (!item) return null;
      const client = createPlexClient({ baseURL: serverUrl, token });
      return client.get(`/library/metadata/${item.ratingKey}`);
    },
    enabled: !!item,
  });

  // Fetch album children (tracks) for the Files tab
  const isAlbum = item?.type === 'album';
  const { data: albumTracksData } = useQuery({
    queryKey: ['album-tracks', item?.ratingKey || ''],
    queryFn: async () => {
      if (!item) return null;
      const client = createPlexClient({ baseURL: serverUrl, token });
      return client.get(`/library/metadata/${item.ratingKey}/children`);
    },
    enabled: !!item && isAlbum,
  });
  const albumTracks = albumTracksData?.MediaContainer?.Metadata || [];

  // Check for local NFO file
  useEffect(() => {
    const checkLocalNfo = async () => {
      if (!item) return;
      
      try {
        const client = createPlexClient({ baseURL: serverUrl, token });
        const metadataManager = createMetadataManager(client);
        const localManager = createLocalMetadataManager(metadataManager);
        
        // Fetch full metadata to ensure we have all required fields
        const fullItem = await metadataManager.getMetadata(item.ratingKey);
        
        // Only detect local changes if we have a valid metadata item with required fields
        if (fullItem && fullItem.addedAt !== undefined) {
          const detection = await localManager.detectLocalChanges(fullItem);
          setHasLocalNfo(detection.nfoExists);
        }
      } catch (error) {
        console.error('Error checking local NFO:', error);
      }
    };
    
    checkLocalNfo();
  }, [item, serverUrl, token]);

  // Check if item has local changes in database
  useEffect(() => {
    const checkDirty = async () => {
      if (!item) return;
      const record = await db.metadata.get(item.ratingKey);
      setIsDirty(record?.dirty || false);
    };
    
    checkDirty();
  }, [item]);

  // Scan for local trailer files
  useEffect(() => {
    const scanLocalTrailers = async () => {
      if (!item || !fullMetadata?.MediaContainer?.Metadata?.[0]) return;
      
      const metadata = fullMetadata.MediaContainer.Metadata[0];
      
      // Get the media file path
      if (!metadata.Media?.[0]?.Part?.[0]?.file) {
        setLocalTrailers([]);
        return;
      }
      
      const mediaFilePath = metadata.Media[0].Part[0].file;
      
      // Check if running in Electron
      if (typeof window === 'undefined' || !window.electron) {
        setLocalTrailers([]);
        return;
      }
      
      try {
        // Get directory and filename
        const lastSlash = Math.max(mediaFilePath.lastIndexOf('/'), mediaFilePath.lastIndexOf('\\'));
        const directory = mediaFilePath.substring(0, lastSlash);
        const filename = mediaFilePath.substring(lastSlash + 1);
        const lastDot = filename.lastIndexOf('.');
        const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename;
        
        // Scan for trailer files with -trailer suffix
        const trailerPatterns = [
          `${nameWithoutExt}-trailer.*`,
          `${nameWithoutExt}-Trailer.*`,
          `${nameWithoutExt} - Trailer.*`,
          `${nameWithoutExt} - trailer.*`,
        ];
        
        // Use Electron IPC to scan directory
        const foundTrailers = await window.electron.scanForTrailers(directory, nameWithoutExt);
        setLocalTrailers(foundTrailers || []);
      } catch (error) {
        console.error('Error scanning for local trailers:', error);
        setLocalTrailers([]);
      }
    };
    
    scanLocalTrailers();
  }, [item, fullMetadata]);

  // Scan for local subtitle files
  useEffect(() => {
    const scanLocalSubtitles = async () => {
      if (!item || !fullMetadata?.MediaContainer?.Metadata?.[0]) return;
      
      const metadata = fullMetadata.MediaContainer.Metadata[0];
      
      // Get the media file path
      if (!metadata.Media?.[0]?.Part?.[0]?.file) {
        setLocalSubtitles([]);
        setPlexSubtitles([]);
        return;
      }
      
      const mediaFilePath = metadata.Media[0].Part[0].file;
      
      try {
        // Scan for local subtitle files
        const subtitleManager = createSubtitleManager();
        const foundSubtitles = await subtitleManager.scanSubtitles(mediaFilePath);
        setLocalSubtitles(foundSubtitles);
        
        // Extract Plex subtitles from metadata
        const plexSubs: PlexSubtitle[] = [];
        if (metadata.Media?.[0]?.Part?.[0]?.Stream) {
          const streams = metadata.Media[0].Part[0].Stream;
          let subtitleIndex = 0; // Track subtitle stream index (0, 1, 2, etc.)
          for (const stream of streams) {
            if (stream.streamType === 3) { // Subtitle stream
              plexSubs.push({
                id: stream.id || '',
                key: stream.key || '',
                language: stream.language || stream.languageCode || 'Unknown',
                languageCode: stream.languageCode || stream.language || 'und',
                codec: stream.codec || 'unknown',
                selected: stream.selected === 1 || stream.selected === true,
                forced: stream.forced === 1 || stream.forced === true,
                external: stream.key ? true : false,
                format: stream.format || stream.codec,
                streamIndex: subtitleIndex, // Add the subtitle stream index for FFmpeg
              });
              subtitleIndex++;
            }
          }
        }
        setPlexSubtitles(plexSubs);
      } catch (error) {
        console.error('Error scanning for subtitles:', error);
        setLocalSubtitles([]);
        setPlexSubtitles([]);
      }
    };
    
    scanLocalSubtitles();
  }, [item, fullMetadata]);

  // Fetch music videos from Plex for tracks
  useEffect(() => {
    const fetchMusicVideos = async () => {
      if (!item || item.type !== 'track') return;
      
      try {
        const client = createPlexClient({ baseURL: serverUrl, token });
        
        // Try multiple endpoints to find music videos
        console.log('[MusicVideos] Trying /extras endpoint...');
        try {
          const extrasResponse = await client.get(`/library/metadata/${item.ratingKey}/extras`);
          console.log('[MusicVideos] Extras response:', extrasResponse);
          
          if (extrasResponse.MediaContainer?.Metadata) {
            const videos = extrasResponse.MediaContainer.Metadata.map((video: any) => ({
              ratingKey: video.ratingKey,
              key: video.key,
              title: video.title,
              thumb: video.thumb,
              duration: video.duration,
              file: video.Media?.[0]?.Part?.[0]?.file,
            }));
            setLocalMusicVideos(videos);
            return;
          }
        } catch (error) {
          console.log('[MusicVideos] /extras endpoint failed:', error);
        }
        
        // Try children endpoint
        console.log('[MusicVideos] Trying /children endpoint...');
        try {
          const childrenResponse = await client.get(`/library/metadata/${item.ratingKey}/children`);
          console.log('[MusicVideos] Children response:', childrenResponse);
          
          if (childrenResponse.MediaContainer?.Metadata) {
            // Filter for video type items
            const videos = childrenResponse.MediaContainer.Metadata
              .filter((item: any) => item.type === 'clip' || item.type === 'video')
              .map((video: any) => ({
                ratingKey: video.ratingKey,
                key: video.key,
                title: video.title,
                thumb: video.thumb,
                duration: video.duration,
                file: video.Media?.[0]?.Part?.[0]?.file,
              }));
            
            if (videos.length > 0) {
              setLocalMusicVideos(videos);
              return;
            }
          }
        } catch (error) {
          console.log('[MusicVideos] /children endpoint failed:', error);
        }
        
        // Try related endpoint as fallback
        console.log('[MusicVideos] Trying /related endpoint...');
        const response = await client.get(`/library/metadata/${item.ratingKey}/related`);
        console.log('[MusicVideos] Related response:', response);
        
        const hubs = response.MediaContainer?.Hub || [];
        console.log('[MusicVideos] Hubs found:', hubs.length);
        
        hubs.forEach((hub: any, index: number) => {
          console.log(`[MusicVideos] Hub ${index}:`, {
            type: hub.type,
            hubIdentifier: hub.hubIdentifier,
            title: hub.title,
            size: hub.size,
          });
        });
        
        const musicVideoHub = hubs.find((hub: any) => 
          hub.type === 'clip' || 
          hub.hubIdentifier === 'extras' || 
          hub.hubIdentifier === 'musicVideos' ||
          hub.title?.toLowerCase().includes('video') ||
          hub.title?.toLowerCase().includes('extra')
        );
        
        if (musicVideoHub && musicVideoHub.Metadata) {
          const videos = musicVideoHub.Metadata.map((video: any) => ({
            ratingKey: video.ratingKey,
            key: video.key,
            title: video.title,
            thumb: video.thumb,
            duration: video.duration,
            file: video.Media?.[0]?.Part?.[0]?.file,
          }));
          setLocalMusicVideos(videos);
        } else {
          console.log('[MusicVideos] No music videos found in any endpoint');
          setLocalMusicVideos([]);
        }
      } catch (error) {
        console.error('[MusicVideos] Error fetching music videos from Plex:', error);
        setLocalMusicVideos([]);
      }
    };
    
    fetchMusicVideos();
  }, [item, serverUrl, token]);

  // Reset edited fields when item changes
  useEffect(() => {
    setEditedFields({});
  }, [item?.ratingKey]);

  // Save metadata mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error('No item selected');
      
      const client = createPlexClient({ baseURL: serverUrl, token });
      const metadataManager = createMetadataManager(client);
      const localManager = createLocalMetadataManager(metadataManager);
      
      const updates: MetadataUpdate = {};
      
      // Map edited fields to MetadataUpdate
      if (editedFields.title !== undefined) updates.title = editedFields.title;
      if (editedFields.originalTitle !== undefined) updates.originalTitle = editedFields.originalTitle;
      if (editedFields.summary !== undefined) updates.summary = editedFields.summary;
      if (editedFields.tagline !== undefined) updates.tagline = editedFields.tagline;
      if (editedFields.year !== undefined) updates.year = parseInt(editedFields.year);
      if (editedFields.studio !== undefined) updates.studio = editedFields.studio;
      if (editedFields.contentRating !== undefined) updates.contentRating = editedFields.contentRating;
      if (editedFields.rating !== undefined) updates.rating = parseFloat(editedFields.rating);
      if (editedFields.genres !== undefined) updates.genres = editedFields.genres;
      
      // Save to Plex
      if (saveTarget === 'plex' || saveTarget === 'both') {
        await metadataManager.updateMetadata(item.ratingKey, updates);
      }
      
      // Save to local files
      if (saveTarget === 'local' || saveTarget === 'both') {
        // For music items, save to audio file tags
        if (item.type === 'track' || item.type === 'album') {
          if (!window.electron?.writeEmbeddedMetadata) {
            throw new Error('Audio metadata editing is only available in desktop app');
          }
          
          // Get file path(s)
          const fullMeta = fullMetadata?.MediaContainer?.Metadata?.[0];
          const filePaths: string[] = [];
          
          if (item.type === 'track' && fullMeta?.Media?.[0]?.Part?.[0]?.file) {
            filePaths.push(fullMeta.Media[0].Part[0].file);
          } else if (item.type === 'album') {
            // For albums, get all track files
            const albumTracks = await client.get(`/library/metadata/${item.ratingKey}/children`);
            const tracks = albumTracks.MediaContainer?.Metadata || [];
            tracks.forEach((track: any) => {
              if (track.Media?.[0]?.Part?.[0]?.file) {
                filePaths.push(track.Media[0].Part[0].file);
              }
            });
          }
          
          // Update each file's metadata
          for (const filePath of filePaths) {
            try {
              const audioMetadata: any = {};
              
              if (editedFields.title !== undefined) audioMetadata.title = editedFields.title;
              if (editedFields.artist !== undefined) audioMetadata.artist = editedFields.artist;
              if (editedFields.album !== undefined) audioMetadata.album = editedFields.album;
              if (editedFields.albumArtist !== undefined) audioMetadata.albumArtist = editedFields.albumArtist;
              if (editedFields.year !== undefined) audioMetadata.year = editedFields.year;
              
              await window.electron.writeEmbeddedMetadata(filePath, audioMetadata);
              console.log(`[DetailPanel] Updated audio metadata for: ${filePath}`);
            } catch (error) {
              console.error(`[DetailPanel] Failed to update audio metadata for ${filePath}:`, error);
              throw new Error(`Failed to update audio file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        } else {
          // For non-music items, use NFO files
          const metadata = await metadataManager.getMetadata(item.ratingKey);
          const mode: MetadataSaveMode = {
            target: 'local',
            localFormat: 'nfo',
            createBackup: true,
            overwriteExisting: true,
          };
          await localManager.syncToLocal(metadata, mode);
        }
      }
      
      // Save to local database for offline changes
      if (saveTarget === 'local' || saveTarget === 'both') {
        await db.metadata.put({
          ratingKey: item.ratingKey,
          sectionId: item.librarySectionID || '',
          type: item.type,
          data: { ...item, ...editedFields },
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: true,
        });
      }
    },
    onSuccess: () => {
      // Refetch metadata
      refetch();
      queryClient.invalidateQueries({ queryKey: queryKeys.metadata(item?.ratingKey || '') });
      
      // Reset edited fields after successful save
      setEditedFields({});
    },
  });

  if (!item) {
    return (
      <div className="flex items-center justify-center h-full bg-secondary-50 dark:bg-secondary-900 border-l border-secondary-200 dark:border-secondary-700 rounded-xl">
        <DetailPanelEmptyState />
      </div>
    );
  }

  const metadata = fullMetadata?.MediaContainer?.Metadata?.[0] || item;
  const posterUrl = metadata.thumb ? `${serverUrl}${metadata.thumb}?X-Plex-Token=${token}` : null;
  const artUrl = metadata.art ? `${serverUrl}${metadata.art}?X-Plex-Token=${token}` : null;

  // Extract media/codec info from first Media part
  const mediaInfo = metadata.Media?.[0];
  const mediaPart = mediaInfo?.Part?.[0];
  const videoCodec = mediaInfo?.videoCodec;
  const videoResolution = mediaInfo?.videoResolution;
  const audioCodec = mediaInfo?.audioCodec;
  const audioChannels = mediaInfo?.audioChannels;
  const container = mediaPart?.container || mediaInfo?.container;
  const aspectRatio = mediaInfo?.aspectRatio;
  const videoFrameRate = mediaInfo?.videoFrameRate;

  // Debug: Log backdrop URL
  useEffect(() => {
    if (item) {
      console.log('[DetailPanel] Item:', item.title);
      console.log('[DetailPanel] Poster (thumb):', metadata.thumb);
      console.log('[DetailPanel] Backdrop (art):', metadata.art);
      console.log('[DetailPanel] Backdrop URL:', artUrl);
    }
  }, [item, artUrl, metadata.art, metadata.thumb]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const tabs = [
    { id: 'details' as TabType, label: 'Details' },
    { id: 'cast' as TabType, label: 'Cast & Crew' },
    { id: 'images' as TabType, label: 'Images' },
    { id: 'theme' as TabType, label: 'Theme' },
    { id: 'trailers' as TabType, label: 'Trailers' },
    { id: 'subtitles' as TabType, label: 'Subtitles' },
    { id: 'musicvideos' as TabType, label: 'Music Videos' },
    { id: 'files' as TabType, label: 'Files' },
  ];

  // Filter tabs based on item type
  // For music items (artist, album, track), hide Cast & Crew, Trailers, and Subtitles
  const isMusicItem = item.type === 'artist' || item.type === 'album' || item.type === 'track';
  // For seasons and episodes, hide Trailers (trailers are only for shows and movies)
  const isSeasonOrEpisode = item.type === 'season' || item.type === 'episode';
  // Theme tab is only for TV shows
  const isTVShow = item.type === 'show';
  // Music videos tab is only for tracks
  const isTrack = item.type === 'track';
  
  const filteredTabs = tabs.filter(tab => {
    // Hide cast, trailers, and subtitles for music items
    if (isMusicItem && (tab.id === 'cast' || tab.id === 'trailers' || tab.id === 'subtitles')) {
      return false;
    }
    // Hide trailers and cast for seasons and episodes (only show for shows)
    if (isSeasonOrEpisode && (tab.id === 'trailers' || tab.id === 'cast')) {
      return false;
    }
    // Hide theme tab for non-TV shows
    if (!isTVShow && tab.id === 'theme') {
      return false;
    }
    // Hide music videos tab for non-tracks
    if (!isTrack && tab.id === 'musicvideos') {
      return false;
    }
    return true;
  });

  const handleFieldChange = (field: string, value: any) => {
    setEditedFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const getFieldValue = (field: string, defaultValue: any) => {
    return editedFields[field] !== undefined ? editedFields[field] : defaultValue;
  };

  // Fetch cast & crew from external providers (TMDB for movies, TVDB for TV shows)
  const fetchCastFromExternal = async () => {
    if (!item) return;
    
    setIsFetchingCast(true);
    setCastFetchResult(null);
    
    try {
      const client = createPlexClient({ baseURL: serverUrl, token });
      const tmdbApiKey = import.meta.env['VITE_TMDB_API_KEY'];
      const config: any = {};
      if (tmdbApiKey) config.tmdb = { apiKey: tmdbApiKey };
      
      const providerRegistry = createProviderRegistry(client, config);
      
      // Determine provider based on item type
      const isTV = item.type === 'show' || item.type === 'season' || item.type === 'episode';
      const providerName = isTV ? 'tvdb' : 'tmdb';
      
      if (!providerRegistry.hasProvider(providerName)) {
        setCastFetchResult({ success: false, message: `${providerName.toUpperCase()} provider not available` });
        return;
      }
      
      // Search for the item
      const searchTitle = item.type === 'season' && item.parentTitle 
        ? item.parentTitle 
        : item.type === 'episode' && item.grandparentTitle
        ? item.grandparentTitle
        : item.title;
      
      const mediaType = isTV ? 'show' : 'movie';
      const results = await providerRegistry.search(providerName as any, searchTitle, mediaType as any, item.year);
      
      if (!results || results.length === 0) {
        setCastFetchResult({ success: false, message: `No results found on ${providerName.toUpperCase()}` });
        return;
      }
      
      // Get details from first result
      const externalMetadata = await providerRegistry.getDetails(providerName as any, results[0].externalId);
      
      // Extract cast and crew data
      const cast = externalMetadata.cast?.map(c => ({
        name: c.name,
        character: c.character,
        profilePath: c.profilePath,
      })) || [];
      
      const directors = externalMetadata.crew?.filter(c => c.job === 'Director').map(c => c.name) || [];
      const writers = externalMetadata.crew?.filter(c => c.job === 'Writer' || c.job === 'Screenplay').map(c => c.name) || [];
      
      if (cast.length === 0 && directors.length === 0 && writers.length === 0) {
        setCastFetchResult({ success: false, message: 'No cast/crew data found' });
        return;
      }
      
      // Store fetched data and show review modal
      setFetchedCastData({
        cast,
        directors,
        writers,
        provider: providerName.toUpperCase(),
      });
      setShowCastReviewModal(true);
      
    } catch (error) {
      console.error('[DetailPanel] Failed to fetch cast:', error);
      setCastFetchResult({ 
        success: false, 
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsFetchingCast(false);
    }
  };

  // Save cast & crew to Plex and/or local
  const saveCastAndCrew = async (saveTarget: 'plex' | 'local' | 'both') => {
    if (!item || !fetchedCastData) return;
    
    setIsFetchingCast(true);
    
    try {
      const client = createPlexClient({ baseURL: serverUrl, token });
      
      // Build update object with cast and crew
      const update: MetadataUpdate = {};
      
      if (fetchedCastData.cast.length > 0) {
        update.roles = fetchedCastData.cast.map(c => ({
          tag: c.name,
          role: c.character,
          thumb: c.profilePath,
        }));
      }
      
      if (fetchedCastData.directors.length > 0) update.directors = fetchedCastData.directors;
      if (fetchedCastData.writers.length > 0) update.writers = fetchedCastData.writers;
      
      // Save to Plex
      if (saveTarget === 'plex' || saveTarget === 'both') {
        const metadataManager = createMetadataManager(client);
        await metadataManager.updateMetadata(item.ratingKey, update);
        await refetch();
        queryClient.invalidateQueries({ queryKey: queryKeys.metadata(item.ratingKey) });
      }
      
      // Save locally
      if (saveTarget === 'local' || saveTarget === 'both') {
        // TODO: Implement local metadata save with proper LocalMetadataManager API
        // const metadataManager = createMetadataManager(client);
        // const localMetadataManager = createLocalMetadataManager(metadataManager);
        // await localMetadataManager.syncToLocal(item, 'nfo');
        console.warn('[DetailPanel] Local save not yet implemented for cast data');
      }
      
      const castCount = fetchedCastData.cast.length;
      const directorCount = fetchedCastData.directors.length;
      const writerCount = fetchedCastData.writers.length;
      
      setCastFetchResult({ 
        success: true, 
        message: `Saved ${castCount} cast, ${directorCount} directors, ${writerCount} writers to ${saveTarget}` 
      });
      
      setShowCastReviewModal(false);
      setFetchedCastData(null);
      
    } catch (error) {
      console.error('[DetailPanel] Failed to save cast:', error);
      setCastFetchResult({ 
        success: false, 
        message: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsFetchingCast(false);
    }
  };

  // Calculate height offset based on environment
  // Electron has TitleBar (32px) + ResponsiveLayout header (64px) + LibraryView toolbar (64px) = 160px
  // Browser has ResponsiveLayout header (64px) + LibraryView toolbar (64px) = 128px
  const isElectron = typeof window !== 'undefined' && !!(window as any).electron;
  const heightOffset = isElectron ? 160 : 128;

  return (
    <div className="flex flex-col relative overflow-hidden bg-[#F8FAFC] rounded-xl shadow-lg" style={{ height: `calc(100vh - ${heightOffset}px)` }}>
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value as TabType)}>
      {/* Header section - image area + tabs */}
      <div className="flex flex-col flex-shrink-0">
        {/* Image area with tabs at bottom */}
        <div className="relative overflow-hidden flex-shrink-0 bg-[#0F1419]" style={{ height: '280px' }}>
          {artUrl && (
            <img
              src={artUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover z-0"
              style={{ 
                filter: 'blur(3px)', 
                opacity: 0.5,
                transform: 'scale(1.1)'
              }}
              onLoad={() => console.log('[DetailPanel] Backdrop image loaded successfully')}
              onError={(e) => console.error('[DetailPanel] Backdrop image failed to load:', e)}
            />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70 z-[1]" />

          {/* Content over backdrop */}
          <div className="relative z-10 h-full flex flex-col">
            {/* Top row: status indicators left, action buttons right */}
            <div className="flex items-center justify-between px-5 pt-3">
              {/* Status indicators */}
              <div className="flex items-center gap-2">
                {hasLocalNfo && (
                  <span className="px-2.5 py-1 text-xs font-medium bg-primary-500/90 backdrop-blur-md text-white rounded-full flex items-center gap-1.5 shadow-lg">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                      <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                    </svg>
                    Local NFO
                  </span>
                )}
                {isDirty && (
                  <span className="px-2.5 py-1 text-xs font-medium bg-orange-500/90 backdrop-blur-md text-white rounded-full flex items-center gap-1.5 shadow-lg">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Unsaved
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-lg transition-all"
                    aria-label="Close details"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Poster + Title row */}
            <div className="flex items-start gap-4 px-5 pt-3 flex-1">
              {/* Poster - left side */}
              {posterUrl && (
                <div className={`flex-shrink-0 rounded-lg overflow-hidden shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)] ring-1 ring-white/10 ${
                  isMusicItem ? 'w-[100px] h-[100px]' : 'w-[100px] h-[150px]'
                }`}>
                  <img
                    src={posterUrl}
                    alt={metadata.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title and metadata - right side */}
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="text-xl font-semibold mb-1.5 text-white leading-tight tracking-tight truncate">
                  {metadata.title}
                </h2>
                <div className="flex items-center flex-wrap gap-1.5 text-sm text-gray-300 font-medium mb-2">
                  {metadata.year && <span>{metadata.year}</span>}
                  {metadata.duration && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span>{formatDuration(metadata.duration)}</span>
                    </>
                  )}
                  {metadata.rating && (
                    <>
                      <span className="text-gray-500">•</span>
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>{metadata.rating.toFixed(1)}</span>
                      </div>
                    </>
                  )}
                </div>
                {metadata.Genre && metadata.Genre.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.Genre.slice(0, 3).map((genre: any, index: number) => (
                      <span
                        key={index}
                        className="px-2.5 py-0.5 text-xs font-medium bg-white/10 text-gray-200 rounded-full border border-white/10"
                      >
                        {genre.tag}
                      </span>
                    ))}
                  </div>
                )}
                {/* Media codec badges */}
                {mediaInfo && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {videoResolution && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-black/40 text-gray-200 rounded border border-white/10 uppercase">
                        <svg className="w-3 h-3 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm3 10h8a1 1 0 010 2H5a1 1 0 010-2z" />
                        </svg>
                        {videoResolution === 'sd' ? 'SD' : videoResolution.toUpperCase()}
                      </span>
                    )}
                    {videoCodec && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-black/40 text-gray-200 rounded border border-white/10">
                        <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {videoCodec.toUpperCase()}
                      </span>
                    )}
                    {aspectRatio && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-black/40 text-gray-200 rounded border border-white/10">
                        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                        </svg>
                        {aspectRatio}
                      </span>
                    )}
                    {container && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-black/40 text-gray-200 rounded border border-white/10 uppercase">
                        <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        {container}
                      </span>
                    )}
                    {audioCodec && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-black/40 text-gray-200 rounded border border-white/10 uppercase">
                        <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                        {audioCodec}
                      </span>
                    )}
                    {audioChannels && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-black/40 text-gray-200 rounded border border-white/10">
                        <svg className="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.586v12.828a1 1 0 01-1.707.707L5.586 15z" />
                        </svg>
                        {audioChannels === 1 ? '1.0' : audioChannels === 2 ? '2.0' : audioChannels === 6 ? '5.1' : audioChannels === 8 ? '7.1' : audioChannels}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs - at bottom of dark image area */}
            <div className="px-5 border-b border-white/10 bg-black/30 backdrop-blur-sm flex-shrink-0">
              <TabsList 
                aria-label="Media information tabs"
                className="w-full bg-transparent border-0 p-0 gap-0 rounded-none overflow-x-auto"
              >
                {filteredTabs.map((tab) => (
                  <Tab 
                    key={tab.id} 
                    value={tab.id}
                    className={`text-sm font-semibold whitespace-nowrap px-4 py-3 rounded-none border-b-[3px] transition-all ${
                      activeTab === tab.id 
                        ? 'border-primary-500 text-white' 
                        : 'border-transparent text-gray-300 hover:text-white hover:border-white/30'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </Tab>
                ))}
              </TabsList>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of content with light background */}
      <div className="flex-1 flex flex-col bg-[#F8FAFC] text-gray-900 min-h-0">

        {/* Tab content - Using TabPanel components with smooth transitions */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 bg-[#F8FAFC] pt-3">
          <TabPanel value="details" className="space-y-3">
            {/* Title - Editable */}
            <div className="py-1">
              {isEditing ? (
                <Input
                  label="Title"
                  type="text"
                  value={getFieldValue('title', metadata.title)}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  labelClassName="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/20"
                />
              ) : (
                <>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Title
                  </h4>
                  <p className="text-sm text-gray-900">
                    {metadata.title}
                  </p>
                </>
              )}
            </div>

            {/* Artist - For music items only */}
            {(item.type === 'album' || item.type === 'track') && (
              <div className="py-1">
                {isEditing ? (
                  <Input
                    label="Artist"
                    type="text"
                    value={getFieldValue('artist', item.type === 'track' ? metadata.grandparentTitle : metadata.parentTitle || '')}
                    onChange={(e) => handleFieldChange('artist', e.target.value)}
                    placeholder="Artist name"
                    labelClassName="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                    className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/20"
                  />
                ) : (
                  <>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Artist
                    </h4>
                    <p className="text-sm text-gray-900">
                      {item.type === 'track' ? metadata.grandparentTitle : metadata.parentTitle || 'Unknown Artist'}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Album - For tracks only */}
            {item.type === 'track' && (
              <div className="py-1">
                {isEditing ? (
                  <Input
                    label="Album"
                    type="text"
                    value={getFieldValue('album', metadata.parentTitle || '')}
                    onChange={(e) => handleFieldChange('album', e.target.value)}
                    placeholder="Album name"
                    labelClassName="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                    className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/20"
                  />
                ) : (
                  <>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Album
                    </h4>
                    <p className="text-sm text-gray-900">
                      {metadata.parentTitle || 'Unknown Album'}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Original Title - Editable */}
            {(metadata.originalTitle || isEditing) && (
              <div className="py-1">
                {isEditing ? (
                  <Input
                    label="Original Title"
                    type="text"
                    value={getFieldValue('originalTitle', metadata.originalTitle || '')}
                    onChange={(e) => handleFieldChange('originalTitle', e.target.value)}
                    labelClassName="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                    className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/20"
                  />
                ) : (
                  <>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Original Title
                    </h4>
                    <p className="text-sm text-gray-900">
                      {metadata.originalTitle}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Summary - Editable */}
            {(metadata.summary || isEditing) && (
              <div className="py-1">
                {isEditing ? (
                  <Textarea
                    label="Summary"
                    value={getFieldValue('summary', metadata.summary || '')}
                    onChange={(e) => handleFieldChange('summary', e.target.value)}
                    rows={6}
                    labelClassName="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                    className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/20"
                  />
                ) : (
                  <>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Summary
                    </h4>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {metadata.summary}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Tagline - Editable */}
            {(metadata.tagline || isEditing) && (
              <div className="py-1">
                {isEditing ? (
                  <Input
                    label="Tagline"
                    type="text"
                    value={getFieldValue('tagline', metadata.tagline || '')}
                    onChange={(e) => handleFieldChange('tagline', e.target.value)}
                    labelClassName="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                    className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/20"
                  />
                ) : (
                  <>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Tagline
                    </h4>
                    <p className="text-sm text-gray-900 italic">
                      {metadata.tagline}
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Year - Editable */}
              <div className="py-1">
                {isEditing ? (
                  <Input
                    label="Year"
                    type="number"
                    value={getFieldValue('year', metadata.year || '')}
                    onChange={(e) => handleFieldChange('year', e.target.value)}
                    labelClassName="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                    className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/20"
                  />
                ) : (
                  <>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Year
                    </h4>
                    <p className="text-sm text-gray-900 font-medium">
                      {metadata.year}
                    </p>
                  </>
                )}
              </div>

              {/* Studio - Editable */}
              {(metadata.studio || isEditing) && (
                <div className="py-1">
                  {isEditing ? (
                    <Input
                      label="Studio"
                      type="text"
                      value={getFieldValue('studio', metadata.studio || '')}
                      onChange={(e) => handleFieldChange('studio', e.target.value)}
                      labelClassName="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                      className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/20"
                    />
                  ) : (
                    <>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Studio
                      </h4>
                      <p className="text-sm text-gray-900 font-medium">
                        {metadata.studio}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Content Rating - Editable */}
              {(metadata.contentRating || isEditing) && (
                <div className="py-1">
                  {isEditing ? (
                    <Input
                      label="Rating"
                      type="text"
                      value={getFieldValue('contentRating', metadata.contentRating || '')}
                      onChange={(e) => handleFieldChange('contentRating', e.target.value)}
                      labelClassName="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                      className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/20"
                    />
                  ) : (
                    <>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Rating
                      </h4>
                      <p className="text-sm text-gray-900 font-medium">
                        {metadata.contentRating}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* User Rating - Editable */}
              {(metadata.rating || isEditing) && (
                <div className="py-1">
                  {isEditing ? (
                    <Input
                      label="User Rating"
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={getFieldValue('rating', metadata.rating || '')}
                      onChange={(e) => handleFieldChange('rating', e.target.value)}
                      labelClassName="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                      className="bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/20"
                    />
                  ) : (
                    <>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        User Rating
                      </h4>
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-900">
                          {metadata.rating.toFixed(1)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {metadata.originallyAvailableAt && (
                <div className="py-1">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Release Date
                  </h4>
                  <p className="text-sm text-gray-900 font-medium">
                    {metadata.originallyAvailableAt}
                  </p>
                </div>
              )}

              {metadata.addedAt && (
                <div className="py-1">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Added
                  </h4>
                  <p className="text-sm text-gray-900 font-medium">
                    {formatDate(metadata.addedAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Genres */}
            <div className="py-1">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Genres
              </h4>
              <div className="flex flex-wrap gap-2 items-center">
                {(editedFields.genres !== undefined 
                  ? editedFields.genres 
                  : (metadata.Genre || []).map((g: any) => g.tag)
                ).map((genre: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full border border-gray-200 hover:bg-gray-200 transition-all"
                  >
                    {genre}
                    <button
                      onClick={() => {
                        const currentGenres = editedFields.genres !== undefined 
                          ? editedFields.genres 
                          : (metadata.Genre || []).map((g: any) => g.tag);
                        const newGenres = currentGenres.filter((_: string, i: number) => i !== index);
                        handleFieldChange('genres', newGenres);
                      }}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-gray-300 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Add genre..."
                  className="px-3 py-1.5 text-sm bg-transparent border border-dashed border-gray-300 rounded-full focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 min-w-[100px] max-w-[150px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const value = input.value.trim();
                      if (value) {
                        const currentGenres = editedFields.genres !== undefined 
                          ? editedFields.genres 
                          : (metadata.Genre || []).map((g: any) => g.tag);
                        if (!currentGenres.includes(value)) {
                          handleFieldChange('genres', [...currentGenres, value]);
                        }
                        input.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
          </TabPanel>

          <TabPanel value="cast" className="space-y-5">
            {/* Fetch Cast & Crew Button */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="medium"
                onClick={fetchCastFromExternal}
                disabled={isFetchingCast}
                icon={
                  isFetchingCast ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : undefined
                }
              >
                {isFetchingCast ? 'Fetching...' : 'Fetch Cast & Crew'}
              </Button>
              {castFetchResult && (
                <span className={`text-xs ${castFetchResult.success ? 'text-green-600' : 'text-red-500'}`}>
                  {castFetchResult.message}
                </span>
              )}
            </div>

            {metadata.Role && metadata.Role.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-3">
                  Cast
                </h4>
                <div className="space-y-2">
                  {metadata.Role.map((person: any, index: number) => {
                    // Construct proper image URL - Plex actor thumbs need special handling
                    const getActorImageUrl = (thumb: string) => {
                      if (!thumb) return null;
                      
                      // If it's already a full URL (starts with http), use it directly
                      if (thumb.startsWith('http')) {
                        return thumb;
                      }
                      
                      // If it's a Plex path, construct the full URL
                      // Actor images are usually served through the photo transcoder
                      const encodedThumb = encodeURIComponent(thumb);
                      return `${serverUrl}/photo/:/transcode?url=${encodedThumb}&width=200&height=200&X-Plex-Token=${token}`;
                    };
                    
                    const imageUrl = person.thumb ? getActorImageUrl(person.thumb) : null;
                    
                    return (
                      <div key={index} className="flex items-center gap-3">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={person.tag}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              const target = e.target as HTMLImageElement;
                              // Prevent infinite loop
                              if (!target.dataset.fallback) {
                                target.dataset.fallback = 'true';
                                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23999"%3E%3Cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/%3E%3C/svg%3E';
                              }
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-secondary-200 dark:bg-secondary-700 flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-secondary-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-secondary-900 dark:text-secondary-50 truncate">
                            {person.tag}
                          </p>
                          {person.role && (
                            <p className="text-xs text-secondary-600 dark:text-secondary-400 truncate">
                              as {person.role}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {metadata.Director && metadata.Director.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Director
                </h4>
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  {metadata.Director.map((d: any) => d.tag).join(', ')}
                </p>
              </div>
            )}

            {metadata.Writer && metadata.Writer.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Writer
                </h4>
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  {metadata.Writer.map((w: any) => w.tag).join(', ')}
                </p>
              </div>
            )}
          </TabPanel>

          <TabPanel value="images" className="space-y-6">
            {/* Search Images Button - top */}
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="medium"
                onClick={() => setShowImageSearchModal(true)}
              >
                Search Images
              </Button>
            </div>

            {/* Poster */}
            <div className="py-1">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Poster
                </h4>
                {isEditing && (
                  <label className="cursor-pointer">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {}}
                    >
                      Upload New
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file && item) {
                          const client = createPlexClient({ baseURL: serverUrl, token });
                          const manager = createMetadataManager(client);
                          await manager.uploadArtwork(item.ratingKey, file, 'poster');
                          refetch();
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              {posterUrl && (
                <div className="flex justify-start">
                  <img 
                    src={posterUrl} 
                    alt="Poster" 
                    className={`rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:scale-105 transition-all object-cover ${
                      metadata.type === 'artist' || metadata.type === 'album' || metadata.type === 'track' ? 'w-32 h-32' : 'w-32 h-48'
                    }`}
                    onClick={() => window.open(posterUrl, '_blank')}
                    title="Click to view full size"
                  />
                </div>
              )}
            </div>

            {/* Background */}
            <div className="py-1">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Background
                </h4>
                {isEditing && (
                  <label className="cursor-pointer">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {}}
                    >
                      Upload New
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file && item) {
                          const client = createPlexClient({ baseURL: serverUrl, token });
                          const manager = createMetadataManager(client);
                          await manager.uploadArtwork(item.ratingKey, file, 'background');
                          refetch();
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              {artUrl && (
                <div className="flex justify-start">
                  <img 
                    src={artUrl} 
                    alt="Background" 
                    className="w-64 h-36 rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:scale-105 transition-all object-cover"
                    onClick={() => window.open(artUrl, '_blank')}
                    title="Click to view full size"
                  />
                </div>
              )}
            </div>
          </TabPanel>

          <TabPanel value="trailers" className="space-y-5">
            {/* Add trailer buttons - at top */}
            {isEditing && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="medium"
                  onClick={() => {
                    const metadata = fullMetadata?.MediaContainer?.Metadata?.[0];
                    
                    // For TV shows, get the directory path from Location
                    // For movies/episodes, get the file path from Media
                    let mediaPath: string | null = null;
                    
                    if (item.type === 'show') {
                      // TV shows have a Location array with directory paths
                      mediaPath = metadata?.Location?.[0]?.path || null;
                    } else if (item.type === 'season') {
                      // Seasons also use Location
                      mediaPath = metadata?.Location?.[0]?.path || null;
                    } else {
                      // Movies and episodes have file paths
                      mediaPath = metadata?.Media?.[0]?.Part?.[0]?.file || null;
                    }
                    
                    if (!mediaPath) {
                      alert('Cannot find media path. Please ensure the item has a valid media location.');
                      return;
                    }
                    
                    setShowTrailerSearch(true);
                  }}
                >
                  Search Trailers
                </Button>
                <Button
                  variant="secondary"
                  size="medium"
                >
                  Add Trailer URL
                </Button>
              </div>
            )}

            {/* Plex Trailers Section */}
            {metadata.Extras && metadata.Extras.filter((extra: any) => extra.type === 'clip' && extra.extraType === 1).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  Plex Trailers
                </h4>
                <div className="space-y-3">
                  {metadata.Extras.filter((extra: any) => extra.type === 'clip' && extra.extraType === 1).map((trailer: any, index: number) => (
                    <div key={`plex-${index}`} className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4 bg-primary-50 dark:bg-primary-900/10">
                      <div className="flex items-start gap-3">
                        {trailer.thumb && (
                          <img
                            src={`${serverUrl}${trailer.thumb}?X-Plex-Token=${token}`}
                            alt={trailer.title}
                            className="w-32 h-20 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-1">
                            {trailer.title}
                          </h5>
                          {trailer.summary && (
                            <p className="text-xs text-secondary-600 dark:text-secondary-400 mb-2">
                              {trailer.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400">
                            <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                              Plex
                            </span>
                            {trailer.duration && (
                              <span>{formatDuration(trailer.duration)}</span>
                            )}
                          </div>
                          {/* Show what Plex would play */}
                          {trailer.Media?.[0]?.Part?.[0]?.key && (
                            <div className="mt-2 text-xs text-secondary-500 dark:text-secondary-400">
                              <span className="font-semibold">Plays:</span> {trailer.Media[0].Part[0].key}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="icon"
                          size="medium"
                          onClick={() => {
                            // Play trailer logic
                            const trailerUrl = `${serverUrl}${trailer.Media?.[0]?.Part?.[0]?.key}?X-Plex-Token=${token}`;
                            window.open(trailerUrl, '_blank');
                          }}
                          icon={
                            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          }
                          title="Play trailer"
                          aria-label="Play trailer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Local Trailers Section */}
            {localTrailers.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                    <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                  </svg>
                  Local Trailers
                </h4>
                <div className="space-y-3">
                  {localTrailers.map((trailerPath, index) => {
                    const filename = trailerPath.substring(Math.max(trailerPath.lastIndexOf('/'), trailerPath.lastIndexOf('\\')) + 1);
                    
                    // Try to detect resolution from filename
                    // Look for patterns like: 1080p, 720p, 2160p, 4K, etc.
                    const resolutionMatch = filename.match(/(\d{3,4}p|4K|8K)/i);
                    const resolution = resolutionMatch ? resolutionMatch[0].toUpperCase() : null;
                    
                    return (
                      <div key={`local-${index}`} className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
                        <div className="flex items-start gap-3">
                          <div className="w-32 h-20 bg-secondary-200 dark:bg-secondary-700 rounded flex items-center justify-center flex-shrink-0">
                            <svg className="w-8 h-8 text-secondary-400 dark:text-secondary-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-1">
                              {filename}
                            </h5>
                            <p className="text-xs text-secondary-600 dark:text-secondary-400 mb-2 font-mono break-all">
                              {trailerPath}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                                  <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                                </svg>
                                Local File
                              </span>
                              {resolution && (
                                <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded font-semibold">
                                  {resolution}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="icon"
                            size="medium"
                            onClick={() => {
                              // Open local file with default application
                              if (window.electron) {
                                window.electron.openFile(trailerPath);
                              }
                            }}
                            icon={
                              <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                              </svg>
                            }
                            title="Play trailer"
                            aria-label="Play trailer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No trailers found */}
            {(!metadata.Extras || metadata.Extras.filter((extra: any) => extra.type === 'clip' && extra.extraType === 1).length === 0) && localTrailers.length === 0 && (
              <div className="text-center py-8 text-secondary-500 dark:text-secondary-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">No trailers available</p>
                <p className="text-xs mt-1">Local trailers should be named with "-trailer" suffix</p>
              </div>
            )}
          </TabPanel>

          <TabPanel value="subtitles" className="space-y-5">
            {/* Search subtitles button - at top */}
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="medium"
                onClick={() => {
                  // Check if we have media file path
                  const mediaFilePath = fullMetadata?.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.file;
                  if (!mediaFilePath) {
                    alert('Media file path not found');
                    return;
                  }
                  setShowSubtitleSearchModal(true);
                }}
              >
                Search for Subtitles
              </Button>
            </div>

            {/* Plex/Embedded Subtitles Section */}
            {plexSubtitles.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    Embedded Subtitles
                  </h4>
                  {selectedSubtitlesForRemoval.size > 0 && (
                    <Button
                      variant="primary"
                      size="small"
                      onClick={async () => {
                        if (confirm(`Remove ${selectedSubtitlesForRemoval.size} selected subtitle(s)? This will modify the video file. A backup will be created.`)) {
                          try {
                            const ffmpegManager = createFFmpegManager();
                            const mediaFilePath = fullMetadata?.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.file;                            
                            if (!mediaFilePath) {
                              alert('Media file path not found');
                              return;
                            }
                            
                            // Convert selected IDs to streamIndex values
                            const indicesToRemove: number[] = [];
                            plexSubtitles.forEach(subtitle => {
                              if (selectedSubtitlesForRemoval.has(subtitle.id) && subtitle.streamIndex !== undefined) {
                                indicesToRemove.push(subtitle.streamIndex);
                              }
                            });
                            
                            if (indicesToRemove.length === 0) {
                              alert('No valid subtitle streams selected');
                              return;
                            }
                            
                            // Remove subtitles
                            await ffmpegManager.removeSubtitles(
                              mediaFilePath,
                              {
                                createBackup: true,
                                streamIndices: indicesToRemove,
                              }
                            );
                            
                            alert(`${selectedSubtitlesForRemoval.size} subtitle(s) removed successfully. A backup was created.`);
                            
                            // Clear selection
                            setSelectedSubtitlesForRemoval(new Set());
                            
                            // Refresh metadata
                            await refetch();
                          } catch (error) {
                            console.error('Error removing subtitles:', error);
                            alert(`Failed to remove subtitles: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThe file may be in use by Plex or another application. Try stopping Plex Media Server temporarily.`);
                          }
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Remove Selected ({selectedSubtitlesForRemoval.size})
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {plexSubtitles.map((subtitle, index) => (
                    <div key={`plex-${index}`} className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4 bg-primary-50 dark:bg-primary-900/10">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedSubtitlesForRemoval.has(subtitle.id)}
                          onChange={(e) => {
                            const newSelection = new Set(selectedSubtitlesForRemoval);
                            if (e.target.checked) {
                              newSelection.add(subtitle.id);
                            } else {
                              newSelection.delete(subtitle.id);
                            }
                            setSelectedSubtitlesForRemoval(newSelection);
                          }}
                          className="mt-1 w-4 h-4 accent-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                        />
                        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-1">
                            {subtitle.language}
                          </h5>
                          <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                            <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
                              {subtitle.codec.toUpperCase()}
                            </span>
                            {subtitle.external && (
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                                External
                              </span>
                            )}
                            {!subtitle.external && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                                Embedded
                              </span>
                            )}
                            {subtitle.forced && (
                              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded">
                                Forced
                              </span>
                            )}
                            {subtitle.selected && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-secondary-600 dark:text-secondary-400">
                            Language Code: {subtitle.languageCode}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {!subtitle.external && (
                            <Button
                              variant="icon"
                              size="medium"
                              onClick={async () => {
                                if (confirm(`Extract subtitle: ${subtitle.language}?`)) {
                                  try {
                                    const ffmpegManager = createFFmpegManager();
                                    const mediaFilePath = fullMetadata?.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.file;
                                    
                                    if (!mediaFilePath) {
                                      alert('Media file path not found');
                                      return;
                                    }
                                    
                                    // Use streamIndex instead of id for FFmpeg
                                    const subtitleStreamIndex = subtitle.streamIndex !== undefined ? subtitle.streamIndex : 0;
                                    
                                    // Extract subtitle with Plex naming convention
                                    const outputPath = await ffmpegManager.extractSubtitle(
                                      mediaFilePath,
                                      subtitleStreamIndex,
                                      { 
                                        outputFormat: 'srt',
                                        languageCode: subtitle.languageCode || 'und',
                                        forced: subtitle.forced || false
                                      }
                                    );
                                    
                                    alert(`Subtitle extracted successfully to: ${outputPath}`);
                                    
                                    // Refresh subtitle list
                                    const subtitleManager = createSubtitleManager();
                                    const updatedSubtitles = await subtitleManager.scanSubtitles(mediaFilePath);
                                    setLocalSubtitles(updatedSubtitles);
                                  } catch (error) {
                                    console.error('Error extracting subtitle:', error);
                                    alert(`Failed to extract subtitle: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                  }
                                }
                              }}
                              icon={
                                <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              }
                              title="Extract subtitle"
                              aria-label="Extract subtitle"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Local Subtitles Section */}
            {localSubtitles.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                    <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                  </svg>
                  Local Subtitle Files
                </h4>
                <div className="space-y-3">
                  {localSubtitles.map((subtitle, index) => (
                    <div key={`local-${index}`} className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-1">
                            {subtitle.fileName}
                          </h5>
                          <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                              {subtitle.language}
                            </span>
                            <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
                              {subtitle.format.toUpperCase()}
                            </span>
                            {subtitle.forced && (
                              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded">
                                Forced
                              </span>
                            )}
                            {subtitle.size > 0 && (
                              <span className="text-secondary-500 dark:text-secondary-400">
                                {(subtitle.size / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-secondary-600 dark:text-secondary-400 font-mono break-all">
                            {subtitle.path}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="icon"
                            size="medium"
                            onClick={async () => {
                              if (confirm(`Embed subtitle: ${subtitle.fileName}? This will modify the video file.`)) {
                                try {
                                  const ffmpegManager = createFFmpegManager();
                                  const mediaFilePath = fullMetadata?.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.file;
                                  
                                  if (!mediaFilePath) {
                                    alert('Media file path not found');
                                    return;
                                  }
                                  
                                  // Embed subtitle
                                  await ffmpegManager.embedSubtitle(
                                    mediaFilePath,
                                    subtitle.path,
                                    {
                                      language: subtitle.language,
                                      languageCode: subtitle.languageCode,
                                      title: subtitle.fileName,
                                      forced: subtitle.forced,
                                      default: false,
                                      codec: 'copy',
                                    }
                                  );
                                  
                                  alert('Subtitle embedded successfully.');
                                  
                                  // Refresh metadata
                                  await refetch();
                                } catch (error) {
                                  console.error('Error embedding subtitle:', error);
                                  alert(`Failed to embed subtitle: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                }
                              }
                            }}
                            title="Embed into video"
                            icon={
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 1 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            }
                          />
                          <Button
                            variant="icon"
                            size="medium"
                            onClick={async () => {
                              if (confirm(`Delete subtitle file: ${subtitle.fileName}?`)) {
                                try {
                                  const subtitleManager = createSubtitleManager();
                                  await subtitleManager.deleteSubtitle(subtitle.path);
                                  // Refresh subtitle list
                                  const mediaFilePath = fullMetadata?.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.file;
                                  if (mediaFilePath) {
                                    const updatedSubtitles = await subtitleManager.scanSubtitles(mediaFilePath);
                                    setLocalSubtitles(updatedSubtitles);
                                  }
                                } catch (error) {
                                  console.error('Error deleting subtitle:', error);
                                  alert('Failed to delete subtitle file');
                                }
                              }
                            }}
                            title="Delete subtitle file"
                            className="hover:bg-red-100 dark:hover:bg-red-900/20"
                            icon={
                              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No subtitles found */}
            {plexSubtitles.length === 0 && localSubtitles.length === 0 && (
              <div className="text-center py-8 text-secondary-500 dark:text-secondary-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <p className="text-sm">No subtitles available</p>
                <p className="text-xs mt-1">Search for subtitles or add local subtitle files</p>
              </div>
            )}
        </TabPanel>

        <TabPanel value="musicvideos" className="space-y-5">
          <div className="space-y-4">
            {/* Music Videos from Plex */}
            {localMusicVideos.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Music Videos ({localMusicVideos.length})
                </h4>
                <div className="space-y-2">
                  {localMusicVideos.map((video) => {
                    const fileName = video.file ? video.file.substring(Math.max(video.file.lastIndexOf('/'), video.file.lastIndexOf('\\')) + 1) : video.title;
                    const thumbnailUrl = video.thumb ? `${serverUrl}${video.thumb}?X-Plex-Token=${token}` : null;
                    
                    return (
                      <div
                        key={video.ratingKey}
                        className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-750 transition-colors"
                      >
                        {/* Thumbnail */}
                        {thumbnailUrl && (
                          <img
                            src={thumbnailUrl}
                            alt={video.title}
                            className="w-24 h-16 object-cover rounded flex-shrink-0"
                          />
                        )}
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-secondary-900 dark:text-secondary-50 truncate">
                            {video.title}
                          </p>
                          {video.duration && (
                            <p className="text-xs text-secondary-500 dark:text-secondary-400">
                              {formatDuration(video.duration)}
                            </p>
                          )}
                          {video.file && (
                            <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                              {fileName}
                            </p>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="icon"
                            size="medium"
                            onClick={async () => {
                              if (video.file && window.electron) {
                                try {
                                  await window.electron.openFile(video.file);
                                } catch (error) {
                                  console.error('Error playing music video:', error);
                                  alert('Failed to play music video');
                                }
                              }
                            }}
                            title="Play music video"
                            disabled={!video.file}
                            icon={
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            }
                          />
                          <Button
                            variant="icon"
                            size="medium"
                            onClick={async () => {
                              if (!video.file) {
                                alert('Cannot delete: file path not available');
                                return;
                              }
                              
                              if (!window.electron) {
                                alert('File deletion is only available in the desktop app');
                                return;
                              }
                              
                              if (confirm(`Delete music video: ${video.title}?`)) {
                                try {
                                  await window.electron.deleteFile(video.file);
                                  // Refresh music video list from Plex
                                  const client = createPlexClient({ baseURL: serverUrl, token });
                                  const response = await client.get(`/library/metadata/${item.ratingKey}/related`);
                                  const hubs = response.MediaContainer?.Hub || [];
                                  const musicVideoHub = hubs.find((hub: any) => 
                                    hub.type === 'clip' || hub.hubIdentifier === 'extras' || hub.title?.toLowerCase().includes('video')
                                  );
                                  if (musicVideoHub && musicVideoHub.Metadata) {
                                    const videos = musicVideoHub.Metadata.map((v: any) => ({
                                      ratingKey: v.ratingKey,
                                      key: v.key,
                                      title: v.title,
                                      thumb: v.thumb,
                                      duration: v.duration,
                                      file: v.Media?.[0]?.Part?.[0]?.file,
                                    }));
                                    setLocalMusicVideos(videos);
                                  } else {
                                    setLocalMusicVideos([]);
                                  }
                                } catch (error) {
                                  console.error('Error deleting music video:', error);
                                  alert('Failed to delete music video file');
                                }
                              }
                            }}
                            className="hover:bg-red-100 dark:hover:bg-red-900/20"
                            title="Delete music video file"
                            disabled={!video.file}
                            icon={
                              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No music videos found */}
            {localMusicVideos.length === 0 && (
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto mb-4 text-secondary-400 dark:text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-lg text-secondary-600 dark:text-secondary-400 mb-4">
                  No music videos found
                </p>
                <p className="text-sm text-secondary-500 dark:text-secondary-500 mb-6">
                  Music videos will be saved with the same naming as the audio file
                </p>
              </div>
            )}

            {/* Search music videos button */}
            <Button
              variant="secondary"
              size="medium"
              onClick={() => {
                // Check if we have media file path
                const mediaFilePath = fullMetadata?.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.file;
                if (!mediaFilePath) {
                  alert('Media file path not found');
                  return;
                }
                setShowMusicVideoSearch(true);
              }}
              className="w-full"
            >
              Search for Music Videos
            </Button>
          </div>
        </TabPanel>

        <TabPanel value="theme" className="space-y-6">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-secondary-900 dark:text-secondary-50 mb-4">
                Theme Music
              </h3>
              
              {metadata.theme ? (
                <div className="space-y-4">
                  <div className="bg-secondary-100 dark:bg-secondary-800 rounded-lg p-6">
                    <audio 
                      controls 
                      className="w-full"
                      src={`${serverUrl}${metadata.theme}?X-Plex-Token=${token}`}
                      style={{ maxWidth: '600px', margin: '0 auto' }}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                  
                  {isEditing && (
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="primary"
                        size="medium"
                        onClick={async () => {
                          if (!window.electron?.selectFile) {
                            alert('File selection is only available in desktop app');
                            return;
                          }
                          
                          try {
                            const filePath = await window.electron.selectFile({
                              filters: [
                                { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }
                              ]
                            });
                            
                            if (filePath) {
                              // Get show directory
                              const showPath = metadata.Location?.[0]?.path;
                              if (!showPath) {
                                alert('Cannot determine show directory');
                                return;
                              }
                              
                              // Copy file to show directory as theme.mp3
                              const targetPath = `${showPath}\\theme.mp3`;
                              await window.electron.copyFile(filePath, targetPath);
                              
                              // Update metadata to point to local theme
                              handleFieldChange('theme', '/library/metadata/' + item.ratingKey + '/theme');
                              
                              alert('Theme music added successfully!');
                            }
                          } catch (error) {
                            console.error('Failed to add local theme:', error);
                            alert('Failed to add local theme: ' + (error instanceof Error ? error.message : 'Unknown error'));
                          }
                        }}
                        icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        }
                      >
                        Add Local Theme
                      </Button>
                      <Button
                        variant="secondary"
                        size="medium"
                        onClick={async () => {
                          if (!window.electron?.downloadFile) {
                            alert('File download is only available in desktop app');
                            return;
                          }
                          
                          try {
                            // Get show directory
                            const showPath = metadata.Location?.[0]?.path;
                            if (!showPath) {
                              alert('Cannot determine show directory');
                              return;
                            }
                            
                            // Download Plex theme to show directory
                            const themeUrl = `${serverUrl}${metadata.theme}?X-Plex-Token=${token}`;
                            const targetPath = `${showPath}\\theme.mp3`;
                            
                            await window.electron.downloadFile(themeUrl, targetPath);
                            
                            alert('Plex theme downloaded successfully to show folder!');
                          } catch (error) {
                            console.error('Failed to download Plex theme:', error);
                            alert('Failed to download Plex theme: ' + (error instanceof Error ? error.message : 'Unknown error'));
                          }
                        }}
                        icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        }
                      >
                        Download Plex Theme
                      </Button>
                      <Button
                        variant="secondary"
                        size="medium"
                        onClick={() => {
                          if (confirm('Remove theme music?')) {
                            handleFieldChange('theme', '');
                          }
                        }}
                        className="hover:bg-red-100 dark:hover:bg-red-900/20 hover:border-red-500"
                        icon={
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        }
                      >
                        Remove Theme
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-secondary-50 dark:bg-secondary-800 rounded-lg p-12 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-secondary-400 dark:text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-lg text-secondary-600 dark:text-secondary-400 mb-4">
                    No theme music available
                  </p>
                  <p className="text-sm text-secondary-500 dark:text-secondary-500 mb-6">
                    Theme music is automatically provided by Plex for many popular TV shows.
                  </p>
                  {isEditing && (
                    <button
                      onClick={async () => {
                        if (!window.electron?.selectFile) {
                          alert('File selection is only available in desktop app');
                          return;
                        }
                        
                        try {
                          const filePath = await window.electron.selectFile({
                            filters: [
                              { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }
                            ]
                          });
                          
                          if (filePath) {
                            // Get show directory
                            const showPath = metadata.Location?.[0]?.path;
                            if (!showPath) {
                              alert('Cannot determine show directory');
                              return;
                            }
                            
                            // Copy file to show directory as theme.mp3
                            const targetPath = `${showPath}\\theme.mp3`;
                            await window.electron.copyFile(filePath, targetPath);
                            
                            // Update metadata to point to local theme
                            handleFieldChange('theme', '/library/metadata/' + item.ratingKey + '/theme');
                            
                            alert('Theme music added successfully!');
                          }
                        } catch (error) {
                          console.error('Failed to add local theme:', error);
                          alert('Failed to add local theme: ' + (error instanceof Error ? error.message : 'Unknown error'));
                        }
                      }}
                      className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Add Local Theme Music
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabPanel>

        <TabPanel value="files" className="space-y-5">
          <div className="space-y-4">
            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              {/* Open Media Folder button */}
              {(metadata.Media?.[0]?.Part?.[0]?.file || metadata.Location?.[0]?.path || (isAlbum && albumTracks.length > 0 && albumTracks[0].Media?.[0]?.Part?.[0]?.file)) && (
                <Button
                  variant="secondary"
                  size="medium"
                  onClick={async () => {
                    let folderPath: string;
                    
                    if (isAlbum && albumTracks.length > 0 && albumTracks[0].Media?.[0]?.Part?.[0]?.file) {
                      // For albums - extract folder from first track's file path
                      const filePath = albumTracks[0].Media[0].Part[0].file;
                      folderPath = filePath.substring(0, Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/')));
                    } else if (metadata.Media?.[0]?.Part?.[0]?.file) {
                      // For movies, episodes and tracks - extract folder from file path
                      const filePath = metadata.Media[0].Part[0].file;
                      folderPath = filePath.substring(0, Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/')));
                    } else if (metadata.Location?.[0]?.path) {
                      // For TV shows and seasons - use directory path directly
                      folderPath = metadata.Location[0].path;
                    } else {
                      alert('Cannot determine media folder path.');
                      return;
                    }
                    
                    try {
                      if (!window.electron) {
                        alert('Opening folders is only available in the desktop app');
                        return;
                      }
                      await window.electron.openFolder(folderPath);
                    } catch (error) {
                      console.error('Failed to open folder:', error);
                      alert('Failed to open media folder. Please check if the path exists.');
                    }
                  }}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  }
                >
                  Open Media Folder
                </Button>
              )}
              
              {/* Rescan button */}
              <Button
                variant="primary"
                size="medium"
                onClick={async () => {
                  if (!item) return;
                  try {
                    const client = createPlexClient({ baseURL: serverUrl, token });
                    const manager = createMetadataManager(client);
                    
                    await manager.refreshMetadata(item.ratingKey);
                    
                    // Wait a moment for Plex to process
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Refetch metadata after refresh
                    await refetch();
                  } catch (error) {
                    console.error('Failed to refresh metadata:', error);
                    alert('Failed to rescan media info. Please try again.');
                  }
                }}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }
              >
                Rescan Media Info
              </Button>
            </div>

            {/* Determine media items to display */}
            {(() => {
              // For albums, display each track's media info
              const mediaItems: Array<{ media: any; label?: string }> = [];
              
              if (isAlbum && albumTracks.length > 0) {
                albumTracks.forEach((track: any) => {
                  if (track.Media) {
                    track.Media.forEach((media: any) => {
                      mediaItems.push({ media, label: track.title || `Track ${track.index}` });
                    });
                  }
                });
              } else if (metadata.Media) {
                metadata.Media.forEach((media: any) => {
                  mediaItems.push({ media });
                });
              }
              
              if (mediaItems.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">No media info available.</p>
                    <p className="text-xs mt-1">Click "Rescan Media Info" to extract file details from Plex.</p>
                  </div>
                );
              }
              
              return mediaItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h5 className="text-sm font-semibold text-gray-800 mb-3">
                    {item.label ? `${item.label}` : `Media Stream ${mediaItems.length > 1 ? `#${index + 1}` : ''}`}
                  </h5>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Container:</span>
                      <span className="ml-2 text-gray-900 font-medium">
                        {item.media.container?.toUpperCase() || 'Unknown'}
                      </span>
                    </div>
                    {item.media.videoCodec && (
                      <div>
                        <span className="text-gray-500">Video Codec:</span>
                        <span className="ml-2 text-gray-900 font-medium">
                          {item.media.videoCodec?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {item.media.videoResolution && (
                      <div>
                        <span className="text-gray-500">Resolution:</span>
                        <span className="ml-2 text-gray-900 font-medium">
                          {item.media.videoResolution ? `${item.media.videoResolution}p` : `${item.media.width}x${item.media.height}`}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Audio Codec:</span>
                      <span className="ml-2 text-gray-900 font-medium">
                        {item.media.audioCodec?.toUpperCase() || 'Unknown'}
                      </span>
                    </div>
                    {item.media.bitrate && (
                      <div>
                        <span className="text-gray-500">Bitrate:</span>
                        <span className="ml-2 text-gray-900 font-medium">
                          {item.media.bitrate >= 1000 
                            ? `${(item.media.bitrate / 1000).toFixed(1)} Mbps`
                            : `${item.media.bitrate} kbps`
                          }
                        </span>
                      </div>
                    )}
                    {item.media.audioChannels && (
                      <div>
                        <span className="text-gray-500">Audio Channels:</span>
                        <span className="ml-2 text-gray-900 font-medium">
                          {item.media.audioChannels === 6 ? '5.1' : item.media.audioChannels === 8 ? '7.1' : item.media.audioChannels}
                        </span>
                      </div>
                    )}
                    {item.media.aspectRatio && (
                      <div>
                        <span className="text-gray-500">Aspect Ratio:</span>
                        <span className="ml-2 text-gray-900 font-medium">
                          {item.media.aspectRatio}
                        </span>
                      </div>
                    )}
                    {item.media.videoFrameRate && (
                      <div>
                        <span className="text-gray-500">Frame Rate:</span>
                        <span className="ml-2 text-gray-900 font-medium">
                          {item.media.videoFrameRate} fps
                        </span>
                      </div>
                    )}
                  </div>
                  {item.media.Part && item.media.Part.map((part: any, partIndex: number) => (
                    <div key={partIndex} className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 mb-1">File:</p>
                      <p className="text-xs text-gray-800 font-mono break-all bg-gray-50 p-2 rounded">
                        {part.file}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        {part.size && (
                          <div>
                            <span className="text-gray-500">Size:</span>
                            <span className="ml-2 text-gray-900 font-medium">
                              {part.size >= 1024 * 1024 * 1024
                                ? `${(part.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
                                : `${(part.size / (1024 * 1024)).toFixed(1)} MB`
                              }
                            </span>
                          </div>
                        )}
                        {part.duration && (
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <span className="ml-2 text-gray-900 font-medium">
                              {formatDuration(part.duration)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        </TabPanel>
      </div>

      {/* Modals and remaining content below */}
      {showRefreshModal && item && (
        <MetadataRefreshModal
          items={[item]}
          serverUrl={serverUrl}
          token={token}
          onClose={() => setShowRefreshModal(false)}
          onComplete={() => {
            refetch();
            setShowRefreshModal(false);
          }}
        />
      )}

      {/* Subtitle Search Modal */}
      {showSubtitleSearchModal && item && fullMetadata?.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.file && (
        <SubtitleSearchModal
          item={item}
          mediaFilePath={fullMetadata.MediaContainer.Metadata[0].Media[0].Part[0].file}
          onClose={() => setShowSubtitleSearchModal(false)}
          onSubtitleAdded={async () => {
            // Refresh subtitle list
            const mediaFilePath = fullMetadata.MediaContainer.Metadata[0].Media[0].Part[0].file;
            const subtitleManager = createSubtitleManager();
            const updatedSubtitles = await subtitleManager.scanSubtitles(mediaFilePath);
            setLocalSubtitles(updatedSubtitles);
          }}
        />
      )}

      {/* Trailer Search Modal */}
      {showTrailerSearch && item && fullMetadata?.MediaContainer?.Metadata?.[0] && (() => {
        const metadata = fullMetadata.MediaContainer.Metadata[0];
        
        // Get media path based on item type
        let mediaPath: string | null = null;
        
        if (item.type === 'show' || item.type === 'season') {
          // TV shows and seasons use Location directory path
          mediaPath = metadata.Location?.[0]?.path || null;
        } else {
          // Movies and episodes use Media file path
          mediaPath = metadata.Media?.[0]?.Part?.[0]?.file || null;
        }
        
        if (!mediaPath) return null;
        
        return (
          <TrailerSearchModal
            isOpen={showTrailerSearch}
            onClose={() => setShowTrailerSearch(false)}
            movieTitle={item.title}
            movieYear={item.year}
            mediaFilePath={mediaPath}
            onTrailerDownloaded={async () => {
              // Refresh trailer list
              if (window.electron?.scanForTrailers) {
                try {
                  let directory: string;
                  let baseFilename: string;
                  
                  if (item.type === 'show' || item.type === 'season') {
                    // For TV shows/seasons, mediaPath is already a directory
                    directory = mediaPath;
                    baseFilename = item.title; // Use show title as base
                  } else {
                    // For movies/episodes, extract directory and filename from file path
                    directory = mediaPath.substring(0, Math.max(mediaPath.lastIndexOf('/'), mediaPath.lastIndexOf('\\')));
                    baseFilename = mediaPath.substring(Math.max(mediaPath.lastIndexOf('/'), mediaPath.lastIndexOf('\\')) + 1, mediaPath.lastIndexOf('.'));
                  }
                  
                  const foundTrailers = await window.electron.scanForTrailers(directory, baseFilename);
                  setLocalTrailers(foundTrailers || []);
                } catch (error) {
                  console.error('Error scanning for trailers:', error);
                }
              }
            }}
          />
        );
      })()}

      {/* Image Search Modal */}
      {showImageSearchModal && item && (
        <ImageSearchModal
          item={item}
          serverUrl={serverUrl}
          token={token}
          onClose={() => setShowImageSearchModal(false)}
          onImageSelected={() => {
            // Refresh metadata to show new image
            refetch();
          }}
        />
      )}

      {/* Cast & Crew Review Modal */}
      {showCastReviewModal && fetchedCastData && (
        <Modal
          isOpen={showCastReviewModal}
          onClose={() => {
            setShowCastReviewModal(false);
            setFetchedCastData(null);
          }}
          title="Review Cast & Crew"
          maxWidth="lg"
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Found from {fetchedCastData.provider}. Review and select what to import.
            </p>

            {/* Cast Section */}
            {fetchedCastData.cast.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Cast ({fetchedCastData.cast.length})
                </h4>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {fetchedCastData.cast.slice(0, 20).map((person, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-secondary-50 dark:bg-secondary-800 rounded">
                      {person.profilePath ? (
                        <img
                          src={person.profilePath}
                          alt={person.name}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-secondary-200 dark:bg-secondary-700 flex items-center justify-center">
                          <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-secondary-900 dark:text-secondary-50 truncate">{person.name}</p>
                        {person.character && (
                          <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">as {person.character}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {fetchedCastData.cast.length > 20 && (
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                    ... and {fetchedCastData.cast.length - 20} more
                  </p>
                )}
              </div>
            )}

            {/* Directors Section */}
            {fetchedCastData.directors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Directors ({fetchedCastData.directors.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {fetchedCastData.directors.map((director, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-200 rounded">
                      {director}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Writers Section */}
            {fetchedCastData.writers.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Writers ({fetchedCastData.writers.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {fetchedCastData.writers.map((writer, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-200 rounded">
                      {writer}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Save Options */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-secondary-200 dark:border-secondary-700">
            <Button
              variant="secondary"
              size="medium"
              onClick={() => {
                setShowCastReviewModal(false);
                setFetchedCastData(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="medium"
              onClick={() => saveCastAndCrew('local')}
              disabled={isFetchingCast}
            >
              Save Locally
            </Button>
            <Button
              variant="secondary"
              size="medium"
              onClick={() => saveCastAndCrew('plex')}
              disabled={isFetchingCast}
            >
              Save to Plex
            </Button>
            <Button
              variant="primary"
              size="medium"
              onClick={() => saveCastAndCrew('both')}
              disabled={isFetchingCast}
            >
              Save Both
            </Button>
          </div>
        </Modal>
      )}

      {/* Music Video Search Modal */}
      {showMusicVideoSearch && item && item.type === 'track' && fullMetadata?.MediaContainer?.Metadata?.[0]?.Media?.[0]?.Part?.[0]?.file && (
        <MusicVideoSearchModal
          isOpen={showMusicVideoSearch}
          onClose={() => setShowMusicVideoSearch(false)}
          artistName={metadata.grandparentTitle || 'Unknown Artist'}
          trackTitle={item.title}
          mediaFilePath={fullMetadata.MediaContainer.Metadata[0].Media[0].Part[0].file}
          onMusicVideoDownloaded={async () => {
            // Refresh music videos from Plex after download
            try {
              // Wait a moment for Plex to detect the new file
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Trigger Plex to refresh metadata for this track
              const client = createPlexClient({ baseURL: serverUrl, token });
              const metadataManager = createMetadataManager(client);
              await metadataManager.refreshMetadata(item.ratingKey);
              
              // Wait for Plex to process
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Fetch updated music videos from Plex
              const response = await client.get(`/library/metadata/${item.ratingKey}/related`);
              const hubs = response.MediaContainer?.Hub || [];
              const musicVideoHub = hubs.find((hub: any) => 
                hub.type === 'clip' || hub.hubIdentifier === 'extras' || hub.title?.toLowerCase().includes('video')
              );
              
              if (musicVideoHub && musicVideoHub.Metadata) {
                const videos = musicVideoHub.Metadata.map((v: any) => ({
                  ratingKey: v.ratingKey,
                  key: v.key,
                  title: v.title,
                  thumb: v.thumb,
                  duration: v.duration,
                  file: v.Media?.[0]?.Part?.[0]?.file,
                }));
                setLocalMusicVideos(videos);
              }
            } catch (error) {
              console.error('Error refreshing music videos from Plex:', error);
            }
            
            setShowMusicVideoSearch(false);
          }}
        />
      )}
      </div> {/* Close content wrapper with solid background */}
      </Tabs>

      {/* Action Buttons - Fixed Footer (outside Tabs, direct child of root) */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-3 py-2.5 z-10">
        <div className="flex items-center gap-2">
          {/* Save Target Selector */}
          <select
            value={saveTarget}
            onChange={(e) => setSaveTarget(e.target.value as 'plex' | 'local' | 'both')}
            className="flex-shrink min-w-0 px-2 py-1.5 text-xs font-medium bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-700 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            aria-label="Save target"
          >
            <option value="plex">Save to Plex</option>
            <option value="local">Save to Local</option>
            <option value="both">Save to Both</option>
          </select>

          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {/* Refresh Metadata Button */}
            <Button
              variant="secondary"
              size="small"
              onClick={() => setShowRefreshModal(true)}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
              title="Fetch latest metadata for review"
            >
              Refresh
            </Button>

            {/* Save Changes Button */}
            <Button
              variant="primary"
              size="small"
              onClick={handleSave}
              disabled={saveMutation.isPending || Object.keys(editedFields).length === 0}
              loading={saveMutation.isPending}
              icon={
                !saveMutation.isPending && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )
              }
              title={Object.keys(editedFields).length === 0 ? "No changes to save" : "Save changes"}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
