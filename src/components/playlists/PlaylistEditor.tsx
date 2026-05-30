import { useState, useEffect } from 'react';
import { Playlist, PlaylistManager } from '@/managers/PlaylistManager';
import { MetadataItem } from '@/managers/MetadataManager';
import { PlexClient } from '@/api/plexClient';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

interface PlaylistEditorProps {
  playlist: Playlist;
  client: PlexClient;
  serverUrl: string;
  token: string;
  onClose: () => void;
  onSave?: () => void;
}

/**
 * PlaylistEditor Component
 * Allows editing playlist metadata and managing items
 */
export function PlaylistEditor({
  playlist,
  client,
  serverUrl,
  token,
  onClose,
  onSave,
}: PlaylistEditorProps) {
  const [title, setTitle] = useState(playlist.title);
  const [summary, setSummary] = useState(playlist.summary || '');
  const [items, setItems] = useState<MetadataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadItems();
  }, [playlist.ratingKey]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const manager = new PlaylistManager(client);
      const playlistItems = await manager.getPlaylistItems(playlist.ratingKey);
      setItems(playlistItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const manager = new PlaylistManager(client);
      await manager.updatePlaylist(playlist.ratingKey, {
        title,
        summary,
      });
      onSave?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save playlist');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this playlist?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const manager = new PlaylistManager(client);
      await manager.deletePlaylist(playlist.ratingKey);
      onSave?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete playlist');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (item: MetadataItem) => {
    if (!item['playlistItemID']) {
      setError('Cannot remove item: missing playlist item ID');
      return;
    }

    try {
      const manager = new PlaylistManager(client);
      await manager.removeFromPlaylist(playlist.ratingKey, String(item['playlistItemID']));
      // Reload items
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    if (!draggedItem) return;
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    setItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    try {
      const manager = new PlaylistManager(client);
      const draggedItem = items[draggedIndex];
      if (!draggedItem) return;
      const afterItem = draggedIndex > 0 ? items[draggedIndex - 1] : null;

      if (draggedItem['playlistItemID'] && afterItem?.['playlistItemID']) {
        await manager.moveInPlaylist(
          playlist.ratingKey,
          String(draggedItem['playlistItemID']),
          String(afterItem['playlistItemID'])
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder items');
      // Reload items to restore original order
      await loadItems();
    } finally {
      setDraggedIndex(null);
    }
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Edit Playlist
            </h2>
            {playlist.smart && (
              <span className="inline-block mt-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">
                Smart Playlist
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Metadata */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Playlist title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Playlist description"
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                Items ({items.length})
              </h3>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="lg" variant="primary" />
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No items in this playlist
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item['playlistItemID'] || item.ratingKey}
                      draggable={!playlist.smart}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        !playlist.smart ? 'cursor-move' : ''
                      } ${draggedIndex === index ? 'opacity-50' : ''}`}
                    >
                      {!playlist.smart && (
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8h16M4 16h16"
                          />
                        </svg>
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400 w-8">
                        {index + 1}
                      </span>
                      {item.thumb && (
                        <img
                          src={`${serverUrl}${item.thumb}?X-Plex-Token=${token}`}
                          alt={item.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.title}
                        </p>
                        {(item.parentTitle || item.grandparentTitle) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {item.grandparentTitle || item.parentTitle}
                          </p>
                        )}
                        {item.duration && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDuration(item.duration)}
                          </p>
                        )}
                      </div>
                      {!playlist.smart && (
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2"
                          title="Remove from playlist"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleDelete}
            disabled={saving}
            className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-50"
          >
            Delete Playlist
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              loading={saving}
              variant="primary"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
