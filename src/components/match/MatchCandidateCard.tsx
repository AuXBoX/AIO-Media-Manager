import { MatchCandidate } from '@/managers/MetadataManager';

interface MatchCandidateCardProps {
  candidate: MatchCandidate;
  isBestMatch: boolean;
  onSelect: () => void;
  isSelecting: boolean;
}

/**
 * Match Candidate Card Component
 * 
 * Displays an individual match candidate with confidence score and metadata preview
 */
export function MatchCandidateCard({
  candidate,
  isBestMatch,
  onSelect,
  isSelecting,
}: MatchCandidateCardProps) {
  // Calculate confidence percentage (Plex scores are typically 0-100)
  const confidencePercent = Math.min(Math.max(candidate.score, 0), 100);
  
  // Determine confidence level for color coding
  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  return (
    <div
      className={`relative flex items-start space-x-4 p-4 rounded-lg border-2 transition-all ${
        isBestMatch
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
      }`}
    >
      {/* Best Match Badge */}
      {isBestMatch && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-primary-500 text-white">
            ⭐ Best Match
          </span>
        </div>
      )}

      {/* Thumbnail */}
      <div className="flex-shrink-0">
        {candidate.thumb ? (
          <img
            src={candidate.thumb}
            alt={candidate.title}
            className="w-20 h-28 object-cover rounded shadow-sm"
          />
        ) : (
          <div className="w-20 h-28 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 text-3xl">🎬</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-16">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {candidate.title}
            </h4>
            {candidate.year && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {candidate.year}
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        {candidate.summary && (
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
            {candidate.summary}
          </p>
        )}

        {/* Confidence Score */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Confidence
              </span>
              <span className={`text-xs font-bold ${getConfidenceColor(confidencePercent)}`}>
                {confidencePercent.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  confidencePercent >= 90
                    ? 'bg-green-500'
                    : confidencePercent >= 70
                    ? 'bg-yellow-500'
                    : 'bg-orange-500'
                }`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Select Button */}
        <button
          onClick={onSelect}
          disabled={isSelecting}
          className={`w-full px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isBestMatch
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500'
          }`}
        >
          {isSelecting ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Applying...
            </span>
          ) : (
            'Select This Match'
          )}
        </button>

        {/* GUID Info */}
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 truncate" title={candidate.guid}>
          ID: {candidate.guid}
        </p>
      </div>
    </div>
  );
}
