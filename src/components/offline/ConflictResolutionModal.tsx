import { useState } from 'react';
import type { ConflictResolution } from '@/managers/CacheManager';
import type { MetadataItem } from '@/managers/MetadataManager';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictResolution[];
  onResolve: (resolutions: Map<string, 'local' | 'server'>) => Promise<void>;
}

/**
 * Get human-readable field name
 */
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    title: 'Title',
    originalTitle: 'Original Title',
    summary: 'Summary',
    tagline: 'Tagline',
    rating: 'Rating',
    year: 'Year',
    studio: 'Studio',
    contentRating: 'Content Rating',
    duration: 'Duration',
    genres: 'Genres',
    roles: 'Cast',
    directors: 'Directors',
    writers: 'Writers',
  };
  return labels[field] || field;
}

/**
 * Format field value for display
 */
function formatFieldValue(value: any): string {
  if (value === null || value === undefined) {
    return '(empty)';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty)';
    // Handle tag arrays
    if (value[0]?.tag) {
      return value.map((item) => item.tag).join(', ');
    }
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Extract conflicting fields from local and server versions
 */
function getConflictingFields(
  localChange: any,
  serverValue: any
): Array<{ field: string; localValue: any; serverValue: any }> {
  const conflicts: Array<{ field: string; localValue: any; serverValue: any }> = [];
  const allFields = new Set([
    ...Object.keys(localChange || {}),
    ...Object.keys(serverValue || {}),
  ]);

  for (const field of allFields) {
    const localVal = localChange?.[field];
    const serverVal = serverValue?.[field];

    // Skip if values are the same
    if (JSON.stringify(localVal) === JSON.stringify(serverVal)) {
      continue;
    }

    conflicts.push({
      field,
      localValue: localVal,
      serverValue: serverVal,
    });
  }

  return conflicts;
}

/**
 * Get item title from metadata
 */
function getItemTitle(conflict: ConflictResolution): string {
  const local = conflict.localChange as Partial<MetadataItem>;
  const server = conflict.serverValue as Partial<MetadataItem>;
  return local?.title || server?.title || `Item ${conflict.ratingKey}`;
}

/**
 * ConflictResolutionModal Component
 * 
 * Displays sync conflicts and allows user to choose resolution strategy
 * Supports per-item resolution or bulk resolution with field-level comparison
 */
export function ConflictResolutionModal({
  isOpen,
  onClose,
  conflicts,
  onResolve,
}: ConflictResolutionModalProps) {
  const [resolutions, setResolutions] = useState<Map<string, 'local' | 'server'>>(
    new Map()
  );
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);

  if (!isOpen) return null;

  const currentConflict = conflicts[currentConflictIndex];
  const hasNext = currentConflictIndex < conflicts.length - 1;
  const hasPrevious = currentConflictIndex > 0;
  const conflictingFields = currentConflict
    ? getConflictingFields(currentConflict.localChange, currentConflict.serverValue)
    : [];

  const handleResolutionChange = (ratingKey: string, resolution: 'local' | 'server') => {
    const newResolutions = new Map(resolutions);
    newResolutions.set(ratingKey, resolution);
    setResolutions(newResolutions);
  };

  const handleBulkResolve = (resolution: 'local' | 'server') => {
    const newResolutions = new Map<string, 'local' | 'server'>();
    conflicts.forEach((conflict) => {
      newResolutions.set(conflict.ratingKey, resolution);
    });
    setResolutions(newResolutions);
  };

  const handleNext = () => {
    if (hasNext) {
      setCurrentConflictIndex(currentConflictIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (hasPrevious) {
      setCurrentConflictIndex(currentConflictIndex - 1);
    }
  };

  const handleResolve = async () => {
    // Ensure all conflicts have resolutions
    const unresolvedConflicts = conflicts.filter(
      (conflict) => !resolutions.has(conflict.ratingKey)
    );

    if (unresolvedConflicts.length > 0) {
      setError('Please resolve all conflicts before continuing');
      return;
    }

    setIsResolving(true);
    setError(null);

    try {
      await onResolve(resolutions);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflicts');
    } finally {
      setIsResolving(false);
    }
  };

  const handleClose = () => {
    if (!isResolving) {
      setResolutions(new Map());
      setError(null);
      setCurrentConflictIndex(0);
      onClose();
    }
  };

  const resolvedCount = resolutions.size;
  const totalCount = conflicts.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Resolve Sync Conflicts
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {conflicts.length} {conflicts.length === 1 ? 'item has' : 'items have'}{' '}
              conflicting changes • {resolvedCount} of {totalCount} resolved
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isResolving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Apply to all conflicts:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkResolve('local')}
                disabled={isResolving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Keep All Local Changes
              </button>
              <button
                onClick={() => handleBulkResolve('server')}
                disabled={isResolving}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Use All Server Versions
              </button>
            </div>
          </div>
        </div>

        {/* Current Conflict */}
        {currentConflict && (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Navigation */}
            {conflicts.length > 1 && (
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevious}
                  disabled={!hasPrevious || isResolving}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Previous
                </button>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {currentConflictIndex + 1} of {conflicts.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={!hasNext || isResolving}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Item Title */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getItemTitle(currentConflict)}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Rating Key: {currentConflict.ratingKey}
              </p>
            </div>

            {/* Conflicting Fields */}
            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
                Conflicting Fields ({conflictingFields.length})
              </h4>
              {conflictingFields.map(({ field, localValue, serverValue }) => (
                <div
                  key={field}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getFieldLabel(field)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                    {/* Local Value */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
                      <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase mb-2">
                        Your Changes
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                        {formatFieldValue(localValue)}
                      </div>
                    </div>
                    {/* Server Value */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase mb-2">
                        Server Version
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                        {formatFieldValue(serverValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resolution Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() =>
                  handleResolutionChange(currentConflict.ratingKey, 'local')
                }
                disabled={isResolving}
                className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  resolutions.get(currentConflict.ratingKey) === 'local'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {resolutions.get(currentConflict.ratingKey) === 'local' && (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                Keep My Changes
              </button>
              <button
                onClick={() =>
                  handleResolutionChange(currentConflict.ratingKey, 'server')
                }
                disabled={isResolving}
                className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  resolutions.get(currentConflict.ratingKey) === 'server'
                    ? 'bg-gray-600 text-white shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {resolutions.get(currentConflict.ratingKey) === 'server' && (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                Use Server Version
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {resolvedCount === totalCount ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                ✓ All conflicts resolved
              </span>
            ) : (
              <span>
                {totalCount - resolvedCount} conflict{totalCount - resolvedCount !== 1 ? 's' : ''}{' '}
                remaining
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={isResolving}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={isResolving || resolutions.size !== conflicts.length}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isResolving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isResolving ? 'Resolving...' : 'Apply Resolutions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConflictResolutionModal;
