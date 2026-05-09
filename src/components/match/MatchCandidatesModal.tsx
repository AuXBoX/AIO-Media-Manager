import { useState } from 'react';
import { MatchCandidate } from '@/managers/MetadataManager';
import { MatchCandidateCard } from './MatchCandidateCard';

interface MatchCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle?: string;
  candidates: MatchCandidate[];
  isLoading: boolean;
  onMatch: (guid: string) => Promise<void>;
  onUnmatch: () => Promise<void>;
  error?: string | null;
}

/**
 * Match Candidates Modal
 * 
 * Main modal for viewing and selecting metadata match candidates from Plex's matching system
 */
export function MatchCandidatesModal({
  isOpen,
  onClose,
  currentTitle,
  candidates,
  isLoading,
  onMatch,
  onUnmatch,
  error,
}: MatchCandidatesModalProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<MatchCandidate | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isUnmatching, setIsUnmatching] = useState(false);
  const [matchSuccess, setMatchSuccess] = useState(false);
  const [unmatchSuccess, setUnmatchSuccess] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  const handleMatch = async (candidate: MatchCandidate) => {
    setIsMatching(true);
    setOperationError(null);
    setMatchSuccess(false);

    try {
      await onMatch(candidate.guid);
      setMatchSuccess(true);
      setSelectedCandidate(candidate);
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Match failed');
    } finally {
      setIsMatching(false);
    }
  };

  const handleUnmatch = async () => {
    setIsUnmatching(true);
    setOperationError(null);
    setUnmatchSuccess(false);

    try {
      await onUnmatch();
      setUnmatchSuccess(true);
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Unmatch failed');
    } finally {
      setIsUnmatching(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setSelectedCandidate(null);
    setMatchSuccess(false);
    setUnmatchSuccess(false);
    setOperationError(null);
    onClose();
  };

  if (!isOpen) return null;

  // Find best match (highest score)
  const bestMatch = candidates.length > 0 
    ? candidates.reduce((best, current) => current.score > (best?.score ?? -Infinity) ? current : best, candidates[0])
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Match Candidates
              </h2>
              {currentTitle && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {currentTitle}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Success Messages */}
            {matchSuccess && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-green-400 mr-3"
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
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Match applied successfully!
                  </p>
                </div>
              </div>
            )}

            {unmatchSuccess && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-green-400 mr-3"
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
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Item unmatched successfully!
                  </p>
                </div>
              </div>
            )}

            {/* Error Messages */}
            {(error || operationError) && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-400 mr-3 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {error || operationError}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading match candidates...</p>
              </div>
            )}

            {/* No Candidates */}
            {!isLoading && candidates.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Match Candidates Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Plex couldn't find any potential matches for this item
                </p>
                <button
                  onClick={handleUnmatch}
                  disabled={isUnmatching}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUnmatching ? 'Unmatching...' : 'Unmatch Item'}
                </button>
              </div>
            )}

            {/* Candidates List */}
            {!isLoading && candidates.length > 0 && (
              <>
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {candidates.length} {candidates.length === 1 ? 'candidate' : 'candidates'} found
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Select a match to update the item's metadata
                  </p>
                </div>

                <div className="space-y-3">
                  {candidates.map((candidate) => (
                    <MatchCandidateCard
                      key={candidate.guid}
                      candidate={candidate}
                      isBestMatch={bestMatch?.guid === candidate.guid}
                      onSelect={() => handleMatch(candidate)}
                      isSelecting={isMatching && selectedCandidate?.guid === candidate.guid}
                    />
                  ))}
                </div>

                {/* Unmatch Button */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleUnmatch}
                    disabled={isUnmatching}
                    className="w-full px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUnmatching ? 'Unmatching...' : 'Unmatch Item'}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-2">
                    This will reset the item to an unmatched state
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MatchCandidatesModal;
