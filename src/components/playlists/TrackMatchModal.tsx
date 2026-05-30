import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { createPlexClient } from '@/api/plexClient';
import { PlaylistManager, type LibraryTrack } from '@/managers/PlaylistManager';
import type { AudioTrack } from '@/components/audio/AudioPlayer';

interface TrackMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistTracks: AudioTrack[];
  onReplace: (originalKey: string, replacement: LibraryTrack) => void;
}

interface TrackWithSearch {
  track: AudioTrack;
  suggestions: LibraryTrack[];
  selectedSuggestion: LibraryTrack | null;
  searchQuery: string;
  isSearching: boolean;
}

export function TrackMatchModal({ isOpen, onClose, playlistTracks, onReplace }: TrackMatchModalProps) {
  const { serverConnection, currentToken, selectedLibrary } = useAppStore();
  const [tracks, setTracks] = useState<TrackWithSearch[]>([]);
  const [manager, setManager] = useState<PlaylistManager | null>(null);

  useEffect(() => {
    if (serverConnection && currentToken) {
      const client = createPlexClient({
        baseURL: serverConnection.uri,
        token: currentToken,
      });
      setManager(new PlaylistManager(client));
    }
  }, [serverConnection, currentToken]);

  // Initialize tracks when modal opens
  useEffect(() => {
    if (isOpen && playlistTracks.length > 0) {
      setTracks(playlistTracks.map(track => ({
        track,
        suggestions: [],
        selectedSuggestion: null,
        searchQuery: '',
        isSearching: false,
      })));
    }
  }, [isOpen, playlistTracks]);

  // Search for replacement
  const handleSearch = async (index: number, query: string) => {
    if (!manager || !selectedLibrary) return;

    setTracks(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], searchQuery: query, isSearching: true };
      }
      return updated;
    });

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

    try {
      const results = await manager.searchLibraryTracks(selectedLibrary.key, query);
      setTracks(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { 
            ...updated[index], 
            suggestions: results.slice(0, 10),
            isSearching: false,
          };
        }
        return updated;
      });
    } catch (error) {
      console.error('Search failed:', error);
      setTracks(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], isSearching: false };
        }
        return updated;
      });
    }
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
  const applyReplacement = (index: number) => {
    const item = tracks[index];
    if (!item?.selectedSuggestion) return;

    onReplace(item.track.ratingKey, item.selectedSuggestion);
    
    // Remove from list
    setTracks(prev => prev.filter((_, i) => i !== index));
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Track Matching</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Search and find better matches for tracks in your library
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
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {tracks.length} tracks in playlist
                </span>
                {matchedCount > 0 && (
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {matchedCount} ready to replace
                  </span>
                )}
              </div>

              {tracks.map((item, index) => (
                <div 
                  key={item.track.ratingKey}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
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
                      className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {item.isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                      </div>
                    )}
                  </div>

                  {/* Suggestions */}
                  {item.suggestions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                        Suggestions
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
                      className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Apply Replacement
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {matchedCount > 0 && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={applyAll}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors"
            >
              Apply All ({matchedCount})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
