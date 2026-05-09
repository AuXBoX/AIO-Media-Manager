import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MetadataManager, MetadataUpdate, BulkOperationResult } from '@/managers/MetadataManager';
import { PlexClient } from '@/api/plexClient';
import { queryKeys } from '@/api/queryKeys';
import { useAppStore } from '@/store/appStore';

interface BulkEditViewProps {
  client?: PlexClient;
}

interface LocationState {
  selectedItems: string[];
  sectionId: string;
}

/**
 * Bulk Edit View Page
 * Allows editing metadata for multiple items at once
 */
export function BulkEditView({ client: providedClient }: BulkEditViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const state = location.state as LocationState;
  const { serverConnection, currentToken } = useAppStore();

  const [updates, setUpdates] = useState<MetadataUpdate>({});
  const [operationResult, setOperationResult] = useState<BulkOperationResult | null>(null);

  // Create client from store if not provided
  const client = providedClient || new PlexClient({
    baseURL: serverConnection?.uri || '',
    token: currentToken || '',
  });

  const manager = new MetadataManager(client);

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (data: { ratingKeys: string[]; updates: MetadataUpdate }) =>
      manager.bulkUpdateMetadata(data.ratingKeys, data.updates),
    onSuccess: (result) => {
      setOperationResult(result);
      // Invalidate library items query to refresh the list
      if (state?.sectionId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.libraryItems(state.sectionId, {}),
        });
      }
    },
  });

  const handleBack = () => {
    navigate(-1);
  };

  const handleApply = () => {
    if (!state?.selectedItems || state.selectedItems.length === 0) {
      return;
    }

    bulkUpdateMutation.mutate({
      ratingKeys: state.selectedItems,
      updates,
    });
  };

  const handleReset = () => {
    setUpdates({});
    setOperationResult(null);
  };

  if (!state?.selectedItems || state.selectedItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-gray-400 text-5xl mb-4">📝</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Items Selected
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please select items from the library view to perform bulk editing.
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Go back"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Edit</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {state.selectedItems.length} items selected
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleReset}
                disabled={bulkUpdateMutation.isPending}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Reset
              </button>
              <button
                onClick={handleApply}
                disabled={bulkUpdateMutation.isPending || Object.keys(updates).length === 0}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {bulkUpdateMutation.isPending ? 'Applying...' : 'Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Operation Result */}
        {operationResult && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              operationResult.failed === 0
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {operationResult.failed === 0 ? (
                  <svg
                    className="h-5 w-5 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3
                  className={`text-sm font-medium ${
                    operationResult.failed === 0
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-yellow-800 dark:text-yellow-200'
                  }`}
                >
                  {operationResult.failed === 0
                    ? 'All items updated successfully'
                    : 'Some items failed to update'}
                </h3>
                <div
                  className={`mt-2 text-sm ${
                    operationResult.failed === 0
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-yellow-700 dark:text-yellow-300'
                  }`}
                >
                  <p>
                    Succeeded: {operationResult.succeeded} / {operationResult.total}
                  </p>
                  {operationResult.failed > 0 && (
                    <p className="mt-1">Failed: {operationResult.failed}</p>
                  )}
                </div>
                {operationResult.errors.length > 0 && (
                  <div className="mt-3">
                    <details className="text-sm">
                      <summary className="cursor-pointer text-yellow-800 dark:text-yellow-200 font-medium">
                        View errors
                      </summary>
                      <ul className="mt-2 space-y-1 text-yellow-700 dark:text-yellow-300">
                        {operationResult.errors.map((error, index) => (
                          <li key={index}>
                            {error.ratingKey}: {error.error}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {bulkUpdateMutation.isPending && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Updating {state.selectedItems.length} items...
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  This may take a few moments
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Edit Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Edit Common Fields
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Only fill in the fields you want to update. Empty fields will not be changed.
          </p>

          <div className="space-y-6">
            {/* Studio */}
            <div>
              <label htmlFor="studio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Studio
              </label>
              <input
                id="studio"
                type="text"
                value={updates.studio || ''}
                onChange={(e) => setUpdates({ ...updates, studio: e.target.value })}
                placeholder="Leave empty to keep existing values"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Content Rating */}
            <div>
              <label htmlFor="contentRating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content Rating
              </label>
              <input
                id="contentRating"
                type="text"
                value={updates.contentRating || ''}
                onChange={(e) => setUpdates({ ...updates, contentRating: e.target.value })}
                placeholder="Leave empty to keep existing values"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Genres */}
            <div>
              <label htmlFor="genres" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Genres
              </label>
              <input
                id="genres"
                type="text"
                value={updates.genres?.join(', ') || ''}
                onChange={(e) =>
                  setUpdates({
                    ...updates,
                    genres: e.target.value.split(',').map((g) => g.trim()).filter(Boolean),
                  })
                }
                placeholder="Action, Drama, Thriller (comma-separated)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Separate multiple genres with commas
              </p>
            </div>

            {/* Year */}
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year
              </label>
              <input
                id="year"
                type="number"
                value={updates.year || ''}
                onChange={(e) =>
                  setUpdates({ ...updates, year: e.target.value ? parseInt(e.target.value) : undefined })
                }
                placeholder="Leave empty to keep existing values"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Rating */}
            <div>
              <label htmlFor="rating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rating (0-10)
              </label>
              <input
                id="rating"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={updates.rating || ''}
                onChange={(e) =>
                  setUpdates({ ...updates, rating: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                placeholder="Leave empty to keep existing values"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulkEditView;

