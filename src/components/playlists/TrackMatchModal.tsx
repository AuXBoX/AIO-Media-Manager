import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { createPlexClient } from '@/api/plexClient';
import { PlaylistManager, type LibraryTrack } from '@/managers/PlaylistManager';
import type { AudioTrack } from '@/components/audio/AudioPlayer';

interface TrackMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistTracks: AudioTrack[];
  onReplace: (originalKey: string, replacement: LibraryTrack) => void | Promise<void>;
  selectedTrack?: AudioTrack | null;
}

interface TrackWithSearch {
  track: AudioTrack;
  suggestions: LibraryTrack[];
  selectedSuggestion: LibraryTrack | null;
  searchQuery: string;
  isSearching: boolean;
}

// Normalize for comparison (ported from Playlist Lab)
const normalizeForComparison = (str: string): string => {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u201A\u201B\u0027\u0060\u00B4'`]/g, '')
    .replace(/[\u201C\u201D\u201E\u201F"]/g, '')
    .replace(/\$/g, 's').replace(/\//g, '').replace(/\./g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ').trim();
};

// Clean track title - remove remaster/edition markers, featured artists, and other noise
const cleanTrackTitle = (title: string): string => {
  let cleaned = title;
  const patterns = [
    // Featured artists (must come first to strip before other cleanup)
    /\s*\(feat\.\s*[^)]+\)/gi,
    /\s*\(ft\.\s*[^)]+\)/gi,
    /\s*\[feat\.\s*[^\]]+\]/gi,
    /\s*\[ft\.\s*[^\]]+\]/gi,
    /\s*-\s*feat\.\s*.+$/gi,
    /\s*-\s*ft\.\s*.+$/gi,
    /\s*featuring\s*.+$/gi,
    // Remaster/edition markers
    /\s*-\s*remaster(?:ed)?\s*\d{4}/gi,
    /\s*-\s*\d{4}\s*remaster(?:ed)?/gi,
    /\s*-\s*remaster(?:ed)?/gi,
    /\s*\(remaster(?:ed)?\s*\d{4}\)/gi,
    /\s*\(remaster(?:ed)?\)/gi,
    /\s*\[remaster(?:ed)?\s*\d{4}\]/gi,
    /\s*\[remaster(?:ed)?\]/gi,
    /\s+remaster(?:ed)?$/gi,
    // Deluxe/special edition
    /\s*-\s*deluxe\s*edition/gi,
    /\s*\(deluxe\s*edition\)/gi,
    /\s*\[deluxe\s*edition\]/gi,
    /\s*-\s*deluxe/gi,
    /\s*\(deluxe\)/gi,
    /\s*\[deluxe\]/gi,
    /\s+deluxe$/gi,
    // Version/edition markers
    /\s*\(album\s*version\)/gi,
    /\s*\[album\s*version\]/gi,
    /\s*\(single\s*version\)/gi,
    /\s*\[single\s*version\]/gi,
    /\s*\(radio\s*edit\)/gi,
    /\s*\[radio\s*edit\]/gi,
    /\s*\(original\s*mix\)/gi,
    /\s*\[original\s*mix\]/gi,
    // Explicit/clean markers
    /\s*\(explicit\)/gi,
    /\s*\[explicit\]/gi,
    /\s*\(clean\)/gi,
    /\s*\[clean\]/gi,
    // Bonus track
    /\s*\(bonus\s*track\)/gi,
    /\s*\[bonus\s*track\]/gi,
    // Mono/stereo markers
    /\s*\(mono\)/gi,
    /\s*\[mono\]/gi,
    /\s*\(stereo\)/gi,
    /\s*\[stereo\]/gi,
    // Live/acoustic/instrumental in brackets
    /\s*\(live(?:\s*at\s*[^)]+)?\)/gi,
    /\s*\[live(?:\s*at\s*[^\]]+)?\]/gi,
    // Year markers in brackets
    /\s*\(\d{4}\)/g,
    /\s*\[\d{4}\]/g,
  ];
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  // Remove trailing " - " if left after cleaning
  cleaned = cleaned.replace(/\s*-\s*$/, '');
  return cleaned.replace(/\s+/g, ' ').trim() || title;
};

// Clean artist name - remove featured artists from artist string
const cleanArtistName = (artist: string): string => {
  let cleaned = artist;
  const patterns = [
    /\s*feat\.\s*.+$/gi,
    /\s*ft\.\s*.+$/gi,
    /\s*featuring\s*.+$/gi,
    /\s*\(feat\.\s*[^)]+\)/gi,
    /\s*\(ft\.\s*[^)]+\)/gi,
  ];
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.replace(/\s+/g, ' ').trim() || artist;
};

// Check if title matches
const titlesMatch = (sourceTitle: string, plexTitle: string): boolean => {
  const cleanSource = normalizeForComparison(cleanTrackTitle(sourceTitle));
  const cleanPlex = normalizeForComparison(cleanTrackTitle(plexTitle));
  if (cleanSource === cleanPlex) return true;
  if (cleanSource.replace(/\s+/g, '') === cleanPlex.replace(/\s+/g, '')) return true;
  if (cleanSource.includes(cleanPlex) || cleanPlex.includes(cleanSource)) return true;
  return false;
};

// Check if artist matches
const artistsMatch = (sourceArtist: string, plexArtist: string): boolean => {
  const cleanSource = normalizeForComparison(sourceArtist);
  const cleanPlex = normalizeForComparison(plexArtist);
  if (cleanSource === cleanPlex) return true;
  if (cleanSource.includes(cleanPlex) || cleanPlex.includes(cleanSource)) return true;
  return false;
};

// Calculate match score (ported from Playlist Lab)
const calculateMatchScore = (sourceTitle: string, sourceArtist: string, plexTitle: string, plexArtist: string): number => {
  const cleanSourceTitle = cleanTrackTitle(sourceTitle).toLowerCase();
  const cleanPlexTitle = cleanTrackTitle(plexTitle).toLowerCase();
  const cleanSourceArtist = sourceArtist.toLowerCase();
  const cleanPlexArtist = plexArtist.toLowerCase();
  
  let titleScore = 0;
  if (cleanSourceTitle === cleanPlexTitle) {
    titleScore = 100;
  } else if (cleanSourceTitle.includes(cleanPlexTitle) || cleanPlexTitle.includes(cleanSourceTitle)) {
    titleScore = 90;
  } else {
    const sourceWords = cleanSourceTitle.split(/\s+/);
    const plexWords = cleanPlexTitle.split(/\s+/);
    const matches = sourceWords.filter(w => plexWords.some(pw => pw.includes(w) || w.includes(pw))).length;
    titleScore = Math.round((matches / Math.max(sourceWords.length, plexWords.length)) * 80);
  }
  
  let artistScore = 0;
  if (cleanSourceArtist === cleanPlexArtist) {
    artistScore = 100;
  } else if (cleanSourceArtist.includes(cleanPlexArtist) || cleanPlexArtist.includes(cleanSourceArtist)) {
    artistScore = 90;
  } else {
    artistScore = 50;
  }
  
  let score = Math.round(titleScore * 0.7 + artistScore * 0.3);
  
  // Penalize "Various Artists" compilations
  const isVariousArtists = normalizeForComparison(plexArtist).includes('various') || 
                           normalizeForComparison(plexArtist).includes('compilation');
  if (isVariousArtists && !artistsMatch(sourceArtist, plexArtist)) {
    score -= 40;
  }
  
  return Math.max(0, Math.min(100, score));
};

// Scored track for sorting
interface ScoredTrack extends LibraryTrack {
  score: number;
}

export function TrackMatchModal({ isOpen, onClose, playlistTracks, onReplace, selectedTrack }: TrackMatchModalProps) {
  const { serverConnection, currentToken, selectedLibrary } = useAppStore();
  const [tracks, setTracks] = useState<TrackWithSearch[]>([]);
  const [applying, setApplying] = useState(false);
  const managerRef = useRef<PlaylistManager | null>(null);
  const libraryKeyRef = useRef<string | undefined>(selectedLibrary?.key);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create manager and find music library
  useEffect(() => {
    if (serverConnection && currentToken) {
      const client = createPlexClient({
        baseURL: serverConnection.uri,
        token: currentToken,
      });
      managerRef.current = new PlaylistManager(client);
      console.log('[TrackMatch] Manager created');
      
      // Find music library if selectedLibrary is not set or not a music library
      const findMusicLibrary = async () => {
        if (selectedLibrary?.key && selectedLibrary.type === 'artist') {
          libraryKeyRef.current = selectedLibrary.key;
          console.log('[TrackMatch] Using selected library:', selectedLibrary.key);
          return;
        }
        
        try {
          console.log('[TrackMatch] Finding music libraries...');
          const response = await client.get('/library/sections');
          const directories = response.MediaContainer?.Directory || [];
          const musicLibraries = directories.filter((d: any) => d.type === 'artist');
          
          if (musicLibraries.length > 0) {
            libraryKeyRef.current = musicLibraries[0].key;
            console.log('[TrackMatch] Found music library:', musicLibraries[0].key, musicLibraries[0].title);
          } else {
            console.log('[TrackMatch] No music libraries found');
          }
        } catch (error) {
          console.error('[TrackMatch] Failed to find music libraries:', error);
        }
      };
      
      findMusicLibrary();
    }
  }, [serverConnection, currentToken, selectedLibrary]);

  // Perform search helper
  const performSearch = async (query: string, index: number) => {
    const manager = managerRef.current;
    const libraryKey = libraryKeyRef.current;
    
    console.log('[TrackMatch] Performing search:', { query, index, hasManager: !!manager, libraryKey });
    
    if (!manager || !libraryKey || !query.trim()) {
      console.log('[TrackMatch] Search skipped - missing manager or library');
      return;
    }

    setTracks(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], isSearching: true };
      }
      return updated;
    });

    try {
      // Parse query into artist and title
      let searchArtist = '';
      let searchTitle = '';
      
      if (query.includes(' - ')) {
        // "Artist - Title" format
        const parts = query.split(' - ');
        searchArtist = cleanArtistName(parts[0]?.trim() || '');
        searchTitle = cleanTrackTitle(parts.slice(1).join(' - ').trim());
      } else {
        // Assume it's just a title or mixed query
        searchTitle = cleanTrackTitle(query);
      }
      
      // Build cleaned search query for the API
      const cleanedQuery = searchArtist ? `${searchArtist} - ${searchTitle}` : searchTitle;
      
      console.log('[TrackMatch] Parsed search:', { searchArtist, searchTitle, originalQuery: query });
      console.log('[TrackMatch] Searching library:', libraryKey);
      
      const results = await manager.searchLibraryTracks(libraryKey, cleanedQuery, searchArtist, searchTitle);
      console.log('[TrackMatch] Raw search results:', results.length);
      
      // Score and filter results using the search terms directly
      const scoredResults: ScoredTrack[] = results.map(result => ({
        ...result,
        score: calculateMatchScore(searchTitle, searchArtist, result.title, result.artist),
      }));
      
      // Sort by score (highest first)
      scoredResults.sort((a, b) => b.score - a.score);
      
      // Filter: only show results with score > 40 and title matches
      const filteredResults = scoredResults.filter(r => {
        // Must have some title match
        if (!titlesMatch(searchTitle, r.title)) {
          return false;
        }
        // Must have reasonable score
        return r.score >= 40;
      });
      
      console.log('[TrackMatch] Filtered results:', filteredResults.length);
      console.log('[TrackMatch] Top results:', filteredResults.slice(0, 5).map(r => ({
        title: r.title,
        artist: r.artist,
        score: r.score,
      })));
      
      setTracks(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            suggestions: filteredResults.slice(0, 15),
            isSearching: false,
          };
        }
        return updated;
      });
    } catch (error) {
      console.error('[TrackMatch] Search failed:', error);
      setTracks(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], isSearching: false };
        }
        return updated;
      });
    }
  };

  // Initialize tracks and auto-search when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setTracks([]);
      setApplying(false);
      return;
    }

    console.log('[TrackMatch] Modal opened', { selectedTrack: selectedTrack?.title, playlistTracks: playlistTracks.length });

    // Single track mode
    if (selectedTrack) {
      // Clean the title and artist before searching
      const cleanTitle = cleanTrackTitle(selectedTrack.title);
      const cleanArtist = selectedTrack.artist ? cleanArtistName(selectedTrack.artist) : '';
      
      // Use "Artist - Title" format for better search parsing
      const defaultQuery = cleanArtist 
        ? `${cleanArtist} - ${cleanTitle}`
        : cleanTitle;
      console.log('[TrackMatch] Single track mode, auto-searching for:', defaultQuery);
      
      const trackEntry: TrackWithSearch = {
        track: selectedTrack,
        suggestions: [],
        selectedSuggestion: null,
        searchQuery: defaultQuery,
        isSearching: true, // Start as searching
      };
      setTracks([trackEntry]);

      // Auto-search - wait for manager and library if needed
      const doAutoSearch = async () => {
        // Wait for manager and library to be ready
        let attempts = 0;
        while ((!managerRef.current || !libraryKeyRef.current) && attempts < 30) {
          console.log('[TrackMatch] Waiting for manager/library... attempt', attempts + 1, { manager: !!managerRef.current, library: libraryKeyRef.current });
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        console.log('[TrackMatch] Ready:', { manager: !!managerRef.current, library: libraryKeyRef.current });
        
        if (managerRef.current && libraryKeyRef.current) {
          await performSearch(defaultQuery, 0);
        } else {
          console.log('[TrackMatch] Manager or library not available after waiting');
          setTracks(prev => {
            const updated = [...prev];
            if (updated[0]) {
              updated[0] = { ...updated[0], isSearching: false };
            }
            return updated;
          });
        }
      };

      doAutoSearch();
    } else if (playlistTracks.length > 0) {
      // All tracks mode
      console.log('[TrackMatch] All tracks mode, showing', playlistTracks.length, 'tracks');
      setTracks(playlistTracks.map(track => ({
        track,
        suggestions: [],
        selectedSuggestion: null,
        searchQuery: '',
        isSearching: false,
      })));
    }
  }, [isOpen, selectedTrack]);

  // Search for replacement (user-initiated, debounced)
  const handleSearch = (index: number, query: string) => {
    // Update the search query immediately
    setTracks(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], searchQuery: query };
      }
      return updated;
    });

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If empty query, clear results
    if (!query.trim()) {
      setTracks(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], suggestions: [], isSearching: false };
        }
        return updated;
      });
      return;
    }

    // Show searching state
    setTracks(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], isSearching: true };
      }
      return updated;
    });

    // Debounce the actual search
    searchTimeoutRef.current = setTimeout(async () => {
      await performSearch(query, index);
    }, 400);
  };

  // Select suggestion
  const selectSuggestion = (trackIndex: number, suggestion: LibraryTrack) => {
    setTracks(prev => {
      const updated = [...prev];
      if (updated[trackIndex]) {
        const current = updated[trackIndex];
        // Toggle selection if same suggestion clicked
        if (current.selectedSuggestion?.ratingKey === suggestion.ratingKey) {
          updated[trackIndex] = { ...current, selectedSuggestion: null };
        } else {
          updated[trackIndex] = { ...current, selectedSuggestion: suggestion };
        }
      }
      return updated;
    });
  };

  // Apply replacement
  const applyReplacement = async (index: number) => {
    const item = tracks[index];
    if (!item?.selectedSuggestion) return;

    setApplying(true);
    try {
      await onReplace(item.track.ratingKey, item.selectedSuggestion);
      
      // Close modal in single-track mode, or remove from list in all-tracks mode
      if (selectedTrack) {
        setTracks([]);
        onClose();
      } else {
        setTracks(prev => prev.filter((_, i) => i !== index));
      }
    } catch (error) {
      console.error('[TrackMatch] Failed to apply replacement:', error);
    } finally {
      setApplying(false);
    }
  };

  // Apply all replacements
  const applyAll = () => {
    const matched = tracks.filter(t => t.selectedSuggestion);
    matched.forEach(item => {
      onReplace(item.track.ratingKey, item.selectedSuggestion!);
    });
    onClose();
  };

  const matchedCount = tracks.filter(t => t.selectedSuggestion).length;
  const isSingleTrack = !!selectedTrack;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isSingleTrack ? 'Find Better Match' : 'Track Matching'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {isSingleTrack
                  ? `Searching for: "${selectedTrack?.title}" by ${selectedTrack?.artist}`
                  : 'Search and find better matches for tracks in your library'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tracks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">No tracks in playlist</p>
            </div>
          ) : (
            <div className="space-y-4">
              {!isSingleTrack && (
                <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {tracks.length} tracks in playlist
                  </span>
                  {matchedCount > 0 && (
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                      {matchedCount} ready to replace
                    </span>
                  )}
                </div>
              )}

              {tracks.map((item, index) => (
                <div 
                  key={item.track.ratingKey}
                  className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${
                    isSingleTrack ? 'border-primary-200 dark:border-primary-700' : ''
                  }`}
                >
                  {/* Current track */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.track.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {item.track.artist} • {item.track.album}
                      </p>
                    </div>
                    {item.selectedSuggestion && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                        Match selected
                      </span>
                    )}
                  </div>

                  {/* Search input */}
                  <div className="relative mb-3">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search for replacement..."
                      value={item.searchQuery}
                      onChange={e => handleSearch(index, e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {item.isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
                      </div>
                    )}
                  </div>

                  {/* Suggestions */}
                  {item.suggestions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                        Results ({item.suggestions.length})
                      </p>
                      {item.suggestions.map(suggestion => (
                        <button
                          key={suggestion.ratingKey}
                          onClick={() => selectSuggestion(index, suggestion)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            item.selectedSuggestion?.ratingKey === suggestion.ratingKey
                              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            item.selectedSuggestion?.ratingKey === suggestion.ratingKey
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {item.selectedSuggestion?.ratingKey === suggestion.ratingKey && (
                              <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {suggestion.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {suggestion.artist} • {suggestion.album}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Apply button */}
                  {item.selectedSuggestion && (
                    <button
                      onClick={() => applyReplacement(index)}
                      disabled={applying}
                      className="mt-3 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      {applying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Applying...
                        </>
                      ) : (
                        'Apply Replacement'
                      )}
                    </button>
                  )}

                  {/* No results message */}
                  {item.searchQuery && !item.isSearching && item.suggestions.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">
                      No results found. Try a different search term.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - only show in all-tracks mode */}
        {!isSingleTrack && matchedCount > 0 && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={applyAll}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full font-medium transition-colors"
            >
              Apply All ({matchedCount})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
