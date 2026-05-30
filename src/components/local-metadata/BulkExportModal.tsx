import React, { useState } from 'react';
import { BulkExportResult } from '../../managers/LocalMetadataManager';

export interface BulkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: string[];
  itemTitles: Record<string, string>;
  onExport: (format: 'nfo' | 'embedded' | 'both') => Promise<BulkExportResult>;
}

/**
 * BulkExportModal Component
 * 
 * Provides UI for bulk exporting metadata to local files:
 * - Format selection (NFO/Embedded/Both)
 * - Progress tracking
 * - Success/failure reporting
 */
export const BulkExportModal: React.FC<BulkExportModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  itemTitles,
  onExport,
}) => {
  const [format, setFormat] = useState<'nfo' | 'embedded' | 'both'>('nfo');
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<BulkExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal is closed
  React.useEffect(() => {
    if (!isOpen) {
      setFormat('nfo');
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);
      setResult(null);

      const exportResult = await onExport(format);
      setResult(exportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleClose = () => {
    if (!exporting) {
      setResult(null);
      setError(null);
      onClose();
    }
  };

  const getFormatDescription = (fmt: 'nfo' | 'embedded' | 'both'): string => {
    switch (fmt) {
      case 'nfo':
        return 'Export metadata to NFO files (Kodi/Emby compatible XML files)';
      case 'embedded':
        return 'Write metadata tags directly into media files (ID3/MP4 tags)';
      case 'both':
        return 'Export to both NFO files and embedded tags';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bulk Export to Local Files
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Export metadata for {selectedItems.length} selected item{selectedItems.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Format Selection */}
          {!result && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Export Format
              </label>
              <div className="space-y-3">
                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  format === 'nfo'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }">
                  <input
                    type="radio"
                    name="format"
                    value="nfo"
                    checked={format === 'nfo'}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="mt-1 mr-3"
                    disabled={exporting}
                  />
                  <div className="flex-1">
                    <span className="block font-medium text-gray-900 dark:text-gray-100">
                      NFO Files
                    </span>
                    <span className="block text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {getFormatDescription('nfo')}
                    </span>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  format === 'embedded'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }">
                  <input
                    type="radio"
                    name="format"
                    value="embedded"
                    checked={format === 'embedded'}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="mt-1 mr-3"
                    disabled={exporting}
                  />
                  <div className="flex-1">
                    <span className="block font-medium text-gray-900 dark:text-gray-100">
                      Embedded Tags
                    </span>
                    <span className="block text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {getFormatDescription('embedded')}
                    </span>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  format === 'both'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }">
                  <input
                    type="radio"
                    name="format"
                    value="both"
                    checked={format === 'both'}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="mt-1 mr-3"
                    disabled={exporting}
                  />
                  <div className="flex-1">
                    <span className="block font-medium text-gray-900 dark:text-gray-100">
                      Both NFO and Embedded
                    </span>
                    <span className="block text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {getFormatDescription('both')}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Selected Items Preview */}
          {!result && selectedItems.length <= 10 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selected Items
              </label>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <ul className="space-y-1">
                  {selectedItems.map((ratingKey) => (
                    <li key={ratingKey} className="text-sm text-gray-700 dark:text-gray-300">
                      • {itemTitles[ratingKey] || `Item ${ratingKey}`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Export Progress */}
          {exporting && (
            <div className="mb-6">
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    Exporting metadata...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    This may take a few moments
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Export Results */}
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{result.total}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-1">Succeeded</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {result.succeeded}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <p className="text-sm text-red-600 dark:text-red-400 mb-1">Failed</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{result.failed}</p>
                </div>
              </div>

              {/* Success Message */}
              {result.succeeded > 0 && result.failed === 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-400 mr-3 mt-0.5"
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
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Export Completed Successfully
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        All {result.succeeded} items were exported to local files.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Partial Success Message */}
              {result.succeeded > 0 && result.failed > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start">
                    <svg
                      className="h-5 w-5 text-yellow-400 mr-3 mt-0.5"
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
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Export Partially Completed
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        {result.succeeded} items exported successfully, {result.failed} items failed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors List */}
              {result.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Errors ({result.errors.length})
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    {result.errors.map((err, index) => (
                      <div
                        key={index}
                        className="text-sm text-gray-700 dark:text-gray-300 border-l-2 border-red-400 pl-3"
                      >
                        <span className="font-medium">
                          {itemTitles[err.ratingKey] || `Item ${err.ratingKey}`}:
                        </span>{' '}
                        {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={exporting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleExport}
              disabled={exporting || selectedItems.length === 0}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
