import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { createPlexClient } from '@/api/plexClient';
import { PlaylistManager, type LibraryTrack } from '@/managers/PlaylistManager';

interface AddTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tracks: LibraryTrack[]) => void;
  existingTrackKeys?: Set<string>;
}

export function AddTracksModal({ isOpen, onClose, onAdd, existingTrackKeys = new Set() }: AddTracksModalProps) {
  const { serverConnection, currentToken, selectedLibrary } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LibraryTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
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

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || !manager || !selectedLibrary) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearching(true);
        const results = await manager.searchLibraryTracks(selectedLibrary.key, searchQuery);
        // Filter out tracks already in playlist
        const filtered = results.filter(t => !existingTrackKeys.has(t.ratingKey));
        setSearchResults(filtered);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, manager, selectedLibrary, existingTrackKeys]);

  const toggleSelection = (ratingKey: string) => {
    setSelectedTracks(prev => {
      const next = new Set(prev);
      if (next.has(ratingKey)) {
        next.delete(ratingKey);
      } else {
        next.add(ratingKey);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allKeys = new Set(searchResults.map(t => t.ratingKey));
    setSelectedTracks(allKeys);
  };

  const clearSelection = () => {
    setSelectedTracks(new Set());
  };

  const handleAdd = () => {
    const tracksToAdd = searchResults.filter(t => selectedTracks.has(t.ratingKey));
    onAdd(tracksToAdd);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedTracks(new Set());
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedTracks(new Set());
    onClose();
  };

  const formatDuration = (ms: number): string => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Tracks</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Search input */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by track name, artist, or album..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {searching ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : searchResults.length === 0 && searchQuery ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No tracks found
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Start typing to search your library
            </div>
          ) : (
            <div className="space-y-1">
              {searchResults.map(track => (
                <button
                  key={track.ratingKey}
                  onClick={() => toggleSelection(track.ratingKey)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedTracks.has(track.ratingKey)
                      ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedTracks.has(track.ratingKey)
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedTracks.has(track.ratingKey) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{track.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {track.artist} • {track.album}
                    </p>
                  </div>
                  <span className="text-sm text-gray-400 flex-shrink-0">{formatDuration(track.duration)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {searchResults.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedTracks.size} selected
              </span>
              <button
                onClick={handleAdd}
                disabled={selectedTracks.size === 0}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full font-medium transition-colors"
              >
                Add Tracks
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
