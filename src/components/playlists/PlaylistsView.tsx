import { useState, useEffect } from 'react';
import { Playlist, PlaylistManager } from '@/managers/PlaylistManager';
import { PlexClient } from '@/api/plexClient';

interface PlaylistsViewProps {
  type: 'audio' | 'video';
  client: PlexClient;
  serverUrl: string;
  token: string;
  onPlaylistClick?: (playlist: Playlist) => void;
  onCreatePlaylist?: () => void;
}

/**
 * PlaylistsView Component
 * Displays all playlists of a specific type
 */
export function PlaylistsView({
  type,
  client,
  serverUrl,
  token,
  onPlaylistClick,
  onCreatePlaylist,
}: PlaylistsViewProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, [type]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);
      const manager = new PlaylistManager(client);
      const data = await manager.getPlaylists(type);
      setPlaylists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={loadPlaylists}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <svg
          className="h-16 w-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          No {type} playlists yet
        </p>
        {onCreatePlaylist && (
          <button
            onClick={onCreatePlaylist}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Playlist
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {type === 'audio' ? 'Music' : 'Video'} Playlists
        </h2>
        {onCreatePlaylist && (
          <button
            onClick={onCreatePlaylist}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Playlist
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {playlists.map((playlist) => (
          <div
            key={playlist.ratingKey}
            className="group cursor-pointer"
            onClick={() => onPlaylistClick?.(playlist)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPlaylistClick?.(playlist);
              }
            }}
          >
            <div className="relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
              {playlist.composite ? (
                <img
                  src={`${serverUrl}${playlist.composite}?X-Plex-Token=${token}`}
                  alt={playlist.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    className="h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
              )}
              {playlist.smart && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  Smart
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <span className="text-white text-xs font-medium">
                  {playlist.leafCount} {playlist.leafCount === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {playlist.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {playlist.duration > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDuration(playlist.duration)}
                  </span>
                )}
              </div>
              {playlist.summary && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                  {playlist.summary}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
