import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LibraryItem } from '@/managers/LibraryManager';
import { createPlexClient } from '@/api/plexClient';
import { createMetadataManager, type MetadataUpdate } from '@/managers/MetadataManager';
import { createLocalMetadataManager, type MetadataSaveMode } from '@/managers/LocalMetadataManager';
import { createSubtitleManager } from '@/managers/SubtitleManager';
import { MetadataRefreshModal } from '@/components/library/MetadataRefreshModal';
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

type TabType = 'details' | 'cast' | 'images' | 'files' | 'trailers' | 'subtitles';

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
  const [showRefreshModal, setShowRefreshModal] = useState(false);
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
              });
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
      
      // Save to Plex
      if (saveTarget === 'plex' || saveTarget === 'both') {
        await metadataManager.updateMetadata(item.ratingKey, updates);
      }
      
      // Save to local
      if (saveTarget === 'local' || saveTarget === 'both') {
        const metadata = await metadataManager.getMetadata(item.ratingKey);
        const mode: MetadataSaveMode = {
          target: 'local',
          localFormat: 'nfo',
          createBackup: true,
          overwriteExisting: true,
        };
        await localManager.syncToLocal(metadata, mode);
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
      <div className="flex items-center justify-center h-full bg-secondary-50 dark:bg-secondary-900 border-l border-secondary-200 dark:border-secondary-700">
        <div className="text-center text-secondary-500 dark:text-secondary-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <p className="text-sm">Select an item to view details</p>
        </div>
      </div>
    );
  }

  const metadata = fullMetadata?.MediaContainer?.Metadata?.[0] || item;
  const posterUrl = metadata.thumb ? `${serverUrl}${metadata.thumb}?X-Plex-Token=${token}` : null;
  const artUrl = metadata.art ? `${serverUrl}${metadata.art}?X-Plex-Token=${token}` : null;

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
    { id: 'details' as TabType, label: 'Details', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'cast' as TabType, label: 'Cast & Crew', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )},
    { id: 'images' as TabType, label: 'Images', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
    { id: 'trailers' as TabType, label: 'Trailers', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'subtitles' as TabType, label: 'Subtitles', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    )},
    { id: 'files' as TabType, label: 'Files', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )},
  ];

  const handleFieldChange = (field: string, value: any) => {
    setEditedFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const getFieldValue = (field: string, defaultValue: any) => {
    return editedFields[field] !== undefined ? editedFields[field] : defaultValue;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-secondary-900 border-l border-secondary-200 dark:border-secondary-700">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50 truncate">
            {metadata.title}
          </h2>
          {/* Status indicators */}
          <div className="flex items-center gap-2">
            {hasLocalNfo && (
              <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                  <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                </svg>
                Local NFO
              </span>
            )}
            {isDirty && (
              <span className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Unsaved
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh Metadata Button */}
          <button
            onClick={() => setShowRefreshModal(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-2"
            title="Fetch latest metadata for review"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Metadata
          </button>

          {/* Save target selector */}
          <select
            value={saveTarget}
            onChange={(e) => setSaveTarget(e.target.value as 'plex' | 'local' | 'both')}
            className="px-2 py-1.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100"
          >
            <option value="plex">Save to Plex</option>
            <option value="local">Save to Local</option>
            <option value="both">Save to Both</option>
          </select>
          
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || Object.keys(editedFields).length === 0}
            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2 disabled:opacity-50"
            title={Object.keys(editedFields).length === 0 ? "No changes to save" : "Save changes"}
          >
            {saveMutation.isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded transition-colors"
              aria-label="Close details"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Poster and basic info */}
      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex gap-4">
          {posterUrl && (
            <img
              src={posterUrl}
              alt={metadata.title}
              className="w-32 h-48 object-cover rounded shadow-md flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-secondary-900 dark:text-secondary-50 mb-2">
              {metadata.title}
            </h3>
            {metadata.year && (
              <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-1">
                {metadata.year}
              </p>
            )}
            {metadata.duration && (
              <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-1">
                {formatDuration(metadata.duration)}
              </p>
            )}
            {metadata.rating && (
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-medium text-secondary-900 dark:text-secondary-50">
                  {metadata.rating.toFixed(1)}
                </span>
              </div>
            )}
            {metadata.Genre && metadata.Genre.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {metadata.Genre.slice(0, 3).map((genre: any, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 rounded"
                  >
                    {genre.tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-secondary-200 dark:border-secondary-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'details' && (
          <div className="space-y-4">
            {/* Title - Editable */}
            <div>
              <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                Title
              </h4>
              {isEditing ? (
                <input
                  type="text"
                  value={getFieldValue('title', metadata.title)}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100"
                />
              ) : (
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  {metadata.title}
                </p>
              )}
            </div>

            {/* Original Title - Editable */}
            {(metadata.originalTitle || isEditing) && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Original Title
                </h4>
                {isEditing ? (
                  <input
                    type="text"
                    value={getFieldValue('originalTitle', metadata.originalTitle || '')}
                    onChange={(e) => handleFieldChange('originalTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100"
                  />
                ) : (
                  <p className="text-sm text-secondary-700 dark:text-secondary-300">
                    {metadata.originalTitle}
                  </p>
                )}
              </div>
            )}

            {/* Summary - Editable */}
            {(metadata.summary || isEditing) && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Summary
                </h4>
                {isEditing ? (
                  <textarea
                    value={getFieldValue('summary', metadata.summary || '')}
                    onChange={(e) => handleFieldChange('summary', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100"
                  />
                ) : (
                  <p className="text-sm text-secondary-700 dark:text-secondary-300 leading-relaxed">
                    {metadata.summary}
                  </p>
                )}
              </div>
            )}

            {/* Tagline - Editable */}
            {(metadata.tagline || isEditing) && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Tagline
                </h4>
                {isEditing ? (
                  <input
                    type="text"
                    value={getFieldValue('tagline', metadata.tagline || '')}
                    onChange={(e) => handleFieldChange('tagline', e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100"
                  />
                ) : (
                  <p className="text-sm text-secondary-700 dark:text-secondary-300 italic">
                    {metadata.tagline}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Year - Editable */}
              <div>
                <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-1">
                  Year
                </h4>
                {isEditing ? (
                  <input
                    type="number"
                    value={getFieldValue('year', metadata.year || '')}
                    onChange={(e) => handleFieldChange('year', e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100"
                  />
                ) : (
                  <p className="text-sm text-secondary-900 dark:text-secondary-50">
                    {metadata.year}
                  </p>
                )}
              </div>

              {/* Studio - Editable */}
              {(metadata.studio || isEditing) && (
                <div>
                  <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-1">
                    Studio
                  </h4>
                  {isEditing ? (
                    <input
                      type="text"
                      value={getFieldValue('studio', metadata.studio || '')}
                      onChange={(e) => handleFieldChange('studio', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100"
                    />
                  ) : (
                    <p className="text-sm text-secondary-900 dark:text-secondary-50">
                      {metadata.studio}
                    </p>
                  )}
                </div>
              )}

              {/* Content Rating - Editable */}
              {(metadata.contentRating || isEditing) && (
                <div>
                  <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-1">
                    Rating
                  </h4>
                  {isEditing ? (
                    <input
                      type="text"
                      value={getFieldValue('contentRating', metadata.contentRating || '')}
                      onChange={(e) => handleFieldChange('contentRating', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100"
                    />
                  ) : (
                    <p className="text-sm text-secondary-900 dark:text-secondary-50">
                      {metadata.contentRating}
                    </p>
                  )}
                </div>
              )}

              {/* User Rating - Editable */}
              {(metadata.rating || isEditing) && (
                <div>
                  <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-1">
                    User Rating
                  </h4>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={getFieldValue('rating', metadata.rating || '')}
                      onChange={(e) => handleFieldChange('rating', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm font-medium text-secondary-900 dark:text-secondary-50">
                        {metadata.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {metadata.originallyAvailableAt && (
                <div>
                  <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-1">
                    Release Date
                  </h4>
                  <p className="text-sm text-secondary-900 dark:text-secondary-50">
                    {metadata.originallyAvailableAt}
                  </p>
                </div>
              )}

              {metadata.addedAt && (
                <div>
                  <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-1">
                    Added
                  </h4>
                  <p className="text-sm text-secondary-900 dark:text-secondary-50">
                    {formatDate(metadata.addedAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Genres */}
            {metadata.Genre && metadata.Genre.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                  Genres
                </h4>
                <div className="flex flex-wrap gap-2">
                  {metadata.Genre.map((genre: any, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 rounded-full"
                    >
                      {genre.tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cast' && (
          <div className="space-y-4">
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
          </div>
        )}

        {activeTab === 'images' && (
          <div className="space-y-6">
            {/* Poster */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50">
                  Poster
                </h4>
                {isEditing && (
                  <label className="px-3 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded cursor-pointer transition-colors">
                    Upload New
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
                <div className="flex justify-center">
                  <img 
                    src={posterUrl} 
                    alt="Poster" 
                    className="max-w-xs rounded shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => window.open(posterUrl, '_blank')}
                    title="Click to view full size"
                  />
                </div>
              )}
            </div>

            {/* Background */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50">
                  Background
                </h4>
                {isEditing && (
                  <label className="px-3 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded cursor-pointer transition-colors">
                    Upload New
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
                <div className="flex justify-center">
                  <img 
                    src={artUrl} 
                    alt="Background" 
                    className="max-w-full rounded shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => window.open(artUrl, '_blank')}
                    title="Click to view full size"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'trailers' && (
          <div className="space-y-4">
            {/* Plex Trailers Section */}
            {metadata.Extras && metadata.Extras.filter((extra: any) => extra.type === 'clip' && extra.extraType === 1).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  Plex Trailers
                </h4>
                <div className="space-y-3">
                  {metadata.Extras.filter((extra: any) => extra.type === 'clip' && extra.extraType === 1).map((trailer: any, index: number) => (
                    <div key={`plex-${index}`} className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
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
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1">
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
                        <button
                          onClick={() => {
                            // Play trailer logic
                            const trailerUrl = `${serverUrl}${trailer.Media?.[0]?.Part?.[0]?.key}?X-Plex-Token=${token}`;
                            window.open(trailerUrl, '_blank');
                          }}
                          className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded transition-colors"
                          title="Play trailer"
                        >
                          <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                        </button>
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
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-semibold">
                                  {resolution}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              // Open local file with default application
                              if (window.electron) {
                                window.electron.openFile(trailerPath);
                              }
                            }}
                            className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded transition-colors"
                            title="Play trailer"
                          >
                            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </button>
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

            {/* Add trailer button */}
            {isEditing && (
              <button className="w-full px-4 py-3 border-2 border-dashed border-secondary-300 dark:border-secondary-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Trailer URL
              </button>
            )}
          </div>
        )}

        {activeTab === 'subtitles' && (
          <div className="space-y-4">
            {/* Plex/Embedded Subtitles Section */}
            {plexSubtitles.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  Embedded Subtitles
                </h4>
                <div className="space-y-3">
                  {plexSubtitles.map((subtitle, index) => (
                    <div key={`plex-${index}`} className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-1">
                            {subtitle.language}
                          </h5>
                          <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
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
                            <button
                              onClick={() => {
                                // TODO: Extract subtitle (Phase 4 - FFmpeg integration)
                                alert('Extract subtitle feature coming soon');
                              }}
                              className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded transition-colors"
                              title="Extract subtitle"
                            >
                              <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              // TODO: Remove subtitle (Phase 4 - FFmpeg integration)
                              alert('Remove subtitle feature coming soon');
                            }}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Remove subtitle"
                          >
                            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
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
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
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
                          <button
                            onClick={() => {
                              // TODO: Embed subtitle into video (Phase 4 - FFmpeg integration)
                              alert('Embed subtitle feature coming soon');
                            }}
                            className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded transition-colors"
                            title="Embed into video"
                          >
                            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </button>
                          <button
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
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete subtitle file"
                          >
                            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
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

            {/* Search subtitles button */}
            <button 
              onClick={() => {
                // TODO: Open subtitle search modal (Phase 3)
                alert('Subtitle search feature coming soon');
              }}
              className="w-full px-4 py-3 border-2 border-dashed border-secondary-300 dark:border-secondary-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search for Subtitles
            </button>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4">
            {/* Rescan button */}
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  if (!item) return;
                  try {
                    const client = createPlexClient({ baseURL: serverUrl, token });
                    const manager = createMetadataManager(client);
                    
                    // Show loading state
                    const button = document.activeElement as HTMLButtonElement;
                    const originalText = button?.innerHTML;
                    if (button) {
                      button.disabled = true;
                      button.innerHTML = `
                        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span class="ml-2">Rescanning...</span>
                      `;
                    }
                    
                    await manager.refreshMetadata(item.ratingKey);
                    
                    // Wait a moment for Plex to process
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Refetch metadata after refresh
                    await refetch();
                    
                    // Restore button
                    if (button && originalText) {
                      button.disabled = false;
                      button.innerHTML = originalText;
                    }
                  } catch (error) {
                    console.error('Failed to refresh metadata:', error);
                    alert('Failed to rescan media info. Please try again.');
                  }
                }}
                className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Rescan Media Info
              </button>
            </div>

            {metadata.Media && metadata.Media.map((media: any, index: number) => (
              <div key={index} className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-secondary-900 dark:text-secondary-50 mb-3">
                  Media Stream {metadata.Media.length > 1 ? `#${index + 1}` : ''}
                </h5>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-secondary-500 dark:text-secondary-400">Container:</span>
                    <span className="ml-2 text-secondary-900 dark:text-secondary-50 font-medium">
                      {media.container?.toUpperCase() || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-500 dark:text-secondary-400">Video Codec:</span>
                    <span className="ml-2 text-secondary-900 dark:text-secondary-50 font-medium">
                      {media.videoCodec?.toUpperCase() || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-500 dark:text-secondary-400">Resolution:</span>
                    <span className="ml-2 text-secondary-900 dark:text-secondary-50 font-medium">
                      {media.videoResolution ? `${media.videoResolution}p` : `${media.width}x${media.height}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-500 dark:text-secondary-400">Audio Codec:</span>
                    <span className="ml-2 text-secondary-900 dark:text-secondary-50 font-medium">
                      {media.audioCodec?.toUpperCase() || 'Unknown'}
                    </span>
                  </div>
                  {media.bitrate && (
                    <div>
                      <span className="text-secondary-500 dark:text-secondary-400">Bitrate:</span>
                      <span className="ml-2 text-secondary-900 dark:text-secondary-50 font-medium">
                        {/* Plex stores bitrate in kbps, so just display it directly */}
                        {media.bitrate >= 1000 
                          ? `${(media.bitrate / 1000).toFixed(1)} Mbps`
                          : `${media.bitrate} kbps`
                        }
                      </span>
                    </div>
                  )}
                  {media.audioChannels && (
                    <div>
                      <span className="text-secondary-500 dark:text-secondary-400">Audio Channels:</span>
                      <span className="ml-2 text-secondary-900 dark:text-secondary-50 font-medium">
                        {media.audioChannels === 6 ? '5.1' : media.audioChannels === 8 ? '7.1' : media.audioChannels}
                      </span>
                    </div>
                  )}
                  {media.aspectRatio && (
                    <div>
                      <span className="text-secondary-500 dark:text-secondary-400">Aspect Ratio:</span>
                      <span className="ml-2 text-secondary-900 dark:text-secondary-50 font-medium">
                        {media.aspectRatio}
                      </span>
                    </div>
                  )}
                  {media.videoFrameRate && (
                    <div>
                      <span className="text-secondary-500 dark:text-secondary-400">Frame Rate:</span>
                      <span className="ml-2 text-secondary-900 dark:text-secondary-50 font-medium">
                        {media.videoFrameRate} fps
                      </span>
                    </div>
                  )}
                </div>
                {media.Part && media.Part.map((part: any, partIndex: number) => (
                  <div key={partIndex} className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
                    <p className="text-xs font-semibold text-secondary-600 dark:text-secondary-400 mb-1">File:</p>
                    <p className="text-xs text-secondary-900 dark:text-secondary-50 font-mono break-all bg-secondary-50 dark:bg-secondary-800 p-2 rounded">
                      {part.file}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      {part.size && (
                        <div>
                          <span className="text-secondary-500 dark:text-secondary-400">Size:</span>
                          <span className="ml-2 text-secondary-900 dark:text-secondary-50 font-medium">
                            {(part.size / (1024 * 1024 * 1024)).toFixed(2)} GB
                          </span>
                        </div>
                      )}
                      {part.duration && (
                        <div>
                          <span className="text-secondary-500 dark:text-secondary-400">Duration:</span>
                          <span className="ml-2 text-secondary-900 dark:text-secondary-50 font-medium">
                            {formatDuration(part.duration)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata Refresh Modal */}
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
    </div>
  );
}
