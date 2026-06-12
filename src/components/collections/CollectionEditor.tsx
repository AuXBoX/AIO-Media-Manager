import { useState, useEffect } from 'react';
import { Collection, CollectionManager, CollectionItem } from '@/managers/CollectionManager';
import { PlexClient } from '@/api/plexClient';
import { Button } from '@/components/ui/Button';
import { CollectionImageSearch } from './CollectionImageSearch';

interface CollectionEditorProps {
  collection: Collection;
  client: PlexClient;
  serverUrl: string;
  token: string;
  onClose: () => void;
  onSave?: () => void;
}

/**
 * CollectionEditor Component
 * Allows editing collection metadata and managing items with drag-and-drop reordering
 */
export function CollectionEditor({
  collection,
  client,
  serverUrl,
  token,
  onClose,
  onSave,
}: CollectionEditorProps) {
  const [title, setTitle] = useState(collection.title);
  const [summary, setSummary] = useState(collection.summary || '');
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(
    collection.thumb ? `${serverUrl}${collection.thumb}?X-Plex-Token=${token}` : null
  );

  useEffect(() => {
    loadItems();
  }, [collection.ratingKey]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const manager = new CollectionManager(client);
      const collectionItems = await manager.getCollectionItems(collection.ratingKey);
      setItems(collectionItems);
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
      const manager = new CollectionManager(client);
      await manager.updateCollection(collection.ratingKey, {
        title,
        summary,
      });
      onSave?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save collection');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this collection?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const manager = new CollectionManager(client);
      await manager.deleteCollection(collection.ratingKey);
      onSave?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (item: CollectionItem) => {
    try {
      const manager = new CollectionManager(client);
      await manager.removeFromCollection(collection.ratingKey, item.ratingKey);
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
      const manager = new CollectionManager(client);
      const draggedItem = items[draggedIndex];
      if (!draggedItem) return;
      const afterItem = draggedIndex > 0 ? items[draggedIndex - 1] : null;

      if (afterItem) {
        await manager.reorderInCollection(
          collection.ratingKey,
          draggedItem.ratingKey,
          afterItem.ratingKey
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Edit Collection
          </h2>
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

          <div className="space-y-4">
            {/* Poster and Title section */}
            <div className="flex gap-4">
              {/* Poster */}
              <div className="flex-shrink-0">
                <div className="w-32 h-48 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative group">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={collection.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowImageSearch(true)}
                  className="mt-2 w-full text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                >
                  Search Artwork
                </button>
              </div>

              {/* Title and Summary */}
              <div className="flex-1 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Collection title"
                  />
                </div>

                {/* Summary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Summary
                  </label>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Collection description"
                  />
                </div>
              </div>
            </div>

            {/* Items count */}
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Items</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {collection.childCount}
                </span>
              </div>
            </div>

            {/* Items list with drag-and-drop */}
            {items.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Items ({items.length})
                </h3>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.ratingKey}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-move ${
                        draggedIndex === index ? 'opacity-50' : ''
                      }`}
                    >
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
                      {item.thumb && (
                        <img
                          src={`${serverUrl}${item.thumb}?X-Plex-Token=${token}`}
                          alt={item.title}
                          className="w-10 h-14 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.title}
                        </p>
                        {item.year && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.year}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2"
                        title="Remove from collection"
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleDelete}
            disabled={saving}
            className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-50"
          >
            Delete Collection
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

      {/* Image Search Modal */}
      {showImageSearch && (
        <CollectionImageSearch
          collection={collection}
          serverUrl={serverUrl}
          token={token}
          onClose={() => setShowImageSearch(false)}
          onImageUpdated={() => {
            setShowImageSearch(false);
            // Refresh poster URL
            setPosterUrl(`${serverUrl}${collection.thumb}?X-Plex-Token=${token}&t=${Date.now()}`);
            onSave?.();
          }}
        />
      )}
    </div>
  );
}
