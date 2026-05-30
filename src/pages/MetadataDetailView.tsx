import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MetadataManager, MetadataUpdate } from '@/managers/MetadataManager';
import { PlexClient } from '@/api/plexClient';
import { queryKeys } from '@/api/queryKeys';
import { CachedDataBadge } from '@/components/offline/CachedDataBadge';
import { CacheManager } from '@/managers/CacheManager';
import { useAppStore } from '@/store/appStore';
import { PageLoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';

interface MetadataDetailViewProps {
  client?: PlexClient;
}

/**
 * Metadata Detail View Page
 * Displays and allows editing of metadata for a single item
 */
export function MetadataDetailView({ client: providedClient }: MetadataDetailViewProps) {
  const { ratingKey } = useParams<{ ratingKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<MetadataUpdate>({});
  const [isCached, setIsCached] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { isOnline, serverConnection, currentToken } = useAppStore();

  // Create client from store if not provided
  const client = providedClient || new PlexClient({
    baseURL: serverConnection?.uri || '',
    token: currentToken || '',
  });

  const manager = new MetadataManager(client);
  const cacheManager = new CacheManager(client);

  // Check if data is cached
  useEffect(() => {
    if (ratingKey) {
      cacheManager.isCacheAvailable(ratingKey).then((available) => {
        setIsCached(available);
        
        // Check if it has offline changes
        if (available) {
          cacheManager.getCachedMetadata(ratingKey).then((cachedData) => {
            if (cachedData) {
              // Check the dirty flag from the database
              import('@/db/database').then(({ db }) => {
                db.metadata.get(ratingKey).then((record) => {
                  setIsDirty(record?.dirty || false);
                });
              });
            }
          });
        }
      });
    }
  }, [ratingKey]);

  // Fetch metadata
  const {
    data: metadata,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.metadata(ratingKey!),
    queryFn: () => manager.getMetadata(ratingKey!),
    enabled: !!ratingKey,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (updates: MetadataUpdate) => manager.updateMetadata(ratingKey!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.metadata(ratingKey!) });
      setIsEditing(false);
      setEditedData({});
    },
  });

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: () => manager.refreshMetadata(ratingKey!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.metadata(ratingKey!) });
    },
  });

  const handleEdit = () => {
    if (metadata) {
      setEditedData({
        title: metadata.title,
        originalTitle: metadata.originalTitle,
        summary: metadata.summary,
        tagline: metadata.tagline,
        rating: metadata.rating,
        year: metadata.year,
        studio: metadata.studio,
        contentRating: metadata.contentRating,
        genres: metadata.genres?.map((g) => g.tag),
        directors: metadata.directors?.map((d) => d.tag),
        writers: metadata.writers?.map((w) => w.tag),
        roles: metadata.roles?.map((r) => ({ tag: r.tag, role: r.role, thumb: r.thumb })),
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleSave = () => {
    updateMutation.mutate(editedData);
  };

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return <PageLoadingState message="Loading metadata..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Metadata
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
          <Button onClick={handleBack} variant="primary">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-gray-400 text-5xl mb-4">📭</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Metadata Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The requested metadata could not be found.
          </p>
          <Button onClick={handleBack} variant="primary">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header / Toolbar with Glass Effect */}
      <div className="sticky top-0 z-50 h-16 bg-white/75 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <Button
                variant="icon"
                onClick={handleBack}
                aria-label="Go back"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                }
              />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-text-primary tracking-tight">
                    {metadata.title}
                  </h1>
                  {/* Cached data badge */}
                  <CachedDataBadge
                    isCached={isCached && !isOnline}
                    isDirty={isDirty}
                    size="md"
                    position="inline"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {metadata.type} • {metadata.year}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={handleRefresh}
                    disabled={refreshMutation.isPending}
                  >
                    {refreshMutation.isPending ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleEdit}
                  >
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                    disabled={updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Artwork */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {metadata.thumb ? (
                <img
                  src={metadata.thumb}
                  alt={metadata.title}
                  className="w-full h-auto"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400 text-4xl">🎬</span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.title || ''}
                      onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{metadata.title}</p>
                  )}
                </div>

                {/* Original Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Original Title
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.originalTitle || ''}
                      onChange={(e) =>
                        setEditedData({ ...editedData, originalTitle: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {metadata.originalTitle || '-'}
                    </p>
                  )}
                </div>

                {/* Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Year
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedData.year || ''}
                      onChange={(e) =>
                        setEditedData({ ...editedData, year: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{metadata.year || '-'}</p>
                  )}
                </div>

                {/* Summary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Summary
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editedData.summary || ''}
                      onChange={(e) => setEditedData({ ...editedData, summary: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {metadata.summary || '-'}
                    </p>
                  )}
                </div>

                {/* Tagline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tagline
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.tagline || ''}
                      onChange={(e) => setEditedData({ ...editedData, tagline: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{metadata.tagline || '-'}</p>
                  )}
                </div>

                {/* Studio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Studio
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.studio || ''}
                      onChange={(e) => setEditedData({ ...editedData, studio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{metadata.studio || '-'}</p>
                  )}
                </div>

                {/* Content Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content Rating
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.contentRating || ''}
                      onChange={(e) =>
                        setEditedData({ ...editedData, contentRating: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {metadata.contentRating || '-'}
                    </p>
                  )}
                </div>

                {/* Genres */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Genres
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.genres?.join(', ') || ''}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          genres: e.target.value.split(',').map((g) => g.trim()),
                        })
                      }
                      placeholder="Action, Drama, Thriller"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {metadata.genres && metadata.genres.length > 0 ? (
                        metadata.genres.map((genre, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full text-sm"
                          >
                            {genre.tag}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-900 dark:text-white">-</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rating
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={editedData.rating || ''}
                      onChange={(e) =>
                        setEditedData({ ...editedData, rating: parseFloat(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {metadata.rating ? `${metadata.rating}/10` : '-'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MetadataDetailView;

