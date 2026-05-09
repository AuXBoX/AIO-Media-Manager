import React, { useState } from 'react';
import { LocalChangeDetection } from '../../managers/LocalMetadataManager';

export interface LocalChangeConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: LocalChangeDetection;
  itemTitle: string;
  onResolve: (resolution: 'plex' | 'local' | 'manual', manualValues?: Record<string, any>) => void;
}

/**
 * LocalChangeConflictModal Component
 * 
 * Displays conflicts between Plex and local metadata with side-by-side comparison.
 * Allows user to choose resolution strategy:
 * - Keep Plex values
 * - Keep Local values
 * - Manual selection per field
 */
export const LocalChangeConflictModal: React.FC<LocalChangeConflictModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  itemTitle,
  onResolve,
}) => {
  const [resolution, setResolution] = useState<'plex' | 'local' | 'manual'>('plex');
  const [manualSelections, setManualSelections] = useState<Record<string, 'plex' | 'local'>>({});

  if (!isOpen) return null;

  const handleResolve = () => {
    if (resolution === 'manual') {
      // Build manual values object based on selections
      const manualValues: Record<string, any> = {};
      conflicts.conflicts.forEach((conflict) => {
        const selection = manualSelections[conflict.field] || 'plex';
        manualValues[conflict.field] =
          selection === 'plex' ? conflict.plexValue : conflict.localValue;
      });
      onResolve('manual', manualValues);
    } else {
      onResolve(resolution);
    }
    onClose();
  };

  const toggleManualSelection = (field: string, value: 'plex' | 'local') => {
    setManualSelections((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const formatFieldName = (field: string): string => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Metadata Conflict Detected
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {itemTitle}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Conflict Info */}
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Local metadata files have been modified more recently than Plex metadata.
              {conflicts.nfoExists && (
                <span className="block mt-1">
                  NFO file last modified:{' '}
                  {conflicts.nfoModifiedAt
                    ? new Date(conflicts.nfoModifiedAt).toLocaleString()
                    : 'Unknown'}
                </span>
              )}
              <span className="block mt-1">
                Plex last updated:{' '}
                {new Date(conflicts.plexModifiedAt).toLocaleString()}
              </span>
            </p>
          </div>

          {/* Resolution Strategy */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resolution Strategy
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="resolution"
                  value="plex"
                  checked={resolution === 'plex'}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-gray-900 dark:text-gray-100">
                  Keep Plex values (overwrite local files)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="resolution"
                  value="local"
                  checked={resolution === 'local'}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-gray-900 dark:text-gray-100">
                  Keep local values (update Plex)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="resolution"
                  value="manual"
                  checked={resolution === 'manual'}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-gray-900 dark:text-gray-100">
                  Manual selection (choose per field)
                </span>
              </label>
            </div>
          </div>

          {/* Conflicts Table */}
          {conflicts.conflicts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Conflicting Fields ({conflicts.conflicts.length})
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Field
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Plex Value
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Local Value
                      </th>
                      {resolution === 'manual' && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Use
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {conflicts.conflicts.map((conflict, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {formatFieldName(conflict.field)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          <div className="max-w-xs truncate" title={formatValue(conflict.plexValue)}>
                            {formatValue(conflict.plexValue)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          <div className="max-w-xs truncate" title={formatValue(conflict.localValue)}>
                            {formatValue(conflict.localValue)}
                          </div>
                        </td>
                        {resolution === 'manual' && (
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => toggleManualSelection(conflict.field, 'plex')}
                                className={`px-2 py-1 rounded text-xs ${
                                  (manualSelections[conflict.field] || 'plex') === 'plex'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                Plex
                              </button>
                              <button
                                onClick={() => toggleManualSelection(conflict.field, 'local')}
                                className={`px-2 py-1 rounded text-xs ${
                                  manualSelections[conflict.field] === 'local'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                Local
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {conflicts.conflicts.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No field conflicts detected. Timestamps differ but values are the same.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Resolve Conflicts
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocalChangeConflictModal;
