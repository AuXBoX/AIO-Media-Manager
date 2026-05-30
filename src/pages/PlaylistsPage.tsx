import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { createPlexClient } from '@/api/plexClient';
import { PlaylistManager, type Playlist, type LibraryTrack } from '@/managers/PlaylistManager';
import { useAudioPlayer, type AudioTrack } from '@/components/audio/AudioPlayer';
import { AddTracksModal } from '@/components/playlists/AddTracksModal';
import { CoverArtModal } from '@/components/playlists/CoverArtModal';
import { ImportPlaylistModal } from '@/components/playlists/ImportPlaylistModal';
import { TrackMatchModal } from '@/components/playlists/TrackMatchModal';
import { MissingTracksPanel } from '@/components/playlists/MissingTracksPanel';

interface PlaylistTrack extends AudioTrack {
  playlistItemID?: string;
}

export function PlaylistsPage() {
  const { serverConnection, currentToken, selectedServer } = useAppStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Modal states
  const [showAddTracks, setShowAddTracks] = useState(false);
  const [showCoverArt, setShowCoverArt] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTrackMatch, setShowTrackMatch] = useState(false);
  const [showMissingTracks, setShowMissingTracks] = useState(false);
  const [matchTrackTarget, setMatchTrackTarget] = useState<PlaylistTrack | null>(null);
  
  // Drag and drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Selection for bulk operations
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  
  const { playQueue } = useAudioPlayer();
  const managerRef = useRef<PlaylistManager | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, [serverConnection, currentToken]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPlaylist) return;
      
      // Ctrl+A - Select all tracks
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        const allKeys = new Set(playlistTracks.map(t => t.ratingKey));
        setSelectedTracks(allKeys);
      }
      
      // Delete - Remove selected tracks
      if (e.key === 'Delete' && selectedTracks.size > 0) {
        e.preventDefault();
        handleRemoveSelectedTracks();
      }
      
      // Escape - Clear selection
      if (e.key === 'Escape') {
        setSelectedTracks(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlaylist, playlistTracks, selectedTracks]);

  const getManager = () => {
    if (!serverConnection || !currentToken) return null;
    if (!managerRef.current) {
      managerRef.current = new PlaylistManager(createPlexClient({
        baseURL: serverConnection.uri,
        token: currentToken,
      }));
    }
    return managerRef.current;
  };

  const loadPlaylists = async () => {
    if (!serverConnection || !currentToken) return;
    
    try {
      setLoading(true);
      const manager = getManager();
      if (!manager) return;
      const data = await manager.getPlaylists('audio');
      setPlaylists(data);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylistTracks = async (playlist: Playlist) => {
    if (!serverConnection || !currentToken) return;
    
    try {
      setTracksLoading(true);
      setSelectedPlaylist(playlist);
      setSelectedTracks(new Set());
      
      const client = createPlexClient({
        baseURL: serverConnection.uri,
        token: currentToken,
      });
      
      const response = await client.get(`${playlist.key}`);
      const items = response.MediaContainer?.Metadata || [];
      
      const tracks: PlaylistTrack[] = items.map((item: any) => {
        const media = item.Media?.[0];
        const part = media?.Part?.[0];
        
        return {
          ratingKey: item.ratingKey,
          playlistItemID: item.playlistItemID?.toString(),
          title: item.title,
          artist: item.grandparentTitle || item.originalTitle,
          album: item.parentTitle,
          albumArt: item.parentThumb ? `${serverConnection.uri}${item.parentThumb}?X-Plex-Token=${currentToken}` : null,
          duration: item.duration,
          streamUrl: part ? `${serverConnection.uri}${part.key}?download=1&X-Plex-Token=${currentToken}` : '',
        };
      }).filter((t: PlaylistTrack) => t.streamUrl);
      
      setPlaylistTracks(tracks);
    } catch (error) {
      console.error('Failed to load playlist tracks:', error);
    } finally {
      setTracksLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (playlistTracks.length > 0) {
      playQueue(playlistTracks, 0);
    }
  };

  const handlePlayTrack = (index: number) => {
    if (playlistTracks.length > 0) {
      playQueue(playlistTracks, index);
    }
  };

  // Track reordering with drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null || dragOverIndex === null || !selectedPlaylist) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    if (draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const manager = getManager();
    if (!manager) return;

    try {
      setSaving(true);
      const newTracks = [...playlistTracks];
      const movedTrack = newTracks[draggedIndex];
      if (!movedTrack) return;
      
      newTracks.splice(draggedIndex, 1);
      newTracks.splice(dragOverIndex, 0, movedTrack);
      setPlaylistTracks(newTracks);

      // Save to Plex
      const movedItemID = movedTrack.playlistItemID;
      const afterItemID = dragOverIndex > 0 ? newTracks[dragOverIndex - 1]?.playlistItemID : '';
      
      if (movedItemID) {
        await manager.moveInPlaylist(selectedPlaylist.ratingKey, movedItemID, afterItemID || '');
      }
    } catch (error) {
      console.error('Failed to reorder tracks:', error);
      // Reload tracks to restore original order
      await loadPlaylistTracks(selectedPlaylist);
    } finally {
      setSaving(false);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  };

  // Move track up/down
  const handleMoveTrack = async (index: number, direction: 'up' | 'down') => {
    if (!selectedPlaylist) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= playlistTracks.length) return;

    const manager = getManager();
    if (!manager) return;

    try {
      setSaving(true);
      const newTracks = [...playlistTracks];
      const movedTrack = newTracks[index];
      if (!movedTrack) return;
      
      newTracks.splice(index, 1);
      newTracks.splice(newIndex, 0, movedTrack);
      setPlaylistTracks(newTracks);

      const movedItemID = movedTrack.playlistItemID;
      const afterItemID = newIndex > 0 ? newTracks[newIndex - 1]?.playlistItemID : '';
      
      if (movedItemID) {
        await manager.moveInPlaylist(selectedPlaylist.ratingKey, movedItemID, afterItemID || '');
      }
    } catch (error) {
      console.error('Failed to move track:', error);
      await loadPlaylistTracks(selectedPlaylist);
    } finally {
      setSaving(false);
    }
  };

  // Add tracks to playlist
  const handleAddTracks = async (tracks: LibraryTrack[]) => {
    if (!selectedPlaylist || !selectedServer) return;
    
    const manager = getManager();
    if (!manager) return;

    try {
      setSaving(true);
      const machineId = selectedServer.machineIdentifier;
      const uris = tracks.map(t => 
        `server://${machineId}/com.plexapp.plugins.library/library/metadata/${t.ratingKey}`
      );
      await manager.addToPlaylist(selectedPlaylist.ratingKey, uris);
      
      // Reload tracks
      await loadPlaylistTracks(selectedPlaylist);
      await loadPlaylists();
    } catch (error) {
      console.error('Failed to add tracks:', error);
    } finally {
      setSaving(false);
      setShowAddTracks(false);
    }
  };

  // Remove tracks from playlist
  const handleRemoveTrack = async (playlistItemID: string) => {
    if (!selectedPlaylist) return;
    
    const manager = getManager();
    if (!manager) return;

    try {
      setSaving(true);
      await manager.removeFromPlaylist(selectedPlaylist.ratingKey, playlistItemID);
      setPlaylistTracks(prev => prev.filter(t => t.playlistItemID !== playlistItemID));
      await loadPlaylists();
    } catch (error) {
      console.error('Failed to remove track:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSelectedTracks = async () => {
    if (selectedTracks.size === 0 || !selectedPlaylist) return;
    
    const manager = getManager();
    if (!manager) return;

    if (!confirm(`Remove ${selectedTracks.size} selected tracks from playlist?`)) return;

    try {
      setSaving(true);
      const tracksToRemove = playlistTracks.filter(t => selectedTracks.has(t.ratingKey));
      
      for (const track of tracksToRemove) {
        if (track.playlistItemID) {
          await manager.removeFromPlaylist(selectedPlaylist.ratingKey, track.playlistItemID);
        }
      }
      
      setSelectedTracks(new Set());
      await loadPlaylistTracks(selectedPlaylist);
      await loadPlaylists();
    } catch (error) {
      console.error('Failed to remove tracks:', error);
    } finally {
      setSaving(false);
    }
  };

  // Toggle track selection
  const toggleTrackSelection = (ratingKey: string) => {
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

  // Upload cover art
  const handleUploadCover = async (imageData: Blob) => {
    if (!selectedPlaylist) return;
    
    const manager = getManager();
    if (!manager) return;

    try {
      setSaving(true);
      await manager.uploadCoverArt(selectedPlaylist.ratingKey, imageData);
      
      // Reload playlist to show new cover
      await loadPlaylists();
      await loadPlaylistTracks(selectedPlaylist);
    } catch (error) {
      console.error('Failed to upload cover:', error);
    } finally {
      setSaving(false);
      setShowCoverArt(false);
    }
  };

  // Import playlist
  const handleImportPlaylist = async (name: string, tracks: LibraryTrack[]) => {
    if (!serverConnection || !selectedServer) return;
    
    const manager = getManager();
    if (!manager || tracks.length === 0) return;

    try {
      setSaving(true);
      const machineId = selectedServer.machineIdentifier;
      
      // Create new playlist with first track
      const firstTrack = tracks[0];
      if (!firstTrack) return;
      const firstTrackUri = `server://${machineId}/com.plexapp.plugins.library/library/metadata/${firstTrack.ratingKey}`;
      const newPlaylist = await manager.createPlaylist(name, 'audio', firstTrackUri);
      
      // Add remaining tracks
      if (tracks.length > 1) {
        const remainingUris = tracks.slice(1).map(t => 
          `server://${machineId}/com.plexapp.plugins.library/library/metadata/${t.ratingKey}`
        );
        await manager.addToPlaylist(newPlaylist.ratingKey, remainingUris);
      }
      
      await loadPlaylists();
      await loadPlaylistTracks(newPlaylist);
    } catch (error) {
      console.error('Failed to import playlist:', error);
    } finally {
      setSaving(false);
      setShowImport(false);
    }
  };

  const formatDuration = (ms: number): string => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = playlistTracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const formatTotalDuration = (ms: number): string => {
    if (!ms) return '0 min';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex min-h-0">
      {/* Playlists list */}
      <div className="w-96 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Playlists</h1>
            <button
              onClick={() => setShowImport(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Import Playlist"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          {playlists.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">No playlists found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Create playlists in Plex to see them here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {playlists.map((playlist) => {
                const playlistImageUrl = playlist.composite 
                  ? `${serverConnection?.uri}${playlist.composite}?X-Plex-Token=${currentToken}` 
                  : null;
                
                return (
                  <button
                    key={playlist.ratingKey}
                    onClick={() => loadPlaylistTracks(playlist)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedPlaylist?.ratingKey === playlist.ratingKey
                        ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {playlistImageUrl ? (
                        <img 
                          src={playlistImageUrl} 
                          alt={playlist.title}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{playlist.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {playlist.leafCount} {playlist.leafCount === 1 ? 'track' : 'tracks'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Playlist tracks */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {selectedPlaylist ? (
          <>
            {/* Header with cover art - Fixed */}
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center gap-6 mb-6">
                <button
                  onClick={() => setShowCoverArt(true)}
                  className="relative group flex-shrink-0"
                  title="Change cover art"
                >
                  {selectedPlaylist.composite ? (
                    <img 
                      src={`${serverConnection?.uri}${selectedPlaylist.composite}?X-Plex-Token=${currentToken}`}
                      alt={selectedPlaylist.title}
                      className="w-40 h-40 rounded-xl object-cover shadow-lg"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </button>
                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{selectedPlaylist.title}</h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    {playlistTracks.length} {playlistTracks.length === 1 ? 'track' : 'tracks'} • {formatTotalDuration(totalDuration)}
                    {selectedPlaylist.summary && ` • ${selectedPlaylist.summary}`}
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={handlePlayAll}
                      disabled={tracksLoading || playlistTracks.length === 0}
                      className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-full font-medium flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play All
                    </button>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-end mb-4 gap-4">
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {saving && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Saving...</span>
                  )}
                  <button
                    onClick={() => { setMatchTrackTarget(null); setShowTrackMatch(true); }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    title="Find better matches for tracks"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Match
                  </button>
                  <button
                    onClick={() => setShowAddTracks(true)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Tracks
                  </button>
                  {selectedTracks.size > 0 && (
                    <button
                      onClick={handleRemoveSelectedTracks}
                      className="px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove ({selectedTracks.size})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Track list - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-0">
              {tracksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : playlistTracks.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No tracks in this playlist
                </p>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <th className="w-10 px-3 py-3"></th>
                        <th className="w-12 px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Artist</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Album</th>
                        <th className="w-20 px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                        <th className="w-24 px-3 py-3"></th>
                      </tr>
                    </thead>
                  <tbody>
                    {playlistTracks.map((track, index) => {
                      const originalIndex = playlistTracks.findIndex(t => t.ratingKey === track.ratingKey);
                      const isSelected = selectedTracks.has(track.ratingKey);
                      const isDragging = draggedIndex === originalIndex;
                      const isDragOver = dragOverIndex === originalIndex;
                      
                      return (
                        <tr
                          key={track.ratingKey}
                          draggable
                          onDragStart={() => handleDragStart(originalIndex)}
                          onDragOver={(e) => handleDragOver(e, originalIndex)}
                          onDragEnd={handleDragEnd}
                          className={`border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer group h-[52px] ${
                            isDragging ? 'opacity-50' : ''
                          } ${isDragOver ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'} ${
                            isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                          }`}
                          onDoubleClick={() => handlePlayTrack(originalIndex)}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTrackSelection(track.ratingKey)}
                              onClick={e => e.stopPropagation()}
                              className="w-4 h-4 rounded border-gray-300 accent-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-2 py-3 text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1 w-[96px] h-[28px]">
                              <button
                                draggable={false}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab flex-shrink-0"
                                title="Drag to reorder"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                                </svg>
                              </button>
                              <span className="group-hover:hidden text-sm w-6 text-center flex-shrink-0">{index + 1}</span>
                              <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handlePlayTrack(originalIndex)}
                                  className="p-1 text-primary-500 hover:text-primary-600"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => { setMatchTrackTarget(track); setShowTrackMatch(true); }}
                                  className="p-1 text-gray-400 hover:text-primary-500"
                                  title="Find better match for this track"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{track.title}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{track.artist || '-'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{track.album || '-'}</td>
                          <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{formatDuration(track.duration || 0)}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-[80px] h-[28px]">
                              <button
                                onClick={() => handleMoveTrack(originalIndex, 'up')}
                                disabled={originalIndex === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                                title="Move up"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleMoveTrack(originalIndex, 'down')}
                                disabled={originalIndex === playlistTracks.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                                title="Move down"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              {track.playlistItemID && (
                                <button
                                  onClick={() => handleRemoveTrack(track.playlistItemID!)}
                                  className="p-1 text-gray-400 hover:text-red-500"
                                  title="Remove from playlist"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p>Select a playlist to view tracks</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddTracksModal
        isOpen={showAddTracks}
        onClose={() => setShowAddTracks(false)}
        onAdd={handleAddTracks}
        existingTrackKeys={new Set(playlistTracks.map(t => t.ratingKey))}
      />
      <CoverArtModal
        isOpen={showCoverArt}
        onClose={() => setShowCoverArt(false)}
        onUpload={handleUploadCover}
        playlistTitle={selectedPlaylist?.title}
        currentCoverUrl={selectedPlaylist?.composite ? `${serverConnection?.uri}${selectedPlaylist.composite}?X-Plex-Token=${currentToken}` : null}
        albumArtUrls={playlistTracks.filter(t => t.albumArt).map(t => t.albumArt!)}
      />
      <ImportPlaylistModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImportPlaylist}
      />
      <TrackMatchModal
        isOpen={showTrackMatch}
        onClose={() => { setShowTrackMatch(false); setMatchTrackTarget(null); }}
        playlistTracks={playlistTracks}
        selectedTrack={matchTrackTarget}
        onReplace={async (originalKey, replacement) => {
          if (!selectedPlaylist || !selectedServer) return;
          const manager = getManager();
          if (!manager) return;

          try {
            setSaving(true);
            
            // Find the original track to get its playlistItemID and position
            const originalIndex = playlistTracks.findIndex(t => t.ratingKey === originalKey);
            const originalTrack = playlistTracks[originalIndex];
            if (!originalTrack?.playlistItemID) {
              console.error('Could not find original track or missing playlistItemID');
              return;
            }

            // Get the track before the original (for repositioning)
            const prevTrack = originalIndex > 0 ? playlistTracks[originalIndex - 1] : null;

            // Remove the original track
            await manager.removeFromPlaylist(selectedPlaylist.ratingKey, originalTrack.playlistItemID);

            // Add the replacement track (goes to end of playlist)
            const machineId = selectedServer.machineIdentifier;
            const replacementUri = `server://${machineId}/com.plexapp.plugins.library/library/metadata/${replacement.ratingKey}`;
            await manager.addToPlaylist(selectedPlaylist.ratingKey, [replacementUri]);

            // Reload tracks to get updated list with new playlistItemIDs
            await loadPlaylistTracks(selectedPlaylist);
            
            // Move the new track to the correct position if it wasn't the last track
            if (originalIndex < playlistTracks.length - 1) {
              // Get the fresh track list after reload
              const freshManager = getManager();
              if (freshManager) {
                const updatedTracks = await freshManager.getPlaylistItems(selectedPlaylist.ratingKey);
                // Find the newly added track (last in the list)
                const newTrack = updatedTracks[updatedTracks.length - 1];
                const newItemId = newTrack?.['playlistItemID'] as string | undefined;
                if (newItemId) {
                  if (prevTrack) {
                    // Move after the previous track (but need fresh playlistItemID for prevTrack)
                    const freshPrevTrack = updatedTracks.find(t => t.ratingKey === prevTrack.ratingKey);
                    const freshPrevItemId = freshPrevTrack?.['playlistItemID'] as string | undefined;
                    if (freshPrevItemId) {
                      await manager.moveInPlaylist(selectedPlaylist.ratingKey, newItemId, freshPrevItemId);
                    }
                  } else {
                    // Original was first track - move new track to beginning
                    await manager.moveInPlaylist(selectedPlaylist.ratingKey, newItemId, '');
                  }
                  // Reload again to reflect the move
                  await loadPlaylistTracks(selectedPlaylist);
                }
              }
            }
            
            await loadPlaylists();
            
            console.log('Track replaced successfully:', originalKey, '→', replacement.title, 'at position', originalIndex);
          } catch (error) {
            console.error('Failed to replace track:', error);
          } finally {
            setSaving(false);
          }
        }}
      />
      <MissingTracksPanel
        isOpen={showMissingTracks}
        onClose={() => setShowMissingTracks(false)}
        playlistTracks={playlistTracks}
        playlistName={selectedPlaylist?.title}
      />
    </div>
  );
}
