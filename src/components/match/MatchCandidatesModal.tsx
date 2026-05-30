import { useState } from 'react';
import { MatchCandidate } from '@/managers/MetadataManager';
import { MatchCandidateCard } from './MatchCandidateCard';
import { Modal, ModalButton } from '@/components/ui/Modal';

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
 * Updated with modern Plex Pro design system
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

  // Find best match (highest score)
  const bestMatch = candidates.length > 0 
    ? candidates.reduce((best, current) => current.score > (best?.score ?? -Infinity) ? current : best, candidates[0])
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Match Candidates"
      subtitle={currentTitle}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Success Messages */}
        {matchSuccess && (
          <div className="p-4 bg-success-50 border border-success-200 rounded-xl">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-success-500 mr-3"
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
              <p className="text-sm font-medium text-success-800">
                Match applied successfully!
              </p>
            </div>
          </div>
        )}

        {unmatchSuccess && (
          <div className="p-4 bg-success-50 border border-success-200 rounded-xl">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-success-500 mr-3"
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
              <p className="text-sm font-medium text-success-800">
                Item unmatched successfully!
              </p>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {(error || operationError) && (
          <div className="p-4 bg-error-50 border border-error-200 rounded-xl">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-error-500 mr-3 mt-0.5"
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
                <p className="text-sm font-medium text-error-800">Error</p>
                <p className="text-sm text-error-700 mt-1">
                  {error || operationError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-text-secondary">Loading match candidates...</p>
          </div>
        )}

        {/* No Candidates */}
        {!isLoading && candidates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-text-tertiary text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No Match Candidates Found
            </h3>
            <p className="text-text-secondary mb-6">
              Plex couldn't find any potential matches for this item
            </p>
            <ModalButton
              variant="primary"
              onClick={handleUnmatch}
              disabled={isUnmatching}
            >
              {isUnmatching ? 'Unmatching...' : 'Unmatch Item'}
            </ModalButton>
          </div>
        )}

        {/* Candidates List */}
        {!isLoading && candidates.length > 0 && (
          <>
            <div>
              <h3 className="text-sm font-medium text-text-primary">
                {candidates.length} {candidates.length === 1 ? 'candidate' : 'candidates'} found
              </h3>
              <p className="text-xs text-text-tertiary mt-1">
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
            <div className="pt-4 border-t border-border">
              <ModalButton
                variant="primary"
                onClick={handleUnmatch}
                disabled={isUnmatching}
                className="w-full"
              >
                {isUnmatching ? 'Unmatching...' : 'Unmatch Item'}
              </ModalButton>
              <p className="text-xs text-text-tertiary text-center mt-2">
                This will reset the item to an unmatched state
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default MatchCandidatesModal;
